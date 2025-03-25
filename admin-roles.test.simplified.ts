/**
 * Administrator Role & Permissions Management Tests
 * 
 * This file contains tests for role-based permissions management
 * for administrator accounts.
 * 
 * These tests verify that:
 * 1. Super Admins can create and manage other administrators
 * 2. Role-based permissions are properly enforced
 * 3. Administrative hierarchy is maintained
 */

import { describe, test, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from '@jest/globals';
import {
  Auth, Firestore, FirebaseApp,
  initializeApp, initializeAuth, connectAuthEmulator,
  initializeFirestore, connectFirestoreEmulator,
  signInWithEmailAndPassword, deleteApp
} from 'firebase/auth';
import { Request, Response, NextFunction, Express, Router } from 'express';
import { 
  collection, doc, getDoc, setDoc, query, where, getDocs, DocumentReference
} from 'firebase/firestore';

// Types for admin roles
type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR';
type AdminDepartment = 'Technology' | 'Customer Support' | 'Finance' | 'Operations' | 'Marketing';

// Admin user interface
interface AdminUser {
  uid: string;
  email: string;
  role: AdminRole;
  department: AdminDepartment;
  position: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock Express App
interface MockExpress extends Express {
  _routes: {
    method: string;
    path: string;
    handler: Function;
    middleware?: Function[];
  }[];
}

// Mock Utilities for Admin Role Management
const mockRoleManagement = {
  // Create a test admin user in Firebase Auth and Firestore
  createTestAdmin: jest.fn(
    async (auth: Auth, db: Firestore, userData: any): Promise<string> => {
      // In a real implementation, this would create a user in Firebase Auth
      // For our test, we'll simulate it
      const uid = `test-admin-${Date.now()}`;
      
      // Create the admin document in Firestore
      await setDoc(doc(db, 'admin_users', uid), {
        uid,
        email: userData.email,
        role: userData.role || 'ADMIN',
        department: userData.department || 'Technology',
        position: userData.position || 'Test Admin',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Also add to harmonized_users collection
      await setDoc(doc(db, 'harmonized_users', uid), {
        uid,
        email: userData.email,
        userType: 'ADMIN',
        role: userData.role || 'ADMIN',
        displayName: userData.displayName || `Test ${userData.role || 'Admin'}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      return uid;
    }
  ),
  
  // Get admin user by ID
  getAdminById: jest.fn(
    async (db: Firestore, uid: string): Promise<AdminUser | null> => {
      const docRef = doc(db, 'admin_users', uid);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return docSnap.data() as AdminUser;
      }
      
      return null;
    }
  ),
  
  // Update admin role
  updateAdminRole: jest.fn(
    async (db: Firestore, actorId: string, targetId: string, newRole: AdminRole): Promise<boolean> => {
      // Get the actor's role
      const actorAdmin = await mockRoleManagement.getAdminById(db, actorId);
      
      if (!actorAdmin) {
        return false; // Actor not found
      }
      
      // Check if actor has permission to update roles
      if (actorAdmin.role !== 'SUPER_ADMIN') {
        return false; // Only Super Admins can update roles
      }
      
      // Update the target admin's role
      const adminRef = doc(db, 'admin_users', targetId);
      const adminDoc = await getDoc(adminRef);
      
      if (!adminDoc.exists()) {
        return false; // Target admin not found
      }
      
      // Update the role
      await setDoc(adminRef, { 
        role: newRole, 
        updatedAt: new Date() 
      }, { merge: true });
      
      // Also update in harmonized_users
      const userRef = doc(db, 'harmonized_users', targetId);
      await setDoc(userRef, { 
        role: newRole, 
        updatedAt: new Date() 
      }, { merge: true });
      
      return true;
    }
  ),
  
  // Delete an admin
  deleteAdmin: jest.fn(
    async (db: Firestore, actorId: string, targetId: string): Promise<{ success: boolean, message?: string }> => {
      // Get the actor's role
      const actorAdmin = await mockRoleManagement.getAdminById(db, actorId);
      
      if (!actorAdmin) {
        return { success: false, message: 'Actor admin not found' };
      }
      
      // Check if actor has permission to delete admins
      if (actorAdmin.role !== 'SUPER_ADMIN') {
        return { success: false, message: 'Insufficient permissions' };
      }
      
      // Get the target admin
      const targetAdmin = await mockRoleManagement.getAdminById(db, targetId);
      
      if (!targetAdmin) {
        return { success: false, message: 'Target admin not found' };
      }
      
      // Check if this is the last Super Admin
      if (targetAdmin.role === 'SUPER_ADMIN') {
        // Count Super Admins
        const superAdminQuery = query(
          collection(db, 'admin_users'), 
          where('role', '==', 'SUPER_ADMIN'),
          where('isActive', '==', true)
        );
        
        const superAdmins = await getDocs(superAdminQuery);
        
        if (superAdmins.size <= 1) {
          return { 
            success: false, 
            message: 'Cannot delete the last Super Admin' 
          };
        }
      }
      
      // Delete the admin
      await deleteDoc(doc(db, 'admin_users', targetId));
      
      // Also delete from harmonized_users or mark as inactive
      await setDoc(doc(db, 'harmonized_users', targetId), { 
        isActive: false,
        deletedAt: new Date(),
        updatedAt: new Date() 
      }, { merge: true });
      
      return { success: true };
    }
  ),
  
  // Check if an admin exists
  adminExists: jest.fn(
    async (db: Firestore, uid: string): Promise<boolean> => {
      const docRef = doc(db, 'admin_users', uid);
      const docSnap = await getDoc(docRef);
      return docSnap.exists();
    }
  ),
  
  // Count admins by role
  countAdminsByRole: jest.fn(
    async (db: Firestore, role: AdminRole): Promise<number> => {
      const adminsQuery = query(
        collection(db, 'admin_users'), 
        where('role', '==', role),
        where('isActive', '==', true)
      );
      
      const admins = await getDocs(adminsQuery);
      return admins.size;
    }
  ),
  
  // Create mock Express app with admin management routes
  createMockExpressApp: (): MockExpress => {
    const app = {
      _routes: [],
      post: function(path: string, ...args: any[]) {
        const middleware = args.length > 1 ? args[0] : undefined;
        const handler = args.length > 1 ? args[1] : args[0];
        
        this._routes.push({
          method: 'POST',
          path,
          handler,
          middleware
        });
        
        return this;
      },
      get: function(path: string, ...args: any[]) {
        const middleware = args.length > 1 ? args[0] : undefined;
        const handler = args.length > 1 ? args[1] : args[0];
        
        this._routes.push({
          method: 'GET',
          path,
          handler,
          middleware
        });
        
        return this;
      },
      delete: function(path: string, ...args: any[]) {
        const middleware = args.length > 1 ? args[0] : undefined;
        const handler = args.length > 1 ? args[1] : args[0];
        
        this._routes.push({
          method: 'DELETE',
          path,
          handler,
          middleware
        });
        
        return this;
      },
      use: function() { return this; }
    } as unknown as MockExpress;
    
    return app;
  },
  
  // Register admin role management routes to mock express app
  registerAdminRoutes: (app: MockExpress, db: Firestore): void => {
    // Middleware to verify admin role
    const verifyAdminRole = (requiredRole: AdminRole) => {
      return async (req: Request, res: Response, next: NextFunction) => {
        if (!req.headers.authorization) {
          return res.status(401).json({ message: 'Unauthorized' });
        }
        
        // Extract user ID from authorization
        const uid = req.headers.authorization.split(' ')[1];
        
        // Check if user is an admin with required role
        const admin = await mockRoleManagement.getAdminById(db, uid);
        
        if (!admin) {
          return res.status(403).json({ message: 'Forbidden - Not an admin' });
        }
        
        // Check roles
        const roleHierarchy = {
          'SUPER_ADMIN': 3,
          'ADMIN': 2,
          'MODERATOR': 1
        };
        
        if (roleHierarchy[admin.role] < roleHierarchy[requiredRole]) {
          return res.status(403).json({ message: 'Insufficient permissions' });
        }
        
        // Add admin to request
        (req as any).admin = admin;
        next();
      };
    };
    
    // Route to create new admin
    app.post('/api/admin/create-admin', verifyAdminRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
      try {
        const { email, role, department, position } = req.body;
        
        if (!email || !role || !department || !position) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // In a real implementation, this would create a user in Firebase Auth
        // and send an invitation email
        const uid = `admin-${Date.now()}`;
        
        // Create admin in Firestore
        await setDoc(doc(db, 'admin_users', uid), {
          uid,
          email,
          role,
          department,
          position,
          isActive: false, // Requires approval
          createdAt: new Date(),
          updatedAt: new Date()
        });
        
        return res.status(201).json({ 
          message: 'Admin created successfully', 
          adminId: uid 
        });
      } catch (error) {
        console.error('Error creating admin:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
    
    // Route to update admin role
    app.post('/api/admin/update-role', verifyAdminRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
      try {
        const { targetAdminId, newRole } = req.body;
        const actorAdmin = (req as any).admin;
        
        if (!targetAdminId || !newRole) {
          return res.status(400).json({ message: 'Missing required fields' });
        }
        
        // Update the role
        const success = await mockRoleManagement.updateAdminRole(
          db, 
          actorAdmin.uid, 
          targetAdminId, 
          newRole as AdminRole
        );
        
        if (!success) {
          return res.status(400).json({ message: 'Failed to update role' });
        }
        
        return res.status(200).json({ message: 'Role updated successfully' });
      } catch (error) {
        console.error('Error updating role:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
    
    // Route to delete admin
    app.delete('/api/admin/delete-admin/:id', verifyAdminRole('SUPER_ADMIN'), async (req: Request, res: Response) => {
      try {
        const targetAdminId = req.params.id;
        const actorAdmin = (req as any).admin;
        
        if (!targetAdminId) {
          return res.status(400).json({ message: 'Missing admin ID' });
        }
        
        // Delete the admin
        const result = await mockRoleManagement.deleteAdmin(
          db, 
          actorAdmin.uid, 
          targetAdminId
        );
        
        if (!result.success) {
          return res.status(400).json({ message: result.message });
        }
        
        return res.status(200).json({ message: 'Admin deleted successfully' });
      } catch (error) {
        console.error('Error deleting admin:', error);
        return res.status(500).json({ message: 'Internal server error' });
      }
    });
  }
};

describe('Administrator Role & Permissions Management Tests', () => {
  let app: FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  let expressApp: MockExpress;
  
  beforeAll(() => {
    // Initialize Firebase
    app = initializeApp({
      projectId: 'test-project',
      apiKey: 'fake-api-key'
    });
    
    // Connect to Auth emulator
    auth = initializeAuth(app);
    connectAuthEmulator(auth, 'http://localhost:9099');
    
    // Connect to Firestore emulator
    db = initializeFirestore(app, {});
    connectFirestoreEmulator(db, 'localhost', 8080);
    
    // Create mock Express app
    expressApp = mockRoleManagement.createMockExpressApp();
    mockRoleManagement.registerAdminRoutes(expressApp, db);
  });
  
  afterAll(async () => {
    await deleteApp(app);
  });
  
  describe('ARM-001: Super Admin can create other Admins', () => {
    let superAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true
      });
    });
    
    afterEach(async () => {
      // Clean up
      try {
        await deleteDoc(doc(db, 'admin_users', superAdminId));
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
    
    test('Super Admin can create a new admin via API', async () => {
      // Find the create-admin route
      const createAdminRoute = expressApp._routes.find(
        route => route.method === 'POST' && route.path === '/api/admin/create-admin'
      );
      
      if (!createAdminRoute) {
        throw new Error('Create admin route not found');
      }
      
      // Mock request and response
      const req = {
        headers: {
          authorization: `Bearer ${superAdminId}`
        },
        body: {
          email: 'new-admin@example.com',
          role: 'ADMIN',
          department: 'Customer Support',
          position: 'Support Manager'
        }
      } as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      // Call the middleware first
      const middleware = createAdminRoute.middleware;
      if (middleware) {
        await new Promise<void>((resolve) => {
          middleware(req, res, resolve);
        });
      }
      
      // Call the route handler
      await createAdminRoute.handler(req, res);
      
      // Check the response
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Admin created successfully',
          adminId: expect.any(String)
        })
      );
      
      // Get the admin ID from the mock response
      const adminId = res.json.mock.calls[0][0].adminId;
      
      // Verify the admin was created in Firestore
      const adminExists = await mockRoleManagement.adminExists(db, adminId);
      expect(adminExists).toBe(true);
      
      // Clean up
      await deleteDoc(doc(db, 'admin_users', adminId));
    });
  });
  
  describe('ARM-002: Admins cannot modify roles they don\'t own', () => {
    let superAdminId: string;
    let adminId: string;
    let targetAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true
      });
      
      // Create a regular Admin
      adminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'regular-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Lead',
        isActive: true
      });
      
      // Create a target Admin to modify
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'MODERATOR',
        department: 'Marketing',
        position: 'Content Moderator',
        isActive: true
      });
    });
    
    afterEach(async () => {
      // Clean up
      try {
        await deleteDoc(doc(db, 'admin_users', superAdminId));
        await deleteDoc(doc(db, 'admin_users', adminId));
        await deleteDoc(doc(db, 'admin_users', targetAdminId));
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
    
    test('Super Admin can update another admin\'s role', async () => {
      // Update role using Super Admin credentials
      const success = await mockRoleManagement.updateAdminRole(
        db,
        superAdminId,
        targetAdminId,
        'ADMIN' // Promote from MODERATOR to ADMIN
      );
      
      expect(success).toBe(true);
      
      // Verify the role was updated
      const targetAdmin = await mockRoleManagement.getAdminById(db, targetAdminId);
      expect(targetAdmin?.role).toBe('ADMIN');
    });
    
    test('Regular Admin cannot update another admin\'s role', async () => {
      // Attempt to update role using regular Admin credentials
      const success = await mockRoleManagement.updateAdminRole(
        db,
        adminId,
        targetAdminId,
        'ADMIN' // Try to promote from MODERATOR to ADMIN
      );
      
      expect(success).toBe(false);
      
      // Verify the role was not updated
      const targetAdmin = await mockRoleManagement.getAdminById(db, targetAdminId);
      expect(targetAdmin?.role).toBe('MODERATOR'); // Still MODERATOR
    });
    
    test('Regular Admin gets 403 when trying to use update-role API', async () => {
      // Find the update-role route
      const updateRoleRoute = expressApp._routes.find(
        route => route.method === 'POST' && route.path === '/api/admin/update-role'
      );
      
      if (!updateRoleRoute) {
        throw new Error('Update role route not found');
      }
      
      // Mock request and response
      const req = {
        headers: {
          authorization: `Bearer ${adminId}` // Regular admin token
        },
        body: {
          targetAdminId,
          newRole: 'ADMIN'
        }
      } as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      // Call the middleware first
      const middleware = updateRoleRoute.middleware;
      if (middleware) {
        await middleware(req, res, () => {});
      }
      
      // Check the response - should be forbidden
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Insufficient permissions')
        })
      );
    });
  });
  
  describe('ARM-003: Only Super Admins can delete Admins', () => {
    let superAdminId: string;
    let adminId: string;
    let targetAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true
      });
      
      // Create a regular Admin
      adminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'regular-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Lead',
        isActive: true
      });
      
      // Create a target Admin to delete
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'MODERATOR',
        department: 'Marketing',
        position: 'Content Moderator',
        isActive: true
      });
    });
    
    afterEach(async () => {
      // Clean up
      try {
        await deleteDoc(doc(db, 'admin_users', superAdminId));
        await deleteDoc(doc(db, 'admin_users', adminId));
        
        // targetAdminId might be deleted in tests, so check first
        const exists = await mockRoleManagement.adminExists(db, targetAdminId);
        if (exists) {
          await deleteDoc(doc(db, 'admin_users', targetAdminId));
        }
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
    
    test('Super Admin can delete another admin', async () => {
      // Delete admin using Super Admin credentials
      const result = await mockRoleManagement.deleteAdmin(
        db,
        superAdminId,
        targetAdminId
      );
      
      expect(result.success).toBe(true);
      
      // Verify the admin was deleted
      const exists = await mockRoleManagement.adminExists(db, targetAdminId);
      expect(exists).toBe(false);
    });
    
    test('Regular Admin cannot delete another admin', async () => {
      // Attempt to delete admin using regular Admin credentials
      const result = await mockRoleManagement.deleteAdmin(
        db,
        adminId,
        targetAdminId
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Insufficient permissions');
      
      // Verify the admin was not deleted
      const exists = await mockRoleManagement.adminExists(db, targetAdminId);
      expect(exists).toBe(true);
    });
  });
  
  describe('ARM-004: Unauthorized user tries modifying admin permissions', () => {
    let superAdminId: string;
    let consumerUserId: string;
    let targetAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true
      });
      
      // Create a consumer user (non-admin)
      consumerUserId = `consumer-${Date.now()}`;
      await setDoc(doc(db, 'harmonized_users', consumerUserId), {
        uid: consumerUserId,
        email: 'consumer@example.com',
        userType: 'CONSUMER',
        displayName: 'Test Consumer',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create a target Admin
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Manager',
        isActive: true
      });
    });
    
    afterEach(async () => {
      // Clean up
      try {
        await deleteDoc(doc(db, 'admin_users', superAdminId));
        await deleteDoc(doc(db, 'harmonized_users', consumerUserId));
        await deleteDoc(doc(db, 'admin_users', targetAdminId));
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
    
    test('Consumer user gets unauthorized when trying to access admin routes', async () => {
      // Find the update-role route
      const updateRoleRoute = expressApp._routes.find(
        route => route.method === 'POST' && route.path === '/api/admin/update-role'
      );
      
      if (!updateRoleRoute) {
        throw new Error('Update role route not found');
      }
      
      // Mock request and response
      const req = {
        headers: {
          authorization: `Bearer ${consumerUserId}` // Consumer user token
        },
        body: {
          targetAdminId,
          newRole: 'MODERATOR'
        }
      } as Request;
      
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      } as unknown as Response;
      
      // Call the middleware
      const middleware = updateRoleRoute.middleware;
      if (middleware) {
        await middleware(req, res, () => {});
      }
      
      // Check the response - should be forbidden
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Forbidden')
        })
      );
    });
  });
  
  describe('ARM-005: Attempt to delete last Super Admin', () => {
    let superAdminId: string;
    
    beforeEach(async () => {
      // Create a single Super Admin
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'only-super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true
      });
    });
    
    afterEach(async () => {
      // Clean up
      try {
        await deleteDoc(doc(db, 'admin_users', superAdminId));
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
    
    test('System prevents deletion of the last Super Admin', async () => {
      // Verify this is the only Super Admin
      const superAdminCount = await mockRoleManagement.countAdminsByRole(db, 'SUPER_ADMIN');
      expect(superAdminCount).toBe(1);
      
      // Attempt to delete the Super Admin
      const result = await mockRoleManagement.deleteAdmin(
        db,
        superAdminId, // Actor is the same Super Admin
        superAdminId  // Target is also the same Super Admin
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Cannot delete the last Super Admin');
      
      // Verify the Super Admin was not deleted
      const exists = await mockRoleManagement.adminExists(db, superAdminId);
      expect(exists).toBe(true);
    });
    
    test('Can delete a Super Admin if there are multiple Super Admins', async () => {
      // Create another Super Admin
      const anotherSuperAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'another-super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Operations',
        position: 'COO',
        isActive: true
      });
      
      // Verify there are now two Super Admins
      const superAdminCount = await mockRoleManagement.countAdminsByRole(db, 'SUPER_ADMIN');
      expect(superAdminCount).toBe(2);
      
      // Delete one of the Super Admins
      const result = await mockRoleManagement.deleteAdmin(
        db,
        superAdminId,
        anotherSuperAdminId
      );
      
      expect(result.success).toBe(true);
      
      // Verify one Super Admin was deleted
      const exists = await mockRoleManagement.adminExists(db, anotherSuperAdminId);
      expect(exists).toBe(false);
      
      // Verify the original Super Admin still exists
      const originalExists = await mockRoleManagement.adminExists(db, superAdminId);
      expect(originalExists).toBe(true);
      
      // Clean up the additional Super Admin if test fails
      try {
        if (exists) {
          await deleteDoc(doc(db, 'admin_users', anotherSuperAdminId));
        }
      } catch (error) {
        console.error('Clean up error:', error);
      }
    });
  });
});