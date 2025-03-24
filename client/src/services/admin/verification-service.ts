import axios from 'axios';

/**
 * Verification Service
 * 
 * This service handles admin verification status tracking and updates
 * It centralizes all verification-related API calls for consistency
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
  mfaType?: 'phone' | 'totp';
  totpMfaEnabled?: boolean;
  phoneMfaEnabled?: boolean;
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
      totpMfaEnabled: false,
      phoneMfaEnabled: false,
      mfaType: undefined,
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
 * Update MFA status
 * @param uid User ID
 * @param enabled MFA enabled status
 */
export async function updateMfaStatus(uid: string, enabled: boolean): Promise<void> {
  try {
    await axios.post('/api/admin/update-mfa-status', {
      uid,
      isMfaEnabled: enabled,
    });
  } catch (error) {
    console.error('Error updating MFA status:', error);
    throw error;
  }
}

/**
 * Generate TOTP secret for authenticator app
 * @param userId User ID
 * @returns Secret, QR code URL, and backup codes
 */
export async function generateTotpSecret(userId: string): Promise<{
  success: boolean;
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}> {
  try {
    const response = await axios.post('/api/admin/generate-totp-secret', {
      userId,
    });
    return response.data;
  } catch (error) {
    console.error('Error generating TOTP secret:', error);
    throw error;
  }
}

/**
 * Verify TOTP code
 * @param userId User ID
 * @param otp OTP code from authenticator app
 * @param secret Secret (optional, will use stored secret if not provided)
 * @returns Success status
 */
export async function verifyTotpCode(userId: string, otp: string, secret?: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await axios.post('/api/admin/verify-totp', {
      userId,
      otp,
      secret,
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying TOTP code:', error);
    throw error;
  }
}

/**
 * Verify backup code
 * @param userId User ID
 * @param backupCode Backup code
 * @returns Success status
 */
export async function verifyBackupCode(userId: string, backupCode: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const response = await axios.post('/api/admin/verify-backup-code', {
      userId,
      backupCode,
    });
    return response.data;
  } catch (error) {
    console.error('Error verifying backup code:', error);
    throw error;
  }
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
    // Use the new MFA options page instead of the basic MFA setup
    return `/admin-mfa-options/${uid}`;
  }
  
  return `/admin-dashboard`;
}