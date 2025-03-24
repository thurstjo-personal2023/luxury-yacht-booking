/**
 * Admin Test Utilities
 * 
 * Helper functions for testing administrator-related functionality
 */

import * as firebase from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut, 
  Auth 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  Firestore,
  query,
  where,
  getDocs,
  Timestamp,
  DocumentReference
} from 'firebase/firestore';
import { initializeTestEnvironment, EmulatorInstance } from '../emulator-setup';

/**
 * Initialize Firebase emulators for admin tests
 */
export function initializeEmulators(): Promise<EmulatorInstance> {
  return Promise.resolve(initializeTestEnvironment({
    projectId: 'etoile-yachts-test',
    useAuth: true,
    useFirestore: true,
    disableWarnings: true
  }));
}

/**
 * Create a test invitation in Firestore
 * 
 * @param db Firestore instance
 * @param data Invitation data
 * @returns The invitation ID
 */
export async function createTestInvitation(
  db: Firestore,
  data: {
    email: string;
    role?: string;
    token?: string;
    expiresAt?: Date;
    createdBy?: string;
    department?: string;
    position?: string;
  }
): Promise<string> {
  const invitationId = `invitation-test-${Date.now()}`;
  const token = data.token || `token-${Date.now()}`;
  
  await setDoc(doc(db, 'admin_invitations', invitationId), {
    invitationId,
    token,
    email: data.email,
    role: data.role || 'ADMIN',
    department: data.department || 'Technology',
    position: data.position || 'Tester',
    expiresAt: data.expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
    createdBy: data.createdBy || 'super-admin-test-uid',
    used: false,
    usedBy: null,
    usedAt: null
  });
  
  return invitationId;
}

/**
 * Create a test admin user in Firestore
 * 
 * @param db Firestore instance
 * @param data Admin user data
 * @returns The admin user ID
 */
export async function createTestAdminUser(
  db: Firestore,
  data: {
    uid?: string;
    name?: string;
    email: string;
    phone?: string;
    role?: string;
    status?: string;
    invitationId?: string | null;
    permissions?: string[];
    department?: string;
    position?: string;
  }
): Promise<string> {
  const uid = data.uid || `admin-test-${Date.now()}`;
  
  await setDoc(doc(db, 'admin_users', uid), {
    uid,
    name: data.name || 'Test Admin',
    email: data.email,
    phone: data.phone || '+15551234567',
    role: data.role || 'ADMIN',
    status: data.status || 'pending_approval',
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    invitationId: data.invitationId || null,
    permissions: data.permissions || ['view_admin_dashboard'],
    department: data.department || 'Technology',
    position: data.position || 'Tester'
  });
  
  return uid;
}

/**
 * Create and store verification status in Firestore
 * 
 * @param db Firestore instance
 * @param userId User ID to create verification for
 * @param data Verification status data
 * @returns Reference to the verification document
 */
export async function createVerificationStatus(
  db: Firestore,
  userId: string,
  data: {
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    isApproved?: boolean;
    isMfaEnabled?: boolean;
    emailVerifiedAt?: Date | null;
    phoneVerifiedAt?: Date | null;
    approvedAt?: Date | null;
    approvedBy?: string | null;
    mfaEnabledAt?: Date | null;
    mfaType?: 'phone' | 'totp' | null;
  }
): Promise<DocumentReference> {
  const verificationRef = doc(db, 'admin_verification', userId);
  
  await setDoc(verificationRef, {
    userId,
    isEmailVerified: data.isEmailVerified ?? false,
    isPhoneVerified: data.isPhoneVerified ?? false,
    isApproved: data.isApproved ?? false,
    isMfaEnabled: data.isMfaEnabled ?? false,
    emailVerifiedAt: data.emailVerifiedAt ?? null,
    phoneVerifiedAt: data.phoneVerifiedAt ?? null,
    approvedAt: data.approvedAt ?? null,
    approvedBy: data.approvedBy ?? null,
    mfaEnabledAt: data.mfaEnabledAt ?? null,
    mfaType: data.mfaType ?? null,
    updatedAt: Timestamp.now()
  });
  
  return verificationRef;
}

/**
 * Generate a test verification OTP
 * 
 * @param db Firestore instance
 * @param userId User ID to create OTP for
 * @param type OTP type ('email' or 'phone')
 * @param code Optional specific code to use
 * @returns The OTP code
 */
export async function generateTestOTP(
  db: Firestore,
  userId: string,
  type: 'email' | 'phone',
  code?: string
): Promise<string> {
  const otpCode = code || Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
  
  await setDoc(doc(db, 'admin_verification_codes', `${userId}_${type}`), {
    userId,
    type,
    code: otpCode,
    attempts: 0,
    maxAttempts: 3,
    expiresAt,
    createdAt: Timestamp.now()
  });
  
  return otpCode;
}

/**
 * Verify test OTP in Firestore
 * 
 * @param db Firestore instance
 * @param userId User ID for the OTP
 * @param type OTP type ('email' or 'phone')
 * @param code OTP code to verify
 * @returns Whether verification succeeded
 */
export async function verifyTestOTP(
  db: Firestore,
  userId: string,
  type: 'email' | 'phone',
  code: string
): Promise<boolean> {
  const otpRef = doc(db, 'admin_verification_codes', `${userId}_${type}`);
  const otpDoc = await getDoc(otpRef);
  
  if (!otpDoc.exists()) {
    return false;
  }
  
  const otpData = otpDoc.data();
  const now = new Date();
  const expiresAt = otpData.expiresAt.toDate();
  
  // Check if expired
  if (now > expiresAt) {
    return false;
  }
  
  // Check if max attempts reached
  if (otpData.attempts >= otpData.maxAttempts) {
    return false;
  }
  
  // Verify code
  const isValid = otpData.code === code;
  
  // Update attempts
  await setDoc(otpRef, {
    ...otpData,
    attempts: otpData.attempts + 1,
    lastAttemptAt: Timestamp.now()
  }, { merge: true });
  
  return isValid;
}