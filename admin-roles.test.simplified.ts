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
import { Auth } from 'firebase/auth';
import { Firestore } from 'firebase/firestore';
import { Request, Response, NextFunction, Express } from 'express';

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
    middleware?: Function;
  }[];
}

// Mock document for Firebase
interface MockDocument {
  exists: () => boolean;
  data: () => any;
  id: string;
}

// Mock Utilities for Admin Role Management
const mockRoleManagement = {
  // Mock Firestore collections
  _collections: {
    admin_users: new Map<string, any>(),
    harmonized_users: new Map<string, any>()
  },

  // Reset the collections for clean tests
  resetCollections: () => {
    mockRoleManagement._collections.admin_users.clear();
    mockRoleManagement._collections.harmonized_users.clear();
  },

  // Mock Firestore doc function
  doc: (db: any, collection: string, id: string) => {
    return {
      id,
      collection,
      exists: jest.fn().mockImplementation(() => {
        return mockRoleManagement._collections[collection].has(id);
      }),
      data: jest.fn().mockImplementation(() => {
        return mockRoleManagement._collections[collection].get(id);
      }),
      set: jest.fn().mockImplementation((data: any, options: any = {}) => {
        if (options.merge) {
          const existingData = mockRoleManagement._collections[collection].get(id) || {};
          mockRoleManagement._collections[collection].set(id, { ...existingData, ...data });
        } else {
          mockRoleManagement._collections[collection].set(id, data);
        }
        return Promise.resolve();
      }),
      get: jest.fn().mockImplementation(() => {
        const exists = mockRoleManagement._collections[collection].has(id);
        const data = mockRoleManagement._collections[collection].get(id);
        return Promise.resolve({
          exists: () => exists,
          data: () => data,
          id
        });
      }),
      delete: jest.fn().mockImplementation(() => {
        mockRoleManagement._collections[collection].delete(id);
        return Promise.resolve();
      })
    };
  },

  // Mock Firestore query function
  query: (collection: string, ...filters: any[]) => {
    return {
      get: jest.fn().mockImplementation(() => {
        // Filter the collection based on the provided filters
        const collectionData = mockRoleManagement._collections[collection];
        const entries = Array.from(collectionData.entries()) as Array<[string, any]>;
        const filteredData = entries.filter((entry) => {
            const [_, value] = entry;
            // Apply all filters
            return filters.every(filter => {
              if (filter.type === 'where') {
                const { field, operator, value: filterValue } = filter;
                const fieldValue = value[field];
                
                switch(operator) {
                  case '==': return fieldValue === filterValue;
                  case '!=': return fieldValue !== filterValue;
                  case '>': return fieldValue > filterValue;
                  case '>=': return fieldValue >= filterValue;
                  case '<': return fieldValue < filterValue;
                  case '<=': return fieldValue <= filterValue;
                  default: return true;
                }
              }
              return true;
            });
          });

        return Promise.resolve({
          size: filteredData.length,
          docs: filteredData.map((entry) => {
            const [id, data] = entry;
            return {
              id,
              exists: () => true,
              data: () => data
            };
          })
        });
      })
    };
  },

  // Mock where filter
  where: (field: string, operator: string, value: any) => {
    return { type: 'where', field, operator, value };
  },

  // Create a test admin user in Firebase Auth and Firestore
  createTestAdmin: jest.fn(
    async (auth: Auth, db: Firestore, userData: any): Promise<string> => {
      // In a real implementation, this would create a user in Firebase Auth
      // For our test, we'll simulate it
      
      // Use fixed timestamp if provided, otherwise use current timestamp
      const timestamp = userData.timestamp || Date.now();
      const uid = `test-admin-${timestamp}`;
      
      // Create the admin document in Firestore
      const adminData = {
        uid,
        email: userData.email,
        role: userData.role || 'ADMIN',
        department: userData.department || 'Technology',
        position: userData.position || 'Test Admin',
        isActive: userData.isActive !== undefined ? userData.isActive : true,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockRoleManagement._collections.admin_users.set(uid, adminData);
      
      // Also add to harmonized_users collection
      const userData2 = {
        uid,
        email: userData.email,
        userType: 'ADMIN',
        role: userData.role || 'ADMIN',
        displayName: userData.displayName || `Test ${userData.role || 'Admin'}`,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockRoleManagement._collections.harmonized_users.set(uid, userData2);
      
      return uid;
    }
  ),
  
  // Get admin user by ID
  getAdminById: jest.fn(
    async (db: Firestore, uid: string): Promise<AdminUser | null> => {
      const admin = mockRoleManagement._collections.admin_users.get(uid);
      return admin || null;
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
      
      // Check if target admin exists
      if (!mockRoleManagement._collections.admin_users.has(targetId)) {
        return false; // Target admin not found
      }
      
      // Update the role
      const admin = mockRoleManagement._collections.admin_users.get(targetId);
      admin.role = newRole;
      admin.updatedAt = new Date();
      mockRoleManagement._collections.admin_users.set(targetId, admin);
      
      // Also update in harmonized_users
      if (mockRoleManagement._collections.harmonized_users.has(targetId)) {
        const user = mockRoleManagement._collections.harmonized_users.get(targetId);
        user.role = newRole;
        user.updatedAt = new Date();
        mockRoleManagement._collections.harmonized_users.set(targetId, user);
      }
      
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
        let superAdminCount = 0;
        for (const [_, admin] of mockRoleManagement._collections.admin_users.entries()) {
          if (admin.role === 'SUPER_ADMIN' && admin.isActive) {
            superAdminCount++;
          }
        }
        
        if (superAdminCount <= 1) {
          return { 
            success: false, 
            message: 'Cannot delete the last Super Admin' 
          };
        }
      }
      
      // Delete the admin
      mockRoleManagement._collections.admin_users.delete(targetId);
      
      // Also mark as inactive in harmonized_users
      if (mockRoleManagement._collections.harmonized_users.has(targetId)) {
        const user = mockRoleManagement._collections.harmonized_users.get(targetId);
        user.isActive = false;
        user.deletedAt = new Date();
        user.updatedAt = new Date();
        mockRoleManagement._collections.harmonized_users.set(targetId, user);
      }
      
      return { success: true };
    }
  ),
  
  // Check if an admin exists
  adminExists: jest.fn(
    async (db: Firestore, uid: string): Promise<boolean> => {
      return mockRoleManagement._collections.admin_users.has(uid);
    }
  ),
  
  // Count admins by role
  countAdminsByRole: jest.fn(
    async (db: Firestore, role: AdminRole): Promise<number> => {
      let count = 0;
      for (const [_, admin] of mockRoleManagement._collections.admin_users.entries()) {
        if (admin.role === role && admin.isActive) {
          count++;
        }
      }
      return count;
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
        const adminData = {
          uid,
          email,
          role,
          department,
          position,
          isActive: false, // Requires approval
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        mockRoleManagement._collections.admin_users.set(uid, adminData);
        
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
  let auth: Auth;
  let db: Firestore;
  let expressApp: MockExpress;
  
  beforeAll(() => {
    // Create mock auth and db
    auth = {} as Auth;
    db = {} as Firestore;
    
    // Create mock Express app
    expressApp = mockRoleManagement.createMockExpressApp();
    mockRoleManagement.registerAdminRoutes(expressApp, db);
  });
  
  beforeEach(() => {
    // Reset mock collections before each test
    mockRoleManagement.resetCollections();
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
      expect(res.json).toHaveBeenCalled();
      
      // Get the admin ID from the mock response
      const jsonCall = (res.json as jest.Mock).mock.calls[0][0] as { message: string; adminId: string };
      const adminId = jsonCall.adminId;
      
      // Verify the admin was created in Firestore
      const adminExists = await mockRoleManagement.adminExists(db, adminId);
      expect(adminExists).toBe(true);
    });
  });
  
  describe('ARM-002: Admins cannot modify roles they don\'t own', () => {
    let superAdminId: string;
    let adminId: string;
    let targetAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin - Use a fixed timestamp to ensure unique IDs
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true,
        timestamp: 1000 // Use fixed timestamps to create distinct IDs
      });
      
      // Create a regular Admin - Use a fixed timestamp to ensure unique IDs
      adminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'regular-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Lead',
        isActive: true,
        timestamp: 2000 // Use fixed timestamps to create distinct IDs
      });
      
      // Create a target Admin to modify - Use a fixed timestamp to ensure unique IDs
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'MODERATOR',
        department: 'Marketing',
        position: 'Content Moderator',
        isActive: true,
        timestamp: 3000 // Use fixed timestamps to create distinct IDs
      });
    });
    
    test('Super Admin can update another admin\'s role', async () => {
      console.log('Super Admin ID:', superAdminId);
      console.log('Target Admin ID:', targetAdminId);
      
      // Update role using Super Admin credentials
      const success = await mockRoleManagement.updateAdminRole(
        db,
        superAdminId,
        targetAdminId,
        'ADMIN' // Promote from MODERATOR to ADMIN
      );
      
      console.log('Update success:', success);
      
      // Verify the role was updated
      const targetAdmin = await mockRoleManagement.getAdminById(db, targetAdminId);
      console.log('Target admin after update:', targetAdmin);
      
      expect(success).toBe(true);
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
      expect(res.json).toHaveBeenCalled();
    });
  });
  
  describe('ARM-003: Only Super Admins can delete Admins', () => {
    let superAdminId: string;
    let adminId: string;
    let targetAdminId: string;
    
    beforeEach(async () => {
      // Create a Super Admin - Use a fixed timestamp to ensure unique IDs
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true,
        timestamp: 4000 // Use fixed timestamps to create distinct IDs
      });
      
      // Create a regular Admin - Use a fixed timestamp to ensure unique IDs
      adminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'regular-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Lead',
        isActive: true,
        timestamp: 5000 // Use fixed timestamps to create distinct IDs
      });
      
      // Create a target Admin to delete - Use a fixed timestamp to ensure unique IDs
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'MODERATOR',
        department: 'Marketing',
        position: 'Content Moderator',
        isActive: true,
        timestamp: 6000 // Use fixed timestamps to create distinct IDs
      });
    });
    
    test('Super Admin can delete another admin', async () => {
      console.log('Super Admin ID:', superAdminId);
      console.log('Target Admin ID:', targetAdminId);
      
      // Verify admin exists before deletion
      const initialExists = await mockRoleManagement.adminExists(db, targetAdminId);
      console.log('Target admin exists before deletion:', initialExists);
      
      // Delete admin using Super Admin credentials
      const result = await mockRoleManagement.deleteAdmin(
        db,
        superAdminId,
        targetAdminId
      );
      
      console.log('Delete result:', result);
      
      // Verify the admin was deleted
      const exists = await mockRoleManagement.adminExists(db, targetAdminId);
      console.log('Target admin exists after deletion:', exists);
      
      expect(result.success).toBe(true);
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
      // Create a Super Admin - Use a fixed timestamp to ensure unique IDs
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true,
        timestamp: 7000 // Use fixed timestamps to create distinct IDs
      });
      
      // Create a consumer user (non-admin)
      consumerUserId = `consumer-${7000}`; // Use fixed value instead of Date.now()
      mockRoleManagement._collections.harmonized_users.set(consumerUserId, {
        uid: consumerUserId,
        email: 'consumer@example.com',
        userType: 'CONSUMER',
        displayName: 'Test Consumer',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create a target Admin - Use a fixed timestamp to ensure unique IDs
      targetAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'target-admin@example.com',
        role: 'ADMIN',
        department: 'Customer Support',
        position: 'Support Manager',
        isActive: true,
        timestamp: 8000 // Use fixed timestamps to create distinct IDs
      });
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
      expect(res.json).toHaveBeenCalled();
    });
  });
  
  describe('ARM-005: Attempt to delete last Super Admin', () => {
    let superAdminId: string;
    
    beforeEach(async () => {
      // Create a single Super Admin - Use a fixed timestamp to ensure unique IDs
      superAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'only-super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Technology',
        position: 'CTO',
        isActive: true,
        timestamp: 9000 // Use fixed timestamps to create distinct IDs
      });
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
      // Create another Super Admin - Use a fixed timestamp to ensure unique IDs
      const anotherSuperAdminId = await mockRoleManagement.createTestAdmin(auth, db, {
        email: 'another-super-admin@example.com',
        role: 'SUPER_ADMIN',
        department: 'Operations',
        position: 'COO',
        isActive: true,
        timestamp: 10000 // Use fixed timestamps to create distinct IDs
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
    });
  });
});