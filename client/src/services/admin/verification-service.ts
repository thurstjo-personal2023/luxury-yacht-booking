import axios from 'axios';

/**
 * Verification Service
 * 
 * This service handles admin verification status tracking and updates
 */

/**
 * Verification Status Interface
 */
export interface VerificationStatus {
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  isApproved: boolean;
  approvedAt?: string;
  approvedBy?: string;
  isMfaEnabled: boolean;
  mfaEnabledAt?: string;
  registrationComplete: boolean;
}

/**
 * Get verification status for an admin user
 * @param uid User ID
 * @returns Verification status object
 */
export async function getVerificationStatus(uid: string): Promise<VerificationStatus> {
  try {
    const response = await axios.get(`/api/admin/profile/${uid}`);
    return response.data.verificationStatus || {
      isEmailVerified: false,
      isPhoneVerified: false,
      isApproved: false,
      isMfaEnabled: false,
      registrationComplete: false
    };
  } catch (error) {
    console.error('Error fetching verification status:', error);
    throw error;
  }
}

/**
 * Update email verification status
 * @param uid User ID
 * @param verified Verification status
 */
export async function updateEmailVerificationStatus(uid: string, verified: boolean): Promise<void> {
  try {
    await axios.post('/api/admin/update-verification-status', {
      uid,
      emailVerified: verified,
    });
  } catch (error) {
    console.error('Error updating email verification status:', error);
    throw error;
  }
}

/**
 * Update phone verification status
 * @param uid User ID
 * @param verified Verification status
 * @param phoneNumber Phone number (if available)
 */
export async function updatePhoneVerificationStatus(
  uid: string, 
  verified: boolean, 
  phoneNumber?: string
): Promise<void> {
  try {
    await axios.post('/api/admin/update-verification-status', {
      uid,
      isPhoneVerified: verified,
      phoneNumber,
    });
  } catch (error) {
    console.error('Error updating phone verification status:', error);
    throw error;
  }
}

/**
 * Get approval status for an admin user
 * @param uid User ID
 * @returns Approval status object
 */
export async function getApprovalStatus(uid: string): Promise<any> {
  try {
    const response = await axios.get(`/api/admin/approval-status/${uid}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching approval status:', error);
    throw error;
  }
}

/**
 * Check if verification process is complete
 * @param status Verification status
 * @returns Whether verification is complete
 */
export function isVerificationComplete(status: VerificationStatus): boolean {
  return status.isEmailVerified && status.isPhoneVerified;
}

/**
 * Check if registration process is complete
 * @param status Verification status
 * @returns Whether registration is complete
 */
export function isRegistrationComplete(status: VerificationStatus): boolean {
  return status.isEmailVerified && 
         status.isPhoneVerified && 
         status.isApproved && 
         status.isMfaEnabled;
}

/**
 * Get next step in verification process
 * @param status Verification status
 * @returns Next step route
 */
export function getNextVerificationStep(status: VerificationStatus, uid: string): string {
  if (!status.isEmailVerified) {
    return `/admin-email-verification/${uid}`;
  }
  
  if (!status.isPhoneVerified) {
    return `/admin-phone-verification/${uid}`;
  }
  
  if (!status.isApproved) {
    return `/admin-pending-approval/${uid}`;
  }
  
  if (!status.isMfaEnabled) {
    return `/admin-mfa-setup/${uid}`;
  }
  
  return `/admin-dashboard`;
}