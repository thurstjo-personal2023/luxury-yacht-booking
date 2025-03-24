import { Request, Response, NextFunction } from "express";
import { adminAuth, adminDb } from "../firebase-admin";

// Extend the Express Request type to include the user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email?: string | null;
        role?: string;
        adminRole?: string;
        [key: string]: any;
      };
    }
  }
}

/**
 * Middleware to verify the Firebase authentication token
 * This middleware checks if the user is authenticated and attaches the user ID to the request
 */
export async function verifyAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: No token provided',
    });
  }
  
  const token = authHeader.split('Bearer ')[1];
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email,
      role: decodedToken.role || 'consumer',
    };
    next();
  } catch (error: any) {
    console.error('Error verifying auth token:', error);
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid token',
      error: error.message,
    });
  }
}

/**
 * Middleware to verify the user has admin role
 * This middleware checks if the authenticated user has an admin role
 */
export async function verifyAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required',
    });
  }
  
  try {
    // Get the admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(req.user.uid);
    const adminProfile = await adminProfileRef.get();
    
    if (!adminProfile.exists) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin profile not found',
      });
    }
    
    const profileData = adminProfile.data();
    
    // Any admin role (admin, super_admin, moderator) can access
    if (!profileData?.role || !['admin', 'super_admin', 'moderator'].includes(profileData.role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Insufficient permissions',
      });
    }
    
    // Add admin role to the request for later use
    req.user.adminRole = profileData.role;
    
    next();
  } catch (error: any) {
    console.error('Error verifying admin role:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying permissions',
      error: error.message,
    });
  }
}

/**
 * Middleware to verify the user has super_admin role
 * This middleware checks if the authenticated user has a super_admin role
 */
export async function verifySuperAdminRole(req: Request, res: Response, next: NextFunction) {
  if (!req.user || !req.user.uid) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Authentication required',
    });
  }
  
  try {
    // Get the admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(req.user.uid);
    const adminProfile = await adminProfileRef.get();
    
    if (!adminProfile.exists) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Admin profile not found',
      });
    }
    
    const profileData = adminProfile.data();
    
    // Only super_admin can access
    if (!profileData?.role || profileData.role !== 'super_admin') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Super Admin privileges required',
      });
    }
    
    // Add admin role to the request for later use
    req.user.adminRole = profileData.role;
    
    next();
  } catch (error: any) {
    console.error('Error verifying super admin role:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while verifying permissions',
      error: error.message,
    });
  }
}