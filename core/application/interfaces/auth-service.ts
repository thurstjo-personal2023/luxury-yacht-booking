/**
 * Authentication Service Interface
 * 
 * Defines the contract for authentication operations.
 * This abstract interface separates business logic from the actual authentication implementation.
 */

import { User } from '../../domain/user/user';
import { EmailAddress } from '../../domain/value-objects/email-address';

/**
 * Authentication result containing user and token
 */
export interface AuthResult {
  user: User;
  token: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * MFA setup result
 */
export interface MfaSetupResult {
  secretKey: string;
  qrCodeUrl: string;
  backupCodes?: string[];
}

/**
 * Authentication service interface
 */
export interface IAuthService {
  /**
   * Register a new user with email and password
   */
  registerWithEmailAndPassword(
    email: EmailAddress, 
    password: string, 
    userData: Partial<Omit<User, 'id' | 'email' | 'emailVerified' | 'createdAt' | 'updatedAt'>>
  ): Promise<User>;
  
  /**
   * Login with email and password
   */
  loginWithEmailAndPassword(
    email: EmailAddress, 
    password: string
  ): Promise<AuthResult>;
  
  /**
   * Login with OAuth provider
   */
  loginWithOAuth(
    provider: 'google' | 'facebook' | 'apple',
    token: string
  ): Promise<AuthResult>;
  
  /**
   * Verify email address
   */
  verifyEmail(verificationToken: string): Promise<boolean>;
  
  /**
   * Send password reset email
   */
  sendPasswordResetEmail(email: EmailAddress): Promise<boolean>;
  
  /**
   * Reset password with token
   */
  resetPassword(token: string, newPassword: string): Promise<boolean>;
  
  /**
   * Change password (when user is logged in)
   */
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean>;
  
  /**
   * Log out the current user
   */
  logout(token: string): Promise<boolean>;
  
  /**
   * Refresh authentication token
   */
  refreshToken(refreshToken: string): Promise<Omit<AuthResult, 'user'>>;
  
  /**
   * Get current user from token
   */
  getUserFromToken(token: string): Promise<User | null>;
  
  /**
   * Setup multi-factor authentication
   */
  setupMfa(userId: string): Promise<MfaSetupResult>;
  
  /**
   * Verify MFA code during setup
   */
  verifyMfaSetup(userId: string, code: string): Promise<boolean>;
  
  /**
   * Verify MFA code during login
   */
  verifyMfaLogin(userId: string, code: string): Promise<AuthResult>;
  
  /**
   * Disable MFA for a user
   */
  disableMfa(userId: string, adminId?: string): Promise<boolean>;
  
  /**
   * Check if a token is valid
   */
  validateToken(token: string): Promise<boolean>;
}