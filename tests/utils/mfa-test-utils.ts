/**
 * MFA Test Utilities
 * 
 * This module provides utilities specifically for testing Multi-Factor Authentication
 * functionality in the Etoile Yachts platform.
 */

import { Auth, UserCredential, User, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { Firestore, doc, setDoc, getDoc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
import * as speakeasy from 'speakeasy';
import { getAdminAuth } from 'firebase-admin/auth';

/**
 * Create a test user with email/password for MFA testing
 * 
 * @param auth Firebase Auth instance
 * @param db Firestore instance
 * @param userData User data
 * @returns User credential
 */
export async function createTestUserForMFA(
  auth: Auth,
  db: Firestore,
  userData = {
    email: `admin-test-${Date.now()}@example.com`,
    password: 'Test@123456',
    role: 'ADMIN',
    department: 'Technology',
    position: 'Tester'
  }
): Promise<UserCredential> {
  // Create user in Firebase Auth
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    userData.email,
    userData.password
  );
  
  const { user } = userCredential;
  
  // Create admin profile in Firestore
  await setDoc(doc(db, 'admin_profiles', user.uid), {
    uid: user.uid,
    email: userData.email,
    role: userData.role,
    department: userData.department,
    position: userData.position,
    status: 'active', // Set as active for testing
    createdAt: new Date(),
    updatedAt: new Date()
  });
  
  return userCredential;
}

/**
 * Generate a TOTP secret for testing
 * 
 * @returns TOTP secret and QR code URL
 */
export function generateTOTPSecret(username = 'admin@etoileyachts.com'): {
  secret: string;
  otpauth_url: string;
} {
  return speakeasy.generateSecret({
    name: `Etoile Yachts (${username})`,
    issuer: 'Etoile Yachts'
  });
}

/**
 * Generate a valid TOTP code for a given secret
 * 
 * @param secret TOTP secret
 * @returns Valid TOTP code
 */
export function generateValidTOTPCode(secret: string): string {
  return speakeasy.totp({
    secret: secret,
    encoding: 'base32'
  });
}

/**
 * Verify a TOTP code against a secret
 * 
 * @param secret TOTP secret
 * @param token TOTP code to verify
 * @returns Whether the code is valid
 */
export function verifyTOTPCode(secret: string, token: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1 // Allow a time skew of 1 interval (±30 seconds)
  });
}

/**
 * Set up MFA for a test user (in Firestore only, not actual Firebase Auth MFA)
 * 
 * @param db Firestore instance
 * @param userId User ID
 * @param mfaType MFA type ('totp' or 'phone')
 * @param mfaDetails MFA details
 */
export async function setupMFAForTestUser(
  db: Firestore,
  userId: string,
  mfaType: 'totp' | 'phone',
  mfaDetails: {
    phoneNumber?: string;
    totpSecret?: string;
  }
): Promise<void> {
  const userRef = doc(db, 'admin_profiles', userId);
  
  await updateDoc(userRef, {
    mfaEnabled: true,
    mfaType: mfaType,
    mfaDetails: mfaDetails,
    mfaEnrolledAt: new Date()
  });
}

/**
 * Clean up test users
 * 
 * @param auth Firebase Auth instance
 * @param db Firestore instance
 * @param email Email of test user to clean up
 */
export async function cleanupTestUser(
  auth: Auth,
  db: Firestore,
  email: string
): Promise<void> {
  // Find user by email in Firestore
  const adminProfilesRef = collection(db, 'admin_profiles');
  const q = query(adminProfilesRef, where('email', '==', email));
  const querySnapshot = await getDocs(q);
  
  // Delete each matching profile
  for (const docSnapshot of querySnapshot.docs) {
    await docSnapshot.ref.delete();
  }
  
  // Delete user from Firebase Auth (if available)
  try {
    const user = await signInWithEmailAndPassword(auth, email, 'Test@123456');
    if (user && user.user) {
      await user.user.delete();
    }
  } catch (error) {
    // Ignore errors during cleanup
    console.warn(`Could not delete auth user with email ${email}:`, error);
  }
}

/**
 * Generate backup codes for MFA
 * 
 * @param count Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 10-digit code (formatted as XXX-XXX-XXX)
    const code = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
    codes.push(`${code.substring(0, 3)}-${code.substring(3, 6)}-${code.substring(6, 9)}`);
  }
  return codes;
}

/**
 * Simulate time drift for TOTP testing
 * 
 * @param seconds Seconds to drift (positive = future, negative = past)
 * @returns Clean-up function to reset the time
 */
export function simulateTimeDrift(seconds: number): () => void {
  const originalDate = global.Date;
  
  // Create a custom Date class that returns a time with the specified drift
  class DriftedDate extends Date {
    constructor(...args: any[]) {
      if (args.length === 0) {
        // If no arguments, create a date with time drift
        super();
        this.setSeconds(this.getSeconds() + seconds);
      } else {
        // Otherwise, pass through arguments
        super(...args);
      }
    }
  }
  
  // Override global Date
  global.Date = DriftedDate as any;
  
  // Return function to restore original Date
  return () => {
    global.Date = originalDate;
  };
}

/**
 * Mock phone verification for testing
 * 
 * @param userId User ID
 * @param phoneNumber Phone number
 * @returns Object with verification functions
 */
export function mockPhoneVerification(userId: string, phoneNumber: string) {
  const verificationId = `test-verification-${Date.now()}`;
  const verificationCode = '123456'; // Fixed code for testing
  
  return {
    verificationId,
    verificationCode,
    sendVerificationCode: async () => ({ verificationId }),
    verifyCode: async (code: string) => code === verificationCode,
    getPhoneNumber: () => phoneNumber
  };
}

/**
 * Test whether user has MFA enrolled
 * 
 * @param db Firestore instance
 * @param userId User ID to check
 * @returns Whether MFA is enrolled
 */
export async function checkMFAEnrollment(db: Firestore, userId: string): Promise<boolean> {
  const userRef = doc(db, 'admin_profiles', userId);
  const userDoc = await getDoc(userRef);
  
  if (!userDoc.exists()) {
    return false;
  }
  
  const userData = userDoc.data();
  return userData?.mfaEnabled === true;
}