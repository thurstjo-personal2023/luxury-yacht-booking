/**
 * Admin Authentication Service Interface
 * 
 * This interface defines the contract for admin authentication service implementations.
 * It extends the base authentication service with admin-specific functionality.
 */

import { Administrator } from '../../domain/user/administrator';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { Password } from '../../domain/value-objects/password';
import { UserRole } from '../../domain/user/user-role';
import { AuthResult, IAuthService } from './auth-service';

/**
 * MFA setup result
 */
export interface MfaSetupResult {
  success: boolean;
  secretKey?: string;
  qrCodeUrl?: string;
  recoveryCodes?: string[];
  error?: string;
}

/**
 * MFA verification result
 */
export interface MfaVerificationResult {
  success: boolean;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Admin invitation result
 */
export interface AdminInvitationResult {
  success: boolean;
  invitationId?: string;
  invitationToken?: string;
  invitationLink?: string;
  email?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Admin invitation verification result
 */
export interface AdminInvitationVerificationResult {
  isValid: boolean;
  invitationId?: string;
  email?: string;
  role?: UserRole;
  invitedBy?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Admin login audit log
 */
export interface AdminLoginAudit {
  id: string;
  adminId: string;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  success: boolean;
  failureReason?: string;
}

/**
 * Admin authentication service interface
 */
export interface IAdminAuthService extends IAuthService {
  /**
   * Admin login with email and password
   * This is the first step of admin authentication
   */
  adminLogin(email: EmailAddress | string, password: string): Promise<AuthResult>;
  
  /**
   * Complete admin login with MFA verification
   */
  verifyMfa(userId: string, mfaCode: string): Promise<MfaVerificationResult>;
  
  /**
   * Verify admin login with a recovery code
   */
  verifyWithRecoveryCode(userId: string, recoveryCode: string): Promise<MfaVerificationResult>;
  
  /**
   * Setup MFA for an admin
   */
  setupMfa(adminId: string): Promise<MfaSetupResult>;
  
  /**
   * Enable MFA after setup
   */
  enableMfa(adminId: string, mfaCode: string): Promise<boolean>;
  
  /**
   * Disable MFA for an admin
   */
  disableMfa(adminId: string, password: string): Promise<boolean>;
  
  /**
   * Generate new recovery codes
   */
  generateRecoveryCodes(adminId: string, password: string): Promise<string[]>;
  
  /**
   * Create an invitation for a new admin
   */
  createAdminInvitation(
    email: EmailAddress | string,
    role: UserRole,
    invitedBy: string
  ): Promise<AdminInvitationResult>;
  
  /**
   * Verify an admin invitation token
   */
  verifyAdminInvitation(token: string): Promise<AdminInvitationVerificationResult>;
  
  /**
   * Register a new admin using an invitation
   */
  registerAdminWithInvitation(
    invitationToken: string,
    password: Password,
    firstName: string,
    lastName: string,
    phone: string,
    employeeId: string,
    department: string,
    position: string
  ): Promise<AuthResult>;
  
  /**
   * Log an admin login attempt
   */
  logAdminLoginAttempt(audit: Omit<AdminLoginAudit, 'id'>): Promise<AdminLoginAudit>;
  
  /**
   * Update admin last activity timestamp
   */
  updateAdminActivity(adminId: string): Promise<boolean>;
  
  /**
   * Check if an admin's session is active
   */
  isAdminSessionActive(adminId: string, timeoutMinutes?: number): Promise<boolean>;
  
  /**
   * Update admin IP whitelist
   */
  updateIpWhitelist(adminId: string, ipAddresses: string[]): Promise<boolean>;
  
  /**
   * Check if an IP is whitelisted for an admin
   */
  isIpWhitelisted(adminId: string, ipAddress: string): Promise<boolean>;
  
  /**
   * Get the currently authenticated admin
   */
  getCurrentAdmin(token: string): Promise<Administrator | null>;
  
  /**
   * Check if admin has super admin role
   */
  isSuperAdmin(token: string): Promise<boolean>;
  
  /**
   * Approve a pending admin account
   */
  approveAdmin(adminId: string, approvedById: string): Promise<boolean>;
  
  /**
   * Reject a pending admin account
   */
  rejectAdmin(adminId: string, rejectedById: string, reason: string): Promise<boolean>;
}