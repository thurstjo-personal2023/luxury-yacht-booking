import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getFirestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { db, auth, functions } from './firebase';

// Admin registration router
const router = Router();

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
    
    // Call Firebase function to validate token
    const validateInvitation = httpsCallable(functions, 'validateInvitation');
    const result = await validateInvitation({ token });
    
    // Return validation result
    return res.json(result.data);
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
    const invitationsRef = collection(db, 'admin_invitations');
    const q = query(invitationsRef, where('token', '==', invitationToken), where('used', '==', false));
    const invitationSnapshot = await getDocs(q);
    
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
    const adminProfileRef = doc(db, 'admin_profiles', uid);
    await setDoc(adminProfileRef, {
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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
    
    // Call Firebase function to complete registration
    const completeInvitation = httpsCallable(functions, 'completeInvitationRegistration');
    const result = await completeInvitation({ token });
    
    // Return result
    return res.json(result.data);
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
    const adminProfileRef = doc(db, 'admin_profiles', uid);
    const adminProfileDoc = await getDoc(adminProfileRef);
    
    if (!adminProfileDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
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
    const willEmailBeVerified = emailVerified !== undefined ? emailVerified : currentData.isEmailVerified;
    const willPhoneBeVerified = isPhoneVerified !== undefined ? isPhoneVerified : currentData.isPhoneVerified;
    
    // If both are verified, update status and create approval request
    if (willEmailBeVerified && willPhoneBeVerified && currentData.status === 'pending_verification') {
      updateData.status = 'pending_approval';
      
      // Create approval request
      const approvalRef = doc(collection(db, 'admin_approval_requests'));
      await setDoc(approvalRef, {
        adminId: uid,
        adminEmail: currentData.email,
        adminName: `${currentData.firstName} ${currentData.lastName}`,
        adminDepartment: currentData.department,
        adminPosition: currentData.position,
        status: 'pending',
        requestedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
    
    // Update admin profile
    await updateDoc(adminProfileRef, updateData);
    
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
    const adminProfileRef = doc(db, 'admin_profiles', uid);
    const adminProfileDoc = await getDoc(adminProfileRef);
    
    if (!adminProfileDoc.exists()) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
      });
    }
    
    const adminProfile = adminProfileDoc.data();
    
    // Convert Firestore timestamps to ISO strings
    const profileWithFormattedDates: Record<string, any> = {};
    for (const [key, value] of Object.entries(adminProfile)) {
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
    const approvalsRef = collection(db, 'admin_approval_requests');
    const q = query(approvalsRef, where('adminId', '==', uid));
    const approvalSnapshot = await getDocs(q);
    
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

export default router;