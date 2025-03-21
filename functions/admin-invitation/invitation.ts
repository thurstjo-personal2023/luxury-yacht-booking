/**
 * Admin Invitation System
 * 
 * This module provides functions for generating and validating secure
 * invitation links for administrator registration.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import * as crypto from 'crypto';

const INVITATION_COLLECTION = 'admin_invitations';
const INVITATION_EXPIRY_DAYS = 7; // Invitations expire after 7 days

/**
 * Generate a secure random token for invitation links
 * @returns A cryptographically secure random token
 */
function generateSecureToken(): string {
  // Generate 32 bytes of random data and convert to hex
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Generate an invitation link for a new administrator
 * 
 * @param email Email address for the invited administrator
 * @param role Administrator role (default: 'admin')
 * @param expiryDays Number of days until invitation expires
 * @returns The invitation details including token and expiration
 */
export async function generateAdminInvitation(
  email: string,
  role: string = 'admin',
  expiryDays: number = INVITATION_EXPIRY_DAYS
): Promise<{
  invitationId: string;
  token: string;
  email: string;
  role: string;
  createdAt: FirebaseFirestore.Timestamp;
  expiresAt: FirebaseFirestore.Timestamp;
  used: boolean;
}> {
  // Validate email format
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Valid email address is required');
  }
  
  // Check if an active invitation already exists for this email
  const db = admin.firestore();
  const existingInvitations = await db.collection(INVITATION_COLLECTION)
    .where('email', '==', email)
    .where('used', '==', false)
    .where('expiresAt', '>', admin.firestore.Timestamp.now())
    .get();

  // If an active invitation exists, return it instead of creating a new one
  if (!existingInvitations.empty) {
    const invitation = existingInvitations.docs[0].data() as any;
    return {
      invitationId: existingInvitations.docs[0].id,
      ...invitation
    };
  }

  // Generate expiration date (now + expiryDays)
  const now = admin.firestore.Timestamp.now();
  const expiresAt = admin.firestore.Timestamp.fromDate(
    new Date(now.toDate().getTime() + (expiryDays * 24 * 60 * 60 * 1000))
  );

  // Create the invitation document
  const token = generateSecureToken();
  const invitationData = {
    token,
    email,
    role,
    createdAt: now,
    expiresAt,
    used: false,
    createdBy: null // Will be populated with auth.uid in the Cloud Function
  };

  // Save to Firestore
  const invitationRef = await db.collection(INVITATION_COLLECTION).add(invitationData);
  
  return {
    invitationId: invitationRef.id,
    ...invitationData
  };
}

/**
 * Validate an admin invitation token
 * 
 * @param token The invitation token to validate
 * @returns The invitation details if valid, null otherwise
 */
export async function validateAdminInvitation(token: string): Promise<any | null> {
  if (!token) return null;
  
  const db = admin.firestore();
  const invitations = await db.collection(INVITATION_COLLECTION)
    .where('token', '==', token)
    .where('used', '==', false)
    .where('expiresAt', '>', admin.firestore.Timestamp.now())
    .limit(1)
    .get();
  
  if (invitations.empty) {
    return null;
  }
  
  const invitation = invitations.docs[0];
  return {
    id: invitation.id,
    ...invitation.data()
  };
}

/**
 * Mark an invitation as used
 * 
 * @param token The invitation token that was used
 * @param userId The user ID that used the invitation
 * @returns true if marked as used, false if not found
 */
export async function markInvitationUsed(
  token: string, 
  userId: string
): Promise<boolean> {
  const db = admin.firestore();
  const invitations = await db.collection(INVITATION_COLLECTION)
    .where('token', '==', token)
    .limit(1)
    .get();
  
  if (invitations.empty) {
    return false;
  }
  
  const invitation = invitations.docs[0];
  await invitation.ref.update({
    used: true,
    usedAt: admin.firestore.Timestamp.now(),
    usedBy: userId
  });
  
  return true;
}