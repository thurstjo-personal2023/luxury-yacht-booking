/**
 * Admin Invitation Cloud Functions
 * 
 * These functions expose the admin invitation system via HTTP endpoints
 * and scheduled tasks.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { 
  generateAdminInvitation, 
  validateAdminInvitation, 
  markInvitationUsed 
} from './invitation';

// Verify if the user has Super Admin privileges
async function verifySuperAdmin(context: functions.https.CallableContext): Promise<boolean> {
  if (!context.auth) {
    return false;
  }

  try {
    const user = await admin.auth().getUser(context.auth.uid);
    const customClaims = user.customClaims || {};
    
    // Check if the user has the superAdmin claim
    return customClaims.role === 'superAdmin';
  } catch (error) {
    console.error('Error verifying super admin:', error);
    return false;
  }
}

/**
 * Cloud Function to generate an admin invitation
 * This function is only accessible to users with the superAdmin claim
 */
export const generateInvitation = functions.https.onCall(async (data, context) => {
  // Check if the user is a Super Admin
  const isSuperAdmin = await verifySuperAdmin(context);
  if (!isSuperAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Administrators can generate invitations'
    );
  }
  
  try {
    const { email, role, expiryDays } = data;
    
    if (!email) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Email is required'
      );
    }
    
    // Generate the invitation
    const invitation = await generateAdminInvitation(
      email,
      role || 'admin',
      expiryDays || 7
    );
    
    // Update the createdBy field
    if (context.auth) {
      await admin.firestore()
        .collection('admin_invitations')
        .doc(invitation.invitationId)
        .update({
          createdBy: context.auth.uid
        });
    }
    
    // Return successful response with invitation details
    return {
      success: true,
      invitation: {
        id: invitation.invitationId,
        token: invitation.token,
        email: invitation.email,
        role: invitation.role,
        createdAt: invitation.createdAt,
        expiresAt: invitation.expiresAt
      }
    };
  } catch (error: any) {
    console.error('Error generating invitation:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to generate invitation'
    );
  }
});

/**
 * Cloud Function to validate an admin invitation
 * This is a public function accessible to anyone with the token
 */
export const validateInvitation = functions.https.onCall(async (data, context) => {
  try {
    const { token } = data;
    
    if (!token) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Invitation token is required'
      );
    }
    
    // Validate the invitation
    const invitation = await validateAdminInvitation(token);
    
    if (!invitation) {
      return {
        valid: false,
        message: 'Invitation is invalid, expired, or has already been used'
      };
    }
    
    // Return successful response with minimal invitation details
    return {
      valid: true,
      invitation: {
        email: invitation.email,
        role: invitation.role,
        expiresAt: invitation.expiresAt
      }
    };
  } catch (error: any) {
    console.error('Error validating invitation:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to validate invitation'
    );
  }
});

/**
 * Cloud Function to list all active admin invitations
 * This function is only accessible to users with the superAdmin claim
 */
export const listInvitations = functions.https.onCall(async (data, context) => {
  // Check if the user is a Super Admin
  const isSuperAdmin = await verifySuperAdmin(context);
  if (!isSuperAdmin) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only Super Administrators can list invitations'
    );
  }
  
  try {
    const { status } = data || {};
    const db = admin.firestore();
    let query = db.collection('admin_invitations');
    
    // Filter by status if provided
    if (status === 'active') {
      query = query
        .where('used', '==', false)
        .where('expiresAt', '>', admin.firestore.Timestamp.now());
    } else if (status === 'used') {
      query = query.where('used', '==', true);
    } else if (status === 'expired') {
      query = query
        .where('used', '==', false)
        .where('expiresAt', '<', admin.firestore.Timestamp.now());
    }
    
    // Execute the query
    const snapshot = await query.get();
    
    // Map the results
    const invitations = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Return successful response
    return {
      success: true,
      invitations
    };
  } catch (error: any) {
    console.error('Error listing invitations:', error);
    
    throw new functions.https.HttpsError(
      'internal',
      error.message || 'Failed to list invitations'
    );
  }
});

/**
 * Development-only function to generate an admin invitation without authentication
 * Only available in development/testing environments
 */
export const devGenerateInvitation = functions
  .runWith({ 
    // Only deploy this function in development environments
    enforceAppCheck: false
  })
  .https.onRequest(async (req, res) => {
    // Check if we're in a development environment
    const isDevelopment = process.env.NODE_ENV === 'development' || 
                         process.env.FUNCTIONS_EMULATOR === 'true';
    
    if (!isDevelopment) {
      res.status(403).json({
        error: 'This endpoint is only available in development environments'
      });
      return;
    }
    
    try {
      const { email, role } = req.query;
      
      if (!email || typeof email !== 'string') {
        res.status(400).json({
          error: 'Email parameter is required'
        });
        return;
      }
      
      // Generate the invitation
      const invitation = await generateAdminInvitation(
        email,
        typeof role === 'string' ? role : 'admin'
      );
      
      // Construct the invitation URL for the frontend
      const inviteUrl = `${req.protocol}://${req.get('host')}/admin/register?token=${invitation.token}`;
      
      // Return successful response with invitation details and URL
      res.json({
        success: true,
        invitation: {
          id: invitation.invitationId,
          token: invitation.token,
          email: invitation.email,
          role: invitation.role,
          createdAt: invitation.createdAt,
          expiresAt: invitation.expiresAt
        },
        inviteUrl
      });
    } catch (error: any) {
      console.error('Error generating development invitation:', error);
      
      res.status(500).json({
        error: error.message || 'Failed to generate invitation'
      });
    }
  });

// Add scheduled function to clean up expired invitations (runs daily)
export const cleanupExpiredInvitations = functions.pubsub
  .schedule('0 0 * * *') // Run at midnight every day
  .onRun(async (context) => {
    try {
      const db = admin.firestore();
      const now = admin.firestore.Timestamp.now();
      
      // Find all expired, unused invitations
      const expiredSnapshot = await db.collection('admin_invitations')
        .where('used', '==', false)
        .where('expiresAt', '<', now)
        .get();
      
      if (expiredSnapshot.empty) {
        console.log('No expired invitations to clean up');
        return null;
      }
      
      // Delete expired invitations in batches
      const batch = db.batch();
      let count = 0;
      
      expiredSnapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
        count++;
      });
      
      await batch.commit();
      console.log(`Cleaned up ${count} expired invitations`);
      
      return null;
    } catch (error) {
      console.error('Error cleaning up expired invitations:', error);
      return null;
    }
  });