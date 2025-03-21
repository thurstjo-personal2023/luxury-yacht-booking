/**
 * Admin Profile Routes
 * 
 * This module registers admin profile management routes for the Express server.
 */

import { Request, Response, NextFunction, Express } from 'express';
import { adminDb, verifyAuth } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Verify that a user has admin privileges
 */
export const verifyAdminRole = async (req: Request, res: Response, next: NextFunction) => {
  // First check regular authentication
  verifyAuth(req, res, async () => {
    try {
      // Extract user claims from request
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if user has admin role
      const userDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      // Check if admin user exists and has active status
      if (!userDoc.exists) {
        return res.status(403).json({ error: 'Forbidden: Not an administrator' });
      }
      
      const userData = userDoc.data();
      if (userData?.status !== 'active') {
        return res.status(403).json({ 
          error: 'Forbidden: Admin account not active', 
          status: userData?.status || 'unknown'
        });
      }
      
      // User is authenticated and has admin role, proceed
      next();
    } catch (error) {
      console.error('Error verifying admin role:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

/**
 * Register admin profile routes
 */
export function registerAdminProfileRoutes(app: Express) {
  /**
   * Create a new admin profile
   * This endpoint is used during admin registration
   */
  app.post('/api/admin/create-profile', verifyAuth, async (req: Request, res: Response) => {
    try {
      const { name, email, phone, invitationId, status = 'pending_approval' } = req.body;
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Validate required fields
      if (!name || !email) {
        return res.status(400).json({ error: 'Name and email are required' });
      }
      
      // Create the admin user document
      const adminUserData = {
        uid,
        name,
        email,
        phone: phone || null,
        role: 'admin',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        status,  // pending_approval, active, or suspended
        invitationId: invitationId || null,
        approvedBy: null,
        approvedAt: null,
        lastLoginAt: null,
        permissions: ['view_admin_dashboard'],  // Default basic permissions
        mfaEnabled: false,  // Will be set to true during MFA setup
      };
      
      // Save to admin_users collection
      await adminDb.collection('admin_users').doc(uid).set(adminUserData);
      
      // Return success
      res.status(201).json({
        success: true,
        message: 'Admin profile created successfully',
        userId: uid
      });
    } catch (error) {
      console.error('Error creating admin profile:', error);
      res.status(500).json({ 
        error: 'Failed to create admin profile', 
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get current admin profile
   * Returns the admin profile for the authenticated user
   */
  app.get('/api/admin/profile', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get the admin profile
      const adminDoc = await adminDb.collection('admin_users').doc(uid as string).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin profile not found' });
      }
      
      // Return the admin profile with sensitive fields removed
      const adminData = adminDoc.data();
      const safeAdminData = {
        uid: adminData?.uid,
        name: adminData?.name,
        email: adminData?.email,
        phone: adminData?.phone,
        role: adminData?.role,
        status: adminData?.status,
        createdAt: adminData?.createdAt,
        lastLoginAt: adminData?.lastLoginAt,
        permissions: adminData?.permissions,
        mfaEnabled: adminData?.mfaEnabled,
      };
      
      res.json({
        success: true,
        profile: safeAdminData
      });
    } catch (error) {
      console.error('Error retrieving admin profile:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve admin profile',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Update admin profile
   * Allows administrators to update their own profile details
   */
  app.put('/api/admin/profile', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      const { name, phone } = req.body;
      
      // Create update object with only allowed fields
      const updateData: any = {
        updatedAt: Timestamp.now()
      };
      
      if (name) updateData.name = name;
      if (phone) updateData.phone = phone;
      
      // Update the admin profile
      await adminDb.collection('admin_users').doc(uid as string).update(updateData);
      
      res.json({
        success: true,
        message: 'Admin profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating admin profile:', error);
      res.status(500).json({ 
        error: 'Failed to update admin profile',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Get pending admin approvals
   * Retrieves a list of admin profiles pending approval
   * Only accessible to super admins
   */
  app.get('/api/admin/pending-approvals', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized: User ID missing' });
      }
      
      // Verify super admin status
      const adminDoc = await adminDb.collection('admin_users').doc(uid as string).get();
      const adminData = adminDoc.data();
      
      if (!adminData?.permissions.includes('approve_admins')) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      // Get pending admin profiles
      const pendingAdmins = await adminDb.collection('admin_users')
        .where('status', '==', 'pending_approval')
        .orderBy('createdAt', 'asc')
        .get();
      
      const pendingProfiles = pendingAdmins.docs.map(doc => {
        const data = doc.data();
        return {
          uid: data.uid,
          name: data.name,
          email: data.email,
          phone: data.phone,
          createdAt: data.createdAt,
          invitationId: data.invitationId
        };
      });
      
      res.json({
        success: true,
        pendingProfiles
      });
    } catch (error) {
      console.error('Error retrieving pending admin approvals:', error);
      res.status(500).json({ 
        error: 'Failed to retrieve pending admin approvals',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Approve or reject admin account
   * Allows super admins to approve or reject pending admin accounts
   */
  app.post('/api/admin/process-approval', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const approverUid = req.user?.uid;
      const { adminUid, status, notes } = req.body;
      
      if (!approverUid) {
        return res.status(401).json({ error: 'Unauthorized: User ID missing' });
      }
      
      if (!adminUid || !status) {
        return res.status(400).json({ error: 'Admin UID and status are required' });
      }
      
      if (status !== 'active' && status !== 'rejected') {
        return res.status(400).json({ error: 'Status must be either "active" or "rejected"' });
      }
      
      // Verify super admin status
      const approverDoc = await adminDb.collection('admin_users').doc(approverUid).get();
      const approverData = approverDoc.data();
      
      if (!approverData?.permissions.includes('approve_admins')) {
        return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
      }
      
      // Check if admin exists
      const adminDoc = await adminDb.collection('admin_users').doc(adminUid).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Update admin status
      await adminDb.collection('admin_users').doc(adminUid).update({
        status,
        approvedBy: approverUid,
        approvedAt: Timestamp.now(),
        approvalNotes: notes || null,
        updatedAt: Timestamp.now()
      });
      
      // TODO: Send notification email to the admin

      res.json({
        success: true,
        message: `Admin account ${status === 'active' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Error processing admin approval:', error);
      res.status(500).json({ 
        error: 'Failed to process admin approval',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });

  /**
   * Set up MFA for admin account
   * Allows administrators to enable MFA on their account
   */
  app.post('/api/admin/setup-mfa', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Update MFA status
      await adminDb.collection('admin_users').doc(uid).update({
        mfaEnabled: true,
        updatedAt: Timestamp.now()
      });
      
      res.json({
        success: true,
        message: 'MFA setup completed successfully'
      });
    } catch (error) {
      console.error('Error setting up MFA:', error);
      res.status(500).json({ 
        error: 'Failed to setup MFA',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  });
}