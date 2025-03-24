/**
 * Admin Authentication Routes
 * 
 * This module registers admin-specific authentication routes for the Express server.
 * These routes handle admin login, MFA verification, and session management.
 */
import { Request, Response, NextFunction, Express } from 'express';
import { adminDb, verifyAuth } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

// Admin login audit middleware
export const adminLoginAudit = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify authentication first
    verifyAuth(req, res, async () => {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Update login timestamp in admin_users collection
      await adminDb.collection('admin_users').doc(uid).update({
        lastLoginAt: Timestamp.now()
      });
      
      // Log login attempt in admin_login_history collection
      await adminDb.collection('admin_login_history').add({
        adminId: uid,
        timestamp: Timestamp.now(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        successful: true
      });
      
      next();
    });
  } catch (error) {
    console.error('Error in admin login audit:', error);
    // Continue to next middleware even if audit fails
    next();
  }
};

// Verify MFA status for admin user
export const verifyAdminMfa = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify auth and admin role first
    verifyAuth(req, res, async () => {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get admin user document
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists) {
        return res.status(403).json({ 
          error: 'Forbidden: Not an administrator',
          requiresSetup: true
        });
      }
      
      const adminData = adminDoc.data();
      
      // Check if MFA is enabled
      if (!adminData?.mfaEnabled) {
        return res.status(403).json({ 
          error: 'MFA required for admin access',
          requiresMfa: true,
          requiresSetup: true
        });
      }
      
      // Admin is authenticated and MFA is verified
      next();
    });
  } catch (error) {
    console.error('Error verifying admin MFA:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Check if IP address is whitelisted
export const checkIpWhitelist = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get client IP address
    const clientIp = req.ip || '';
    
    // Skip IP check if in development mode
    if (process.env.NODE_ENV === 'development') {
      return next();
    }
    
    // Get whitelist settings
    const settingsDoc = await adminDb.collection('admin_settings').doc('ip_whitelist').get();
    
    // If whitelist doesn't exist or is not enabled, allow access
    if (!settingsDoc.exists || !settingsDoc.data()?.enabled) {
      return next();
    }
    
    const settings = settingsDoc.data();
    const whitelist = settings?.whitelist || [];
    
    // Check if IP is in whitelist
    const isWhitelisted = whitelist.some((entry: string) => {
      // Exact match
      if (entry === clientIp) return true;
      
      // CIDR notation match (simplified)
      if (entry.includes('/')) {
        // For now just check prefix
        const prefix = entry.split('/')[0];
        return clientIp.startsWith(prefix);
      }
      
      return false;
    });
    
    if (!isWhitelisted) {
      // Log blocked access attempt
      await adminDb.collection('admin_security_logs').add({
        type: 'ip_blocked',
        ipAddress: clientIp,
        timestamp: Timestamp.now(),
        userAgent: req.headers['user-agent'] || 'unknown'
      });
      
      return res.status(403).json({ error: 'Access denied from this IP address' });
    }
    
    // IP is whitelisted, continue
    next();
  } catch (error) {
    console.error('Error checking IP whitelist:', error);
    // Continue if there's an error checking the whitelist
    next();
  }
};

/**
 * Register admin authentication routes
 */
export function registerAdminAuthRoutes(app: Express) {
  /**
   * Special Route: Initialize Super Admin Account
   * WARNING: This route is only for development and testing purposes.
   * It should be removed or protected in production.
   */
  app.post('/api/init-super-admin', async (req: Request, res: Response) => {
    try {
      // Only allow in development to prevent accidental use in production
      if (process.env.NODE_ENV === 'production') {
        console.warn("Attempt to call init-super-admin endpoint in production");
        return res.status(403).json({ 
          error: 'Forbidden',
          message: 'This endpoint is only available in development mode'
        });
      }

      const { email, firstName, lastName, password } = req.body;

      if (!email || !firstName || !lastName || !password) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'Missing required fields'
        });
      }

      console.log(`Creating initial Super Admin account for ${email}...`);
      
      // Import Auth from firebase-admin
      const { getAuth } = await import('firebase-admin/auth');
      const adminAuth = getAuth();
      
      // Check if user already exists in Auth
      let userRecord;
      try {
        userRecord = await adminAuth.getUserByEmail(email);
        console.log(`User ${email} already exists with UID: ${userRecord.uid}`);
      } catch (error) {
        // User doesn't exist, create new user
        userRecord = await adminAuth.createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
          emailVerified: true // Auto-verify for Super Admin
        });
        console.log(`Created new user ${email} with UID: ${userRecord.uid}`);
      }
      
      // Set custom claims for SUPER_ADMIN role
      await adminAuth.setCustomUserClaims(userRecord.uid, {
        role: 'admin',
        adminRole: 'SUPER_ADMIN',
        isAdmin: true
      });
      console.log(`Set custom claims for user ${email}`);
      
      // Create or update admin profile
      const adminProfileRef = adminDb.collection('admin_profiles').doc(userRecord.uid);
      const adminProfileDoc = await adminProfileRef.get();
      
      const now = Timestamp.now();
      
      if (adminProfileDoc.exists) {
        // Update existing profile
        await adminProfileRef.update({
          firstName,
          lastName,
          email,
          role: 'SUPER_ADMIN',
          department: 'Executive',
          position: 'CEO',
          status: 'active',
          updatedAt: now
        });
        console.log(`Updated existing admin profile for ${email}`);
      } else {
        // Create new admin profile
        await adminProfileRef.set({
          firstName,
          lastName,
          email,
          role: 'SUPER_ADMIN',
          department: 'Executive',
          position: 'CEO',
          status: 'active',
          approved: true,
          approvedBy: 'system',
          approvedAt: now,
          createdAt: now,
          updatedAt: now,
          mfaRequired: true,
          mfaSetup: false
        });
        console.log(`Created new admin profile for ${email}`);
      }
      
      // Create verification document
      const verificationRef = adminDb.collection('admin_verifications').doc(userRecord.uid);
      const verificationDoc = await verificationRef.get();
      
      if (!verificationDoc.exists) {
        await verificationRef.set({
          userId: userRecord.uid,
          emailVerified: true,
          phoneVerified: false,
          createdAt: now,
          updatedAt: now
        });
        console.log(`Created verification document for ${email}`);
      }
      
      // Return success with user info
      return res.json({
        success: true,
        message: 'Super Admin account created successfully',
        user: {
          uid: userRecord.uid,
          email: userRecord.email,
          role: 'SUPER_ADMIN'
        }
      });
      
    } catch (error: any) {
      console.error('Error creating Super Admin account:', error);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: error.message || 'Failed to create Super Admin account'
      });
    }
  });
  /**
   * Admin login audit endpoint
   * Records successful login attempts and updates last login timestamp
   */
  app.post('/api/admin/login-audit', verifyAuth, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Update login timestamp in admin_users collection
      await adminDb.collection('admin_users').doc(uid).update({
        lastLoginAt: Timestamp.now()
      });
      
      // Log login attempt in admin_login_history collection
      await adminDb.collection('admin_login_history').add({
        adminId: uid,
        timestamp: Timestamp.now(),
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        successful: true
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error in admin login audit:', error);
      res.status(500).json({ error: 'Failed to record login audit' });
    }
  });

  /**
   * Check admin MFA status
   * Returns whether the admin user has MFA enabled
   */
  app.get('/api/admin/mfa-status', verifyAuth, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get admin user document
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      const adminData = adminDoc.data();
      
      res.json({
        mfaEnabled: !!adminData?.mfaEnabled,
        requiresSetup: !adminData?.mfaEnabled,
        phoneNumber: adminData?.phone || null
      });
    } catch (error) {
      console.error('Error checking MFA status:', error);
      res.status(500).json({ error: 'Failed to check MFA status' });
    }
  });

  /**
   * Update admin's last activity timestamp
   * Used to extend session timeout
   */
  app.post('/api/admin/activity', verifyAuth, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Update last activity timestamp
      await adminDb.collection('admin_users').doc(uid).update({
        lastActivityAt: Timestamp.now()
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating activity timestamp:', error);
      res.status(500).json({ error: 'Failed to update activity' });
    }
  });

  /**
   * Manage IP whitelist settings
   * Allows administrators to configure IP address restrictions
   */
  app.post('/api/admin/ip-whitelist', verifyAuth, async (req: Request, res: Response) => {
    try {
      const { enabled, whitelist } = req.body;
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Verify admin has sufficient permissions
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      const adminData = adminDoc.data();
      const hasPermission = adminData?.permissions?.includes('manage_security');
      
      if (!hasPermission) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }
      
      // Update whitelist settings
      await adminDb.collection('admin_settings').doc('ip_whitelist').set({
        enabled: !!enabled,
        whitelist: Array.isArray(whitelist) ? whitelist : [],
        updatedAt: Timestamp.now(),
        updatedBy: uid
      });
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating IP whitelist:', error);
      res.status(500).json({ error: 'Failed to update IP whitelist' });
    }
  });

  /**
   * Get IP whitelist settings
   */
  app.get('/api/admin/ip-whitelist', verifyAuth, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get whitelist settings
      const settingsDoc = await adminDb.collection('admin_settings').doc('ip_whitelist').get();
      
      if (!settingsDoc.exists) {
        return res.json({
          enabled: false,
          whitelist: []
        });
      }
      
      const settings = settingsDoc.data();
      
      res.json({
        enabled: !!settings?.enabled,
        whitelist: settings?.whitelist || []
      });
    } catch (error) {
      console.error('Error getting IP whitelist:', error);
      res.status(500).json({ error: 'Failed to get IP whitelist' });
    }
  });
}