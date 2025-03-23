/**
 * Admin Repository Interface
 * 
 * This interface defines operations for accessing and manipulating administrator data.
 */

export interface AdminProfile {
  uid: string;
  email: string;
  displayName?: string;
  adminStatus: 'pending' | 'approved';
  department?: string;
  accessLevel?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaVerified?: boolean;
  lastLogin?: Date;
}

export interface IAdminRepository {
  /**
   * Get administrator details by ID
   */
  getAdminById(adminId: string): Promise<AdminProfile | null>;
  
  /**
   * Update the last login timestamp for an administrator
   */
  updateLastLogin(adminId: string): Promise<void>;
  
  /**
   * Verify an MFA code for an administrator
   */
  verifyMfaCode(adminId: string, code: string): Promise<boolean>;
  
  /**
   * Generate a new MFA secret for an administrator
   */
  generateMfaSecret(adminId: string): Promise<{ qrCodeUrl: string, secret: string }>;
  
  /**
   * Save or update an administrator profile
   */
  saveAdminProfile(profile: AdminProfile): Promise<void>;
  
  /**
   * Check if a user is a pending administrator (has been invited)
   */
  isInvitedAdmin(email: string): Promise<boolean>;
  
  /**
   * Create an administrator invitation
   */
  createAdminInvitation(email: string, invitedBy: string): Promise<string>;
}