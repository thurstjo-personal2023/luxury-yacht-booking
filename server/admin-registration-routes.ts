import { Router, Request, Response, Express } from 'express';
import { z } from 'zod';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Import Firebase Admin SDK resources
import { adminDb, adminAuth, verifyAuth, verifyAdminRole, verifySuperAdminRole } from './firebase-admin';

// Import TOTP utilities
import { 
  generateTotpSecret, 
  generateBackupCodes, 
  verifyTotpToken, 
  hashBackupCode 
} from './utils/totp-utils';

// Admin registration router
const router = Router();

/**
 * Register admin registration routes
 * @param app Express application
 */
export function registerAdminRegistrationRoutes(app: Express): void {
  // Register all routes
  app.use(router);
  
  console.log('Admin registration routes registered');
}

// Validate invitation token
router.post('/api/admin/validate-invitation', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        message: 'Invitation token is required',
      });
    }
    
    // Direct validation of invitation token using admin SDK
    const invitationsRef = adminDb.collection('admin_invitations');
    const invitationQuery = invitationsRef.where('token', '==', token).where('used', '==', false);
    const invitationSnapshot = await invitationQuery.get();
    
    if (invitationSnapshot.empty) {
      return res.json({
        valid: false,
        message: 'Invalid or already used invitation token',
      });
    }
    
    const invitationDoc = invitationSnapshot.docs[0];
    const invitation = invitationDoc.data();
    
    // Check expiration
    const expiresAt = invitation.expiresAt?.toDate?.() || null;
    const now = new Date();
    
    if (expiresAt && now > expiresAt) {
      return res.json({
        valid: false,
        message: 'Invitation token has expired',
      });
    }
    
    // Return validation result
    return res.json({
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role || 'admin',
        expiresAt: expiresAt ? expiresAt.toISOString() : null,
        department: invitation.department || '',
        invitedBy: invitation.createdBy || '',
      }
    });
  } catch (error: any) {
    console.error('Error validating invitation:', error);
    return res.status(500).json({
      valid: false,
      message: error.message || 'Failed to validate invitation',
    });
  }
});

// Create admin profile
router.post('/api/admin/create-profile', async (req: Request, res: Response) => {
  try {
    const { uid, firstName, lastName, email, employeeId, department, position, invitationToken, role } = req.body;
    
    if (!uid || !firstName || !lastName || !email || !employeeId || !department || !position || !invitationToken) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    // Validate profile schema
    const profileSchema = z.object({
      uid: z.string(),
      firstName: z.string().min(2),
      lastName: z.string().min(2),
      email: z.string().email(),
      employeeId: z.string().min(2),
      department: z.string().min(1),
      position: z.string().min(1),
      invitationToken: z.string(),
      role: z.string().optional(),
    });
    
    try {
      profileSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        message: 'Invalid profile data',
        errors: validationError.errors,
      });
    }
    
    // Find the invitation to get its details
    const invitationsRef = adminDb.collection('admin_invitations');
    const invitationQuery = invitationsRef.where('token', '==', invitationToken).where('used', '==', false);
    const invitationSnapshot = await invitationQuery.get();
    
    if (invitationSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used invitation',
      });
    }
    
    const invitationDoc = invitationSnapshot.docs[0];
    const invitation = invitationDoc.data();
    
    // Check if invitation email matches registration email
    if (invitation.email !== email) {
      return res.status(400).json({
        success: false,
        message: 'Email does not match invitation',
      });
    }
    
    // Create admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(uid);
    await adminProfileRef.set({
      uid,
      firstName,
      lastName,
      email,
      employeeId,
      department,
      position,
      role: role || invitation.role || 'admin',
      invitationId: invitationDoc.id,
      invitedBy: invitation.createdBy,
      status: 'pending_verification',
      approvalStatus: 'pending',
      isEmailVerified: false,
      isPhoneVerified: false,
      mfaEnabled: false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return res.json({
      success: true,
      message: 'Admin profile created successfully',
    });
  } catch (error: any) {
    console.error('Error creating admin profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create admin profile',
    });
  }
});

// Complete invitation registration (mark as used)
router.post('/api/admin/complete-invitation', async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Invitation token is required',
      });
    }
    
    // Find the invitation
    const invitationsRef = adminDb.collection('admin_invitations');
    const invitationQuery = invitationsRef.where('token', '==', token).where('used', '==', false);
    const invitationSnapshot = await invitationQuery.get();
    
    if (invitationSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used invitation',
      });
    }
    
    // Mark invitation as used
    const invitationDoc = invitationSnapshot.docs[0];
    await invitationDoc.ref.update({
      used: true,
      usedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return res.json({
      success: true,
      message: 'Invitation marked as used successfully',
    });
  } catch (error: any) {
    console.error('Error completing invitation registration:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to complete registration',
    });
  }
});

// Update verification status
router.post('/api/admin/update-verification-status', async (req: Request, res: Response) => {
  try {
    const { uid, emailVerified, isPhoneVerified, phoneNumber } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
    
    // Get admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(uid);
    const adminProfileDoc = await adminProfileRef.get();
    
    if (!adminProfileDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const updateData: Record<string, any> = {
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // Update email verification status if provided
    if (emailVerified !== undefined) {
      updateData.isEmailVerified = emailVerified;
    }
    
    // Update phone verification status if provided
    if (isPhoneVerified !== undefined) {
      updateData.isPhoneVerified = isPhoneVerified;
      
      if (phoneNumber) {
        updateData.phoneNumber = phoneNumber;
      }
    }
    
    // Check if both email and phone are verified
    const currentData = adminProfileDoc.data();
    const willEmailBeVerified = emailVerified !== undefined ? emailVerified : currentData?.isEmailVerified;
    const willPhoneBeVerified = isPhoneVerified !== undefined ? isPhoneVerified : currentData?.isPhoneVerified;
    
    // If both are verified, update status and create approval request
    if (willEmailBeVerified && willPhoneBeVerified && currentData?.status === 'pending_verification') {
      updateData.status = 'pending_approval';
      
      // Create approval request
      const approvalRef = adminDb.collection('admin_approval_requests').doc();
      await approvalRef.set({
        adminId: uid,
        adminEmail: currentData.email,
        adminName: `${currentData.firstName} ${currentData.lastName}`,
        adminDepartment: currentData.department,
        adminPosition: currentData.position,
        status: 'pending',
        requestedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    }
    
    // Update admin profile
    await adminProfileRef.update(updateData);
    
    return res.json({
      success: true,
      message: 'Verification status updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating verification status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update verification status',
    });
  }
});

// Update MFA status
router.post('/api/admin/update-mfa-status', async (req: Request, res: Response) => {
  try {
    const { uid, isMfaEnabled } = req.body;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
    
    // Get admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(uid);
    const adminProfileDoc = await adminProfileRef.get();
    
    if (!adminProfileDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const adminProfile = adminProfileDoc.data();
    
    // Update MFA status
    const updateData: Record<string, any> = {
      mfaEnabled: isMfaEnabled === true,
      updatedAt: FieldValue.serverTimestamp(),
    };
    
    // If MFA is now enabled, add timestamp and check if the registration is now complete
    if (isMfaEnabled === true) {
      updateData.mfaEnabledAt = FieldValue.serverTimestamp();
      
      // Check if the admin has been approved and has verified email and phone
      if (adminProfile?.approvalStatus === 'approved' && 
          adminProfile?.isEmailVerified === true && 
          adminProfile?.isPhoneVerified === true) {
        updateData.status = 'active';
        updateData.registrationComplete = true;
      }
    }
    
    // Update admin profile
    await adminProfileRef.update(updateData);
    
    // If registration is now complete, update harmonized user record
    if (updateData.registrationComplete) {
      // Get harmonized user record
      const harmonizedUserRef = adminDb.collection('harmonized_users').doc(uid);
      const harmonizedUserDoc = await harmonizedUserRef.get();
      
      if (harmonizedUserDoc.exists) {
        // Update harmonized user record
        await harmonizedUserRef.update({
          adminStatus: 'active',
          mfaEnabled: true,
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create harmonized user record if it doesn't exist
        // This is a fallback and shouldn't normally happen at this stage
        await harmonizedUserRef.set({
          id: uid,
          userId: uid,
          name: `${adminProfile?.firstName || ''} ${adminProfile?.lastName || ''}`.trim(),
          email: adminProfile?.email || '',
          phone: adminProfile?.phoneNumber || '',
          role: 'admin',
          isAdmin: true,
          adminRole: adminProfile?.role?.toUpperCase() || 'ADMIN',
          adminStatus: 'active',
          adminDepartment: adminProfile?.department || '',
          adminPosition: adminProfile?.position || '',
          mfaEnabled: true,
          emailVerified: true,
          points: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    
    return res.json({
      success: true,
      message: 'MFA status updated successfully',
      mfaEnabled: isMfaEnabled === true,
      registrationComplete: !!updateData.registrationComplete,
    });
  } catch (error: any) {
    console.error('Error updating MFA status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to update MFA status',
    });
  }
});

// Get admin profile
router.get('/api/admin/profile/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
    
    // Get admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(uid);
    const adminProfileDoc = await adminProfileRef.get();
    
    if (!adminProfileDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const adminProfile = adminProfileDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const profileWithFormattedDates: Record<string, any> = {};
    for (const [key, value] of Object.entries(adminProfile || {})) {
      if (value instanceof Timestamp) {
        profileWithFormattedDates[key] = value.toDate().toISOString();
      } else {
        profileWithFormattedDates[key] = value;
      }
    }
    
    return res.json(profileWithFormattedDates);
  } catch (error: any) {
    console.error('Error getting admin profile:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get admin profile',
    });
  }
});

// Get approval status
router.get('/api/admin/approval-status/:uid', async (req: Request, res: Response) => {
  try {
    const { uid } = req.params;
    
    if (!uid) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
      });
    }
    
    // Find approval request
    const approvalsRef = adminDb.collection('admin_approval_requests');
    const approvalQuery = approvalsRef.where('adminId', '==', uid);
    const approvalSnapshot = await approvalQuery.get();
    
    if (approvalSnapshot.empty) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found',
      });
    }
    
    const approvalDoc = approvalSnapshot.docs[0];
    const approval = approvalDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const result: Record<string, any> = {
      id: approvalDoc.id,
      status: approval.status,
    };
    
    for (const [key, value] of Object.entries(approval)) {
      if (value instanceof Timestamp) {
        result[key] = value.toDate().toISOString();
      } else if (key !== 'status') { // Status already added
        result[key] = value;
      }
    }
    
    return res.json(result);
  } catch (error: any) {
    console.error('Error getting approval status:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get approval status',
    });
  }
});

// Create admin invitation (requires super admin)
router.post('/api/admin/create-invitation', verifyAuth, verifySuperAdminRole, async (req: Request, res: Response) => {
  try {
    const { email, role, department, expirationDays = 7 } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    // Validate schema
    const invitationSchema = z.object({
      email: z.string().email(),
      role: z.enum(['admin', 'super_admin', 'moderator']).default('admin'),
      department: z.string().optional(),
      expirationDays: z.number().min(1).max(30).default(7),
    });
    
    try {
      invitationSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invitation data',
        errors: validationError.errors,
      });
    }
    
    // Check if email already has an active invitation
    const invitationsRef = adminDb.collection('admin_invitations');
    const existingInvitationQuery = invitationsRef
      .where('email', '==', email)
      .where('used', '==', false);
    
    const existingInvitationSnapshot = await existingInvitationQuery.get();
    
    if (!existingInvitationSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'An active invitation already exists for this email',
      });
    }
    
    // Check if email already registered as an admin
    const adminProfilesRef = adminDb.collection('admin_profiles');
    const existingProfileQuery = adminProfilesRef.where('email', '==', email);
    const existingProfileSnapshot = await existingProfileQuery.get();
    
    if (!existingProfileSnapshot.empty) {
      return res.status(400).json({
        success: false,
        message: 'This email is already registered as an administrator',
      });
    }
    
    // Generate a secure invitation token
    const token = Buffer.from(Math.random().toString(36) + Date.now().toString(36)).toString('base64');
    
    // Calculate expiration date
    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(now.getDate() + expirationDays);
    
    // Create invitation
    const invitationRef = invitationsRef.doc();
    await invitationRef.set({
      email,
      role: role || 'admin',
      department: department || '',
      token,
      used: false,
      expiresAt: Timestamp.fromDate(expiresAt),
      createdBy: req.user?.uid,
      createdByName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'Unknown',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return res.json({
      success: true,
      message: 'Invitation created successfully',
      data: {
        id: invitationRef.id,
        email,
        token,
        expiresAt: expiresAt.toISOString(),
        invitationUrl: `${req.protocol}://${req.get('host')}/admin/register?token=${token}`,
      },
    });
  } catch (error: any) {
    console.error('Error creating invitation:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to create invitation',
    });
  }
});

// List pending admin approvals (requires super admin)
router.get('/api/admin/pending-approvals', verifyAuth, verifySuperAdminRole, async (req: Request, res: Response) => {
  try {
    // Get all pending approval requests
    const approvalsRef = adminDb.collection('admin_approval_requests');
    const approvalQuery = approvalsRef.where('status', '==', 'pending');
    const approvalSnapshot = await approvalQuery.get();
    
    const pendingApprovals: any[] = [];
    
    approvalSnapshot.forEach(doc => {
      const approval = doc.data();
      
      // Format dates
      const formattedApproval: Record<string, any> = {
        id: doc.id,
        ...approval,
      };
      
      // Convert Timestamps to ISO strings
      for (const [key, value] of Object.entries(formattedApproval)) {
        if (value instanceof Timestamp) {
          formattedApproval[key] = value.toDate().toISOString();
        }
      }
      
      pendingApprovals.push(formattedApproval);
    });
    
    return res.json(pendingApprovals);
  } catch (error: any) {
    console.error('Error getting pending approvals:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get pending approvals',
    });
  }
});

// List processed admin approvals (requires super admin)
router.get('/api/admin/processed-approvals', verifyAuth, verifySuperAdminRole, async (req: Request, res: Response) => {
  try {
    // Get all processed approval requests (approved or rejected)
    const approvalsRef = adminDb.collection('admin_approval_requests');
    const approvalQuery = approvalsRef.where('status', 'in', ['approved', 'rejected'])
      .orderBy('updatedAt', 'desc')
      .limit(50); // Limit to the most recent 50 processed approvals
      
    const approvalSnapshot = await approvalQuery.get();
    
    const processedApprovals: any[] = [];
    
    approvalSnapshot.forEach(doc => {
      const approval = doc.data();
      
      // Format the response
      const formattedApproval: Record<string, any> = {
        id: doc.id,
        ...approval,
      };
      
      // Convert timestamps to ISO strings
      for (const [key, value] of Object.entries(formattedApproval)) {
        if (value instanceof Timestamp) {
          formattedApproval[key] = value.toDate().toISOString();
        }
      }
      
      processedApprovals.push(formattedApproval);
    });
    
    return res.json(processedApprovals);
  } catch (error: any) {
    console.error('Error getting processed approvals:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get processed approvals',
    });
  }
});

// Set up MFA for admin account
router.post('/api/admin/setup-mfa', verifyAuth, async (req: Request, res: Response) => {
  try {
    const { uid, mfaVerified } = req.body;
    
    // Verify that the user calling this is the same as in the request
    if (req.user?.uid !== uid) {
      return res.status(403).json({
        success: false,
        message: 'You can only set up MFA for your own account',
      });
    }
    
    // Get admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(uid);
    const adminProfileDoc = await adminProfileRef.get();
    
    if (!adminProfileDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const adminProfile = adminProfileDoc.data();
    
    // Check if admin has been approved
    if (adminProfile?.approvalStatus !== 'approved') {
      return res.status(400).json({
        success: false,
        message: 'Admin account must be approved before setting up MFA',
        status: adminProfile?.approvalStatus,
      });
    }
    
    // Update MFA status
    await adminProfileRef.update({
      mfaEnabled: mfaVerified === true,
      status: mfaVerified === true ? 'active' : adminProfile?.status,
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    return res.json({
      success: true,
      message: 'MFA status updated successfully',
      mfaEnabled: mfaVerified === true,
    });
  } catch (error: any) {
    console.error('Error setting up MFA:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to set up MFA',
    });
  }
});

// Get admin stats (requires admin)
router.get('/api/admin/stats', verifyAuth, verifyAdminRole, async (req: Request, res: Response) => {
  try {
    // Get admin profile counts by status
    const adminProfilesRef = adminDb.collection('admin_profiles');
    
    // Get count of total admins
    const totalAdminsSnapshot = await adminProfilesRef.get();
    const totalAdmins = totalAdminsSnapshot.size;
    
    // Get count of active admins
    const activeAdminsQuery = adminProfilesRef.where('status', '==', 'active');
    const activeAdminsSnapshot = await activeAdminsQuery.get();
    const activeAdmins = activeAdminsSnapshot.size;
    
    // Get count of pending verification
    const pendingVerificationQuery = adminProfilesRef.where('status', '==', 'pending_verification');
    const pendingVerificationSnapshot = await pendingVerificationQuery.get();
    const pendingVerification = pendingVerificationSnapshot.size;
    
    // Get count of pending approval
    const pendingApprovalQuery = adminProfilesRef.where('status', '==', 'pending_approval');
    const pendingApprovalSnapshot = await pendingApprovalQuery.get();
    const pendingApproval = pendingApprovalSnapshot.size;
    
    // Get count of MFA required
    const mfaRequiredQuery = adminProfilesRef.where('status', '==', 'mfa_required');
    const mfaRequiredSnapshot = await mfaRequiredQuery.get();
    const mfaRequired = mfaRequiredSnapshot.size;
    
    // Get count of rejected
    const rejectedQuery = adminProfilesRef.where('status', '==', 'rejected');
    const rejectedSnapshot = await rejectedQuery.get();
    const rejected = rejectedSnapshot.size;
    
    // Get count by role
    const superAdminQuery = adminProfilesRef.where('role', '==', 'super_admin');
    const superAdminSnapshot = await superAdminQuery.get();
    const superAdmin = superAdminSnapshot.size;
    
    const adminQuery = adminProfilesRef.where('role', '==', 'admin');
    const adminSnapshot = await adminQuery.get();
    const admin = adminSnapshot.size;
    
    const moderatorQuery = adminProfilesRef.where('role', '==', 'moderator');
    const moderatorSnapshot = await moderatorQuery.get();
    const moderator = moderatorSnapshot.size;
    
    // Get invitations stats
    const invitationsRef = adminDb.collection('admin_invitations');
    
    // Get active invitations
    const activeInvitationsQuery = invitationsRef.where('used', '==', false);
    const activeInvitationsSnapshot = await activeInvitationsQuery.get();
    const activeInvitations = activeInvitationsSnapshot.size;
    
    // Get used invitations
    const usedInvitationsQuery = invitationsRef.where('used', '==', true);
    const usedInvitationsSnapshot = await usedInvitationsQuery.get();
    const usedInvitations = usedInvitationsSnapshot.size;
    
    return res.json({
      totalAdmins,
      activeAdmins,
      pendingVerification,
      pendingApproval,
      mfaRequired,
      rejected,
      byRole: {
        superAdmin,
        admin,
        moderator,
      },
      invitations: {
        active: activeInvitations,
        used: usedInvitations,
        total: activeInvitations + usedInvitations,
      },
    });
  } catch (error: any) {
    console.error('Error getting admin stats:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get admin stats',
    });
  }
});

// List all administrators (requires admin)
router.get('/api/admin/list', verifyAuth, verifyAdminRole, async (req: Request, res: Response) => {
  try {
    // Get all admin profiles
    const adminProfilesRef = adminDb.collection('admin_profiles');
    const adminProfilesSnapshot = await adminProfilesRef.get();
    
    const adminProfiles: any[] = [];
    
    adminProfilesSnapshot.forEach(doc => {
      const profile = doc.data();
      
      // Format dates
      const formattedProfile: Record<string, any> = {
        id: doc.id,
        ...profile,
      };
      
      // Convert Timestamps to ISO strings
      for (const [key, value] of Object.entries(formattedProfile)) {
        if (value instanceof Timestamp) {
          formattedProfile[key] = value.toDate().toISOString();
        }
      }
      
      adminProfiles.push(formattedProfile);
    });
    
    return res.json(adminProfiles);
  } catch (error: any) {
    console.error('Error listing administrators:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to list administrators',
    });
  }
});

// Process admin approval (requires super admin)
router.post('/api/admin/process-approval', verifyAuth, verifySuperAdminRole, async (req: Request, res: Response) => {
  try {
    const { approvalId, decision, notes } = req.body;
    
    if (!approvalId || !decision) {
      return res.status(400).json({
        success: false,
        message: 'Approval ID and decision are required',
      });
    }
    
    // Validate schema
    const approvalSchema = z.object({
      approvalId: z.string(),
      decision: z.enum(['approve', 'reject']),
      notes: z.string().optional(),
    });
    
    try {
      approvalSchema.parse(req.body);
    } catch (validationError: any) {
      return res.status(400).json({
        success: false,
        message: 'Invalid approval data',
        errors: validationError.errors,
      });
    }
    
    // Get approval request
    const approvalRef = adminDb.collection('admin_approval_requests').doc(approvalId);
    const approvalDoc = await approvalRef.get();
    
    if (!approvalDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Approval request not found',
      });
    }
    
    const approval = approvalDoc.data();
    
    // Check if already processed
    if (approval?.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Approval request already ${approval?.status}`,
      });
    }
    
    // Process the approval
    const isApproved = decision === 'approve';
    const newStatus = isApproved ? 'approved' : 'rejected';
    
    // Update approval request
    await approvalRef.update({
      status: newStatus,
      reviewedBy: req.user?.uid,
      reviewedByName: `${req.user?.firstName || ''} ${req.user?.lastName || ''}`.trim() || req.user?.email || 'Unknown',
      reviewNotes: notes || '',
      reviewedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // Update admin profile
    const adminProfileRef = adminDb.collection('admin_profiles').doc(approval.adminId);
    await adminProfileRef.update({
      approvalStatus: newStatus,
      status: isApproved ? 'mfa_required' : 'rejected',
      updatedAt: FieldValue.serverTimestamp(),
    });
    
    // If rejected, update the harmonized user to mark as rejected
    if (!isApproved) {
      const harmonizedUserRef = adminDb.collection('harmonized_users').doc(approval.adminId);
      const harmonizedUserDoc = await harmonizedUserRef.get();
      
      if (harmonizedUserDoc.exists) {
        await harmonizedUserRef.update({
          isAdmin: true,
          adminStatus: 'disabled',
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    
    // If approved, update Firebase Auth custom claims and harmonized user
    if (isApproved) {
      const adminProfileDoc = await adminProfileRef.get();
      const adminProfile = adminProfileDoc.data();
      
      // Set custom claims with role
      await adminAuth.setCustomUserClaims(approval.adminId, {
        role: adminProfile?.role || 'admin',
        isAdmin: true,
      });
      
      // Update harmonized user with admin fields
      const harmonizedUserRef = adminDb.collection('harmonized_users').doc(approval.adminId);
      const harmonizedUserDoc = await harmonizedUserRef.get();
      
      if (harmonizedUserDoc.exists) {
        await harmonizedUserRef.update({
          isAdmin: true,
          adminRole: adminProfile?.role?.toUpperCase() || 'ADMIN',
          adminStatus: 'active',
          adminDepartment: adminProfile?.department || '',
          adminPosition: adminProfile?.position || '',
          updatedAt: FieldValue.serverTimestamp(),
        });
      } else {
        // Create a new harmonized user record if it doesn't exist
        await harmonizedUserRef.set({
          id: approval.adminId,
          userId: approval.adminId,
          name: adminProfile?.firstName + ' ' + adminProfile?.lastName,
          email: adminProfile?.email || '',
          phone: adminProfile?.phoneNumber || '',
          role: 'admin',
          isAdmin: true,
          adminRole: adminProfile?.role?.toUpperCase() || 'ADMIN',
          adminStatus: 'active',
          adminDepartment: adminProfile?.department || '',
          adminPosition: adminProfile?.position || '',
          emailVerified: true,
          points: 0,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      }
    }
    
    return res.json({
      success: true,
      message: `Administrator ${isApproved ? 'approved' : 'rejected'} successfully`,
    });
  } catch (error: any) {
    console.error('Error processing approval:', error);
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to process approval',
    });
  }
});