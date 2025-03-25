/**
 * Admin User Management Routes
 * 
 * This module registers administrator user management routes for the Express server.
 * These routes are protected by admin authentication and handle CRUD operations for admin users.
 */
import { Request, Response, Express, NextFunction } from 'express';
import { verifyAuth, adminDb } from './firebase-admin';
import { AdminRole, AdminRoleType } from '../core/domain/admin/admin-role';
import { AdminUser, AdminUserStatus } from '../core/domain/admin/admin-user';
import { MfaStatus, MfaStatusType } from '../core/domain/admin/mfa-status';
import { Permission } from '../core/domain/admin/permission';

// Extend Request type to include admin data
declare global {
  namespace Express {
    interface Request {
      adminData?: any;
    }
  }
}

// Admin roles middleware - check if user has required role
export const verifyAdminRole = (requiredRole: AdminRoleType) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // First use standard admin auth verification
      await verifyAuth(req, res, async () => {
        // Check if user exists
        const user = req.user;
        if (!user) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        
        // Get the admin from Firestore to check role
        const adminDoc = await adminDb.collection('admin_users').doc(user.uid).get();
        
        if (!adminDoc.exists) {
          return res.status(403).json({ error: 'Forbidden: Admin account not found' });
        }
        
        const adminData = adminDoc.data();
        if (!adminData) {
          return res.status(403).json({ error: 'Forbidden: Invalid admin account data' });
        }
        
        // Create AdminRole from string
        let adminRole: AdminRole;
        try {
          adminRole = AdminRole.fromString(adminData.role);
        } catch (error) {
          console.error('Invalid admin role:', adminData.role);
          return res.status(403).json({ error: 'Forbidden: Invalid admin role' });
        }
        
        // Check if user has required role
        let hasPermission = false;
        
        switch(requiredRole) {
          case AdminRoleType.SUPER_ADMIN:
            hasPermission = adminRole.isSuperAdmin();
            break;
          case AdminRoleType.ADMIN:
            hasPermission = adminRole.isAdmin();
            break;
          case AdminRoleType.MODERATOR:
            hasPermission = adminRole.isModerator();
            break;
          default:
            hasPermission = false;
        }
        
        if (!hasPermission) {
          return res.status(403).json({ 
            error: 'Forbidden: Insufficient privileges',
            required: requiredRole,
            current: adminRole.toString()
          });
        }
        
        // Attach admin data to request
        req.adminData = adminData;
        
        // User is authenticated and has required role
        next();
      });
    } catch (error) {
      console.error('Error in admin role verification:', error);
      res.status(500).json({ error: 'Internal server error during authentication' });
    }
  };
};

/**
 * Register admin user management routes
 */
export function registerAdminUserRoutes(app: Express) {
  /**
   * Get all admin users - Super Admin and Admin only
   */
  app.get('/api/admin/users', verifyAdminRole(AdminRoleType.ADMIN), async (req: Request, res: Response) => {
    try {
      const { limit = 20, offset = 0, status, role } = req.query;
      
      // Start with a base query
      let query = adminDb.collection('admin_users');
      
      // Apply filters if provided
      if (status) {
        query = query.where('status', '==', status);
      }
      
      if (role) {
        query = query.where('role', '==', role);
      }
      
      // Get total count for pagination
      const countSnapshot = await query.count().get();
      const total = countSnapshot.data().count;
      
      // Apply pagination and ordering
      query = query.orderBy('createdAt', 'desc')
                  .limit(Number(limit))
                  .offset(Number(offset));
      
      // Execute query
      const snapshot = await query.get();
      
      // Format response
      const admins = snapshot.docs.map(doc => {
        const data = doc.data();
        // Remove sensitive fields
        delete data.lastLoginAttempts;
        delete data.whitelistedIps;
        return {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.() || null,
          updatedAt: data.updatedAt?.toDate?.() || null,
          lastLoginAt: data.lastLoginAt?.toDate?.() || null
        };
      });
      
      // Return paginated results
      res.json({
        admins,
        pagination: {
          total,
          limit: Number(limit),
          offset: Number(offset),
          hasMore: total > Number(offset) + admins.length
        }
      });
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ error: 'Failed to fetch admin users' });
    }
  });

  /**
   * Get admin user by ID - Super Admin and Admin only
   */
  app.get('/api/admin/users/:id', verifyAdminRole(AdminRoleType.ADMIN), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get admin from Firestore
      const adminDoc = await adminDb.collection('admin_users').doc(id).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      const adminData = adminDoc.data();
      
      // Remove sensitive fields
      if (adminData) {
        delete adminData.lastLoginAttempts;
        delete adminData.whitelistedIps;
      }
      
      // Return admin with formatted dates
      res.json({
        id: adminDoc.id,
        ...adminData,
        createdAt: adminData?.createdAt?.toDate?.() || null,
        updatedAt: adminData?.updatedAt?.toDate?.() || null,
        lastLoginAt: adminData?.lastLoginAt?.toDate?.() || null
      });
    } catch (error) {
      console.error('Error fetching admin user:', error);
      res.status(500).json({ error: 'Failed to fetch admin user' });
    }
  });

  /**
   * Update admin user - Super Admin only for role changes
   */
  app.put('/api/admin/users/:id', verifyAdminRole(AdminRoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { role, status, name, department, position } = req.body;
      
      // Validate input
      if (role && !Object.values(AdminRoleType).includes(role)) {
        return res.status(400).json({ error: `Invalid role: ${role}` });
      }
      
      if (status && !Object.values(AdminUserStatus).includes(status)) {
        return res.status(400).json({ error: `Invalid status: ${status}` });
      }
      
      // Get current admin data
      const adminDoc = await adminDb.collection('admin_users').doc(id).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Check for last Super Admin - prevent downgrading last Super Admin
      if (role && role !== AdminRoleType.SUPER_ADMIN) {
        const currentData = adminDoc.data();
        
        if (currentData?.role === AdminRoleType.SUPER_ADMIN) {
          // Count Super Admins
          const superAdminsSnapshot = await adminDb.collection('admin_users')
            .where('role', '==', AdminRoleType.SUPER_ADMIN)
            .where('status', '==', AdminUserStatus.ACTIVE)
            .get();
          
          if (superAdminsSnapshot.size <= 1) {
            return res.status(400).json({ 
              error: 'Cannot downgrade the last Super Admin' 
            });
          }
        }
      }
      
      // Build update data
      const updateData: Record<string, any> = {
        updatedAt: new Date()
      };
      
      if (role) updateData.role = role;
      if (status) updateData.status = status;
      if (name) updateData.name = name;
      if (department) updateData.department = department;
      if (position) updateData.position = position;
      
      // Update admin in Firestore
      await adminDb.collection('admin_users').doc(id).update(updateData);
      
      // Return success response
      res.json({ 
        success: true, 
        message: 'Admin user updated successfully',
        adminId: id
      });
    } catch (error) {
      console.error('Error updating admin user:', error);
      res.status(500).json({ error: 'Failed to update admin user' });
    }
  });

  /**
   * Delete (deactivate) admin user - Super Admin only
   */
  app.delete('/api/admin/users/:id', verifyAdminRole(AdminRoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      
      // Get current admin data
      const adminDoc = await adminDb.collection('admin_users').doc(id).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      const adminData = adminDoc.data();
      
      // Check for last Super Admin
      if (adminData?.role === AdminRoleType.SUPER_ADMIN) {
        // Count Super Admins
        const superAdminsSnapshot = await adminDb.collection('admin_users')
          .where('role', '==', AdminRoleType.SUPER_ADMIN)
          .where('status', '==', AdminUserStatus.ACTIVE)
          .get();
        
        if (superAdminsSnapshot.size <= 1) {
          return res.status(400).json({ 
            error: 'Cannot delete the last Super Admin' 
          });
        }
      }
      
      // We don't actually delete the admin, just set status to DISABLED
      await adminDb.collection('admin_users').doc(id).update({
        status: AdminUserStatus.DISABLED,
        updatedAt: new Date()
      });
      
      // Return success response
      res.json({ 
        success: true, 
        message: 'Admin user deactivated successfully',
        adminId: id
      });
    } catch (error) {
      console.error('Error deactivating admin user:', error);
      res.status(500).json({ error: 'Failed to deactivate admin user' });
    }
  });

  /**
   * Get pending approval admins - Super Admin only
   */
  app.get('/api/admin/pending-approvals', verifyAdminRole(AdminRoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
    try {
      // Query admins with pending approval status
      const snapshot = await adminDb.collection('admin_users')
        .where('status', '==', AdminUserStatus.PENDING_APPROVAL)
        .orderBy('createdAt', 'desc')
        .get();
      
      // Format response
      const pendingAdmins = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          email: data.email,
          name: data.name,
          role: data.role,
          department: data.department,
          position: data.position,
          createdAt: data.createdAt?.toDate?.() || null
        };
      });
      
      // Return results
      res.json({ pendingAdmins });
    } catch (error) {
      console.error('Error fetching pending approval admins:', error);
      res.status(500).json({ error: 'Failed to fetch pending approval admins' });
    }
  });

  /**
   * Approve or reject admin registration - Super Admin only
   */
  app.post('/api/admin/process-approval', verifyAdminRole(AdminRoleType.SUPER_ADMIN), async (req: Request, res: Response) => {
    try {
      const { adminId, approved, notes } = req.body;
      
      // Validate input
      if (!adminId) {
        return res.status(400).json({ error: 'Admin ID is required' });
      }
      
      if (approved === undefined) {
        return res.status(400).json({ error: 'Approval decision is required' });
      }
      
      // Get admin data
      const adminDoc = await adminDb.collection('admin_users').doc(adminId).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      const adminData = adminDoc.data();
      
      // Check if admin is pending approval
      if (adminData?.status !== AdminUserStatus.PENDING_APPROVAL) {
        return res.status(400).json({ 
          error: 'Admin is not pending approval',
          status: adminData?.status 
        });
      }
      
      // Update admin status based on approval decision
      const updateData: Record<string, any> = {
        status: approved ? AdminUserStatus.ACTIVE : AdminUserStatus.DISABLED,
        approvalNotes: notes || '',
        approvedBy: req.user?.uid || null,
        approvedAt: new Date(),
        updatedAt: new Date()
      };
      
      // Update admin in Firestore
      await adminDb.collection('admin_users').doc(adminId).update(updateData);
      
      // Return success response
      res.json({ 
        success: true, 
        message: approved ? 'Admin approved successfully' : 'Admin rejected', 
        adminId 
      });
    } catch (error) {
      console.error('Error processing admin approval:', error);
      res.status(500).json({ error: 'Failed to process admin approval' });
    }
  });

  /**
   * Get Admin Stats - Super Admin and Admin only
   */
  app.get('/api/admin/stats', verifyAdminRole(AdminRoleType.ADMIN), async (req: Request, res: Response) => {
    try {
      // Get counts by status
      const activeCountSnapshot = await adminDb.collection('admin_users')
        .where('status', '==', AdminUserStatus.ACTIVE)
        .count()
        .get();
      
      const pendingCountSnapshot = await adminDb.collection('admin_users')
        .where('status', '==', AdminUserStatus.PENDING_APPROVAL)
        .count()
        .get();
      
      const disabledCountSnapshot = await adminDb.collection('admin_users')
        .where('status', '==', AdminUserStatus.DISABLED)
        .count()
        .get();
      
      // Get counts by role
      const superAdminCountSnapshot = await adminDb.collection('admin_users')
        .where('role', '==', AdminRoleType.SUPER_ADMIN)
        .where('status', '==', AdminUserStatus.ACTIVE)
        .count()
        .get();
      
      const adminCountSnapshot = await adminDb.collection('admin_users')
        .where('role', '==', AdminRoleType.ADMIN)
        .where('status', '==', AdminUserStatus.ACTIVE)
        .count()
        .get();
      
      const moderatorCountSnapshot = await adminDb.collection('admin_users')
        .where('role', '==', AdminRoleType.MODERATOR)
        .where('status', '==', AdminUserStatus.ACTIVE)
        .count()
        .get();
      
      // Return stats
      res.json({
        totalAdmins: activeCountSnapshot.data().count + pendingCountSnapshot.data().count + disabledCountSnapshot.data().count,
        byStatus: {
          active: activeCountSnapshot.data().count,
          pending: pendingCountSnapshot.data().count,
          disabled: disabledCountSnapshot.data().count
        },
        byRole: {
          superAdmin: superAdminCountSnapshot.data().count,
          admin: adminCountSnapshot.data().count,
          moderator: moderatorCountSnapshot.data().count
        }
      });
    } catch (error) {
      console.error('Error fetching admin stats:', error);
      res.status(500).json({ error: 'Failed to fetch admin stats' });
    }
  });
}