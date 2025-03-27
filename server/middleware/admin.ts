/**
 * Admin Authentication Middleware
 *
 * This middleware verifies that the authenticated user has the appropriate admin role.
 * It should be used after the verifyAuth middleware to ensure the user is authenticated.
 */
import { Request, Response, NextFunction } from 'express';
import { adminDb } from '../firebase-admin';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

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
      console.log(`[ADMIN MIDDLEWARE] Verifying admin access for roles: ${roles.join(', ')}`);
      
      // Make sure user is authenticated first
      if (!req.user || !req.user.uid) {
        console.log('[ADMIN MIDDLEWARE] Authentication required - no user found in request');
        return res.status(401).json({ error: 'Unauthorized: Authentication required' });
      }
      
      console.log(`[ADMIN MIDDLEWARE] Checking admin profile for user: ${req.user.uid}`);
      
      // Get the user's admin profile from Firestore
      const adminProfileDoc = await adminDb.collection('admin_profiles').doc(req.user.uid).get();
      
      // If the admin profile doesn't exist, return forbidden
      if (!adminProfileDoc.exists) {
        console.log(`[ADMIN MIDDLEWARE] No admin profile found for user: ${req.user.uid}`);
        return res.status(403).json({ error: 'Forbidden: Admin access required' });
      }
      
      const adminProfile = adminProfileDoc.data();
      
      if (!adminProfile) {
        console.log(`[ADMIN MIDDLEWARE] Admin profile exists but data is empty for user: ${req.user.uid}`);
        return res.status(403).json({ error: 'Forbidden: Invalid admin profile' });
      }
      
      console.log(`[ADMIN MIDDLEWARE] Found admin profile with role: ${adminProfile.role}`);
      
      // Special case: SUPER_ADMIN always has access to everything
      // Check role first before checking isActive status
      if (adminProfile.role === 'SUPER_ADMIN') {
        console.log('[ADMIN MIDDLEWARE] SUPER_ADMIN detected - granting access to all admin routes');
        
        // Important: If the account is inactive, automatically activate it for SUPER_ADMIN
        if (!adminProfile.isActive) {
          console.log(`[ADMIN MIDDLEWARE] Auto-activating inactive SUPER_ADMIN account: ${req.user.uid}`);
          try {
            await adminDb.collection('admin_profiles').doc(req.user.uid).update({
              isActive: true,
              updatedAt: FieldValue.serverTimestamp()
            });
            // Update the local copy after the change
            adminProfile.isActive = true;
          } catch (updateError) {
            console.error('[ADMIN MIDDLEWARE] Error activating SUPER_ADMIN account:', updateError);
            // Continue anyway - we'll grant access even if the update fails
          }
        }
        
        // Add admin profile to the request for use in route handlers
        (req as any).adminProfile = adminProfile;
        return next();
      }
      
      // For non-SUPER_ADMIN roles, verify that the admin profile is active
      if (!adminProfile.isActive) {
        console.log(`[ADMIN MIDDLEWARE] Admin account is inactive: ${req.user.uid}`);
        return res.status(403).json({ error: 'Forbidden: Admin account is inactive' });
      }
      
      // For all other roles, check if the user has any of the allowed roles
      if (!roles.includes(adminProfile.role)) {
        console.log(`[ADMIN MIDDLEWARE] Permission denied - User role: ${adminProfile.role}, Required: ${roles.join(', ')}`);
        return res.status(403).json({ 
          error: 'Forbidden: Insufficient permissions',
          details: `Required role(s): ${roles.join(', ')}, Current role: ${adminProfile.role}`
        });
      }
      
      console.log(`[ADMIN MIDDLEWARE] Access granted for user ${req.user.uid} with role ${adminProfile.role}`);
      
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