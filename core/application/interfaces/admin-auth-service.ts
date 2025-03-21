/**
 * Admin Authentication Service Interface
 * 
 * Extends the base authentication service with admin-specific operations.
 */

import { Administrator } from '../../domain/user/administrator';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { AuthResult, IAuthService, MfaSetupResult } from './auth-service';

/**
 * Admin authentication result
 */
export interface AdminAuthResult extends AuthResult {
  user: Administrator;
  requiresMfa: boolean;
}

/**
 * Admin invitation data
 */
export interface AdminInvitation {
  code: string;
  email: EmailAddress;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
}

/**
 * Admin authentication service interface
 */
export interface IAdminAuthService extends Omit<IAuthService, 'loginWithEmailAndPassword' | 'registerWithEmailAndPassword'> {
  /**
   * Admin login with email and password
   * May return partial authentication that requires MFA verification
   */
  adminLoginWithEmailAndPassword(
    email: EmailAddress, 
    password: string
  ): Promise<AdminAuthResult>;
  
  /**
   * Register a new admin from an invitation
   */
  registerAdminWithInvitation(
    invitationCode: string,
    password: string,
    adminData: Partial<Omit<Administrator, 'id' | 'email' | 'emailVerified' | 'createdAt' | 'updatedAt' | 'isApproved' | 'mfaEnabled' | 'invitedBy' | 'invitationDate'>>
  ): Promise<Administrator>;
  
  /**
   * Create an invitation for a new admin
   */
  createAdminInvitation(
    superAdminId: string,
    email: EmailAddress
  ): Promise<AdminInvitation>;
  
  /**
   * Verify invitation code validity
   */
  verifyInvitationCode(code: string): Promise<{
    isValid: boolean;
    invitation?: AdminInvitation;
  }>;
  
  /**
   * Approve a pending admin account
   */
  approveAdmin(
    adminId: string,
    superAdminId: string
  ): Promise<Administrator>;
  
  /**
   * Get pending admin approvals
   */
  getPendingApprovals(): Promise<Administrator[]>;
  
  /**
   * Setup mandatory MFA for admin
   * All admins must have MFA enabled
   */
  setupAdminMfa(adminId: string): Promise<MfaSetupResult>;
  
  /**
   * Verify admin MFA during login
   */
  verifyAdminMfaLogin(
    adminId: string,
    code: string
  ): Promise<AdminAuthResult>;
  
  /**
   * Check if admin session is active (not timed out)
   */
  isAdminSessionActive(
    token: string,
    maxInactivityMinutes: number
  ): Promise<boolean>;
  
  /**
   * Record admin activity to prevent session timeout
   */
  recordAdminActivity(
    adminId: string
  ): Promise<boolean>;
  
  /**
   * Get admin user from token
   */
  getAdminFromToken(token: string): Promise<Administrator | null>;
}