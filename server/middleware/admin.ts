/**
 * Admin Authentication Middleware
 *
 * This middleware verifies that the authenticated user has the appropriate admin role.
 * It should be used after the verifyAuth middleware to ensure the user is authenticated.
 */
import { Request, Response, NextFunction } from 'express';
import { adminDb } from '../firebase-admin';

// Define the admin roles types
type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'FINANCE_ADMIN' | 'SUPPORT_ADMIN';

/**
 * Middleware factory to verify admin roles
 * @param roles Array of roles that are allowed to access the route
 * @returns Middleware function that will check if the user has the required role
 */
export function verifyAdminRole(roles: AdminRole[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Make sure user is authenticated first
      if (!req.user || !req.user.uid) {
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }
      
      // Get the user's admin profile from Firestore
      const adminProfileDoc = await adminDb.collection('admin_profiles').doc(req.user.uid).get();
      
      // If the admin profile doesn't exist, return forbidden
      if (!adminProfileDoc.exists) {
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      const adminProfile = adminProfileDoc.data();
      
      // Verify that the admin profile is active and has the required role
      if (!adminProfile.isActive) {
        return res.status(403).json({ error: 'Forbidden: Admin account is inactive' });
      }
      
      // Check if the user has any of the allowed roles
      if (!roles.includes(adminProfile.role)) {
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          details: `Required role(s): ${roles.join(', ')}, Current role: ${adminProfile.role}`
        });
      }
      
      // Add admin profile to the request for use in route handlers
      (req as any).adminProfile = adminProfile;
      
      // Continue to the next middleware/route handler
      next();
    } catch (error) {
      console.error('Admin verification error:', error);
      return res.status(500).json({ error: 'Server error during admin verification' });
    }
  };
}

/**
 * Specific middleware for Super Admin access
 */
export const verifySuperAdmin = verifyAdminRole(['SUPER_ADMIN']);

/**
 * Specific middleware for any admin access (Super Admin or regular Admin)
 */
export const verifyAnyAdmin = verifyAdminRole(['SUPER_ADMIN', 'ADMIN']);

/**
 * Specific middleware for finance admin access
 */
export const verifyFinanceAdmin = verifyAdminRole(['SUPER_ADMIN', 'FINANCE_ADMIN']);

/**
 * Specific middleware for support admin access
 */
export const verifySupportAdmin = verifyAdminRole(['SUPER_ADMIN', 'ADMIN', 'SUPPORT_ADMIN']);