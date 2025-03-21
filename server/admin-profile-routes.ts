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
  try {
    // Verify authentication first
    verifyAuth(req, res, async () => {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Get admin user document
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists) {
        return res.status(403).json({ error: 'Forbidden - not an administrator' });
      }
      
      const adminData = adminDoc.data();
      
      // Check approval status
      if (adminData?.status !== 'active') {
        return res.status(403).json({ 
          error: 'Forbidden - admin account not active',
          status: adminData?.status
        });
      }
      
      // Admin is verified, continue
      next();
    });
  } catch (error) {
    console.error('Error verifying admin role:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
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
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Check if user already has an admin profile
      const existingProfile = await adminDb.collection('admin_users').doc(uid).get();
      
      if (existingProfile.exists) {
        return res.status(409).json({ error: 'Admin profile already exists' });
      }
      
      const { 
        fullName, 
        phone, 
        jobTitle, 
        department,
        invitationCode 
      } = req.body;
      
      // Validate required fields
      if (!fullName || !phone || !invitationCode) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Verify invitation code
      const inviteSnapshot = await adminDb.collection('admin_invitations')
        .where('code', '==', invitationCode)
        .where('status', '==', 'pending')
        .get();
      
      if (inviteSnapshot.empty) {
        return res.status(400).json({ error: 'Invalid or expired invitation code' });
      }
      
      const inviteDoc = inviteSnapshot.docs[0];
      const inviteData = inviteDoc.data();
      
      // Create admin profile
      await adminDb.collection('admin_users').doc(uid).set({
        uid,
        fullName,
        phone,
        jobTitle: jobTitle || '',
        department: department || '',
        email: req.user?.email || '',
        role: inviteData.role || 'admin',
        permissions: inviteData.permissions || [],
        status: 'pending_approval', // Needs approval before becoming active
        invitedBy: inviteData.createdBy,
        mfaEnabled: false,
        mfaVerified: false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now()
      });
      
      // Update invitation status
      await adminDb.collection('admin_invitations').doc(inviteDoc.id).update({
        status: 'used',
        usedBy: uid,
        usedAt: Timestamp.now()
      });
      
      // Create approval request
      await adminDb.collection('admin_approval_requests').add({
        adminId: uid,
        fullName,
        email: req.user?.email || '',
        role: inviteData.role || 'admin',
        status: 'pending',
        invitedBy: inviteData.createdBy,
        createdAt: Timestamp.now()
      });
      
      res.status(201).json({ 
        success: true,
        message: 'Admin profile created and awaiting approval'
      });
    } catch (error) {
      console.error('Error creating admin profile:', error);
      res.status(500).json({ error: 'Failed to create admin profile' });
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
      
      // Get admin user document
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists) {
        return res.status(404).json({ error: 'Admin profile not found' });
      }
      
      // Return profile data (excluding sensitive fields)
      const adminData = adminDoc.data();
      
      // Filter out sensitive data
      delete adminData.mfaSecret;
      
      res.json(adminData);
    } catch (error) {
      console.error('Error getting admin profile:', error);
      res.status(500).json({ error: 'Failed to get admin profile' });
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
      
      const { 
        fullName, 
        phone, 
        jobTitle, 
        department 
      } = req.body;
      
      // Validate required fields
      if (!fullName || !phone) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      // Update profile
      await adminDb.collection('admin_users').doc(uid).update({
        fullName,
        phone,
        jobTitle: jobTitle || '',
        department: department || '',
        updatedAt: Timestamp.now()
      });
      
      res.json({ 
        success: true,
        message: 'Profile updated successfully'
      });
    } catch (error) {
      console.error('Error updating admin profile:', error);
      res.status(500).json({ error: 'Failed to update admin profile' });
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
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Verify super admin role
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists || adminDoc.data().role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden - requires super admin privileges' });
      }
      
      // Get pending approval requests
      const approvalSnapshot = await adminDb.collection('admin_approval_requests')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();
      
      const pendingApprovals = approvalSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      res.json(pendingApprovals);
    } catch (error) {
      console.error('Error getting pending approvals:', error);
      res.status(500).json({ error: 'Failed to get pending approvals' });
    }
  });

  /**
   * Approve or reject admin account
   * Allows super admins to approve or reject pending admin accounts
   */
  app.post('/api/admin/process-approval', verifyAdminRole, async (req: Request, res: Response) => {
    try {
      const uid = req.user?.uid;
      
      if (!uid) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      // Verify super admin role
      const adminDoc = await adminDb.collection('admin_users').doc(uid).get();
      
      if (!adminDoc.exists || adminDoc.data().role !== 'super_admin') {
        return res.status(403).json({ error: 'Forbidden - requires super admin privileges' });
      }
      
      const { approvalId, adminId, action, notes } = req.body;
      
      // Validate required fields
      if (!approvalId || !adminId || !action) {
        return res.status(400).json({ error: 'Missing required fields' });
      }
      
      if (action !== 'approve' && action !== 'reject') {
        return res.status(400).json({ error: 'Invalid action' });
      }
      
      // Get the approval request
      const approvalDoc = await adminDb.collection('admin_approval_requests').doc(approvalId).get();
      
      if (!approvalDoc.exists) {
        return res.status(404).json({ error: 'Approval request not found' });
      }
      
      if (approvalDoc.data().status !== 'pending') {
        return res.status(409).json({ error: 'Approval request already processed' });
      }
      
      // Get the admin user
      const targetAdminDoc = await adminDb.collection('admin_users').doc(adminId).get();
      
      if (!targetAdminDoc.exists) {
        return res.status(404).json({ error: 'Admin user not found' });
      }
      
      // Update approval request
      await adminDb.collection('admin_approval_requests').doc(approvalId).update({
        status: action === 'approve' ? 'approved' : 'rejected',
        processedBy: uid,
        processedAt: Timestamp.now(),
        notes: notes || ''
      });
      
      // Update admin user status
      await adminDb.collection('admin_users').doc(adminId).update({
        status: action === 'approve' ? 'active' : 'rejected',
        updatedAt: Timestamp.now()
      });
      
      // Log the approval action
      await adminDb.collection('admin_logs').add({
        action: `admin_${action}`,
        performedBy: uid,
        targetAdminId: adminId,
        timestamp: Timestamp.now(),
        details: {
          approvalId,
          notes: notes || ''
        }
      });
      
      res.json({ 
        success: true,
        message: `Admin account ${action === 'approve' ? 'approved' : 'rejected'} successfully`
      });
    } catch (error) {
      console.error('Error processing admin approval:', error);
      res.status(500).json({ error: 'Failed to process admin approval' });
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
      
      const { phone, verificationCode, mfaEnabled } = req.body;
      
      // For now, just simulate MFA setup
      // In a real implementation, this would verify the OTP and set up MFA

      // Update admin profile to mark MFA as set up
      await adminDb.collection('admin_users').doc(uid).update({
        phone: phone || null,
        mfaEnabled: !!mfaEnabled,
        mfaVerified: !!mfaEnabled,
        updatedAt: Timestamp.now()
      });
      
      res.json({ 
        success: true,
        message: 'MFA setup completed successfully'
      });
    } catch (error) {
      console.error('Error setting up MFA:', error);
      res.status(500).json({ error: 'Failed to set up MFA' });
    }
  });
}