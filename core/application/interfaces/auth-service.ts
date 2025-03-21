/**
 * Authentication Service Interface
 * 
 * This interface defines the contract for authentication service implementations.
 * It is responsible for authenticating users, managing sessions, and handling
 * authentication-related operations.
 */

import { User } from '../../domain/user/user';
import { EmailAddress } from '../../domain/value-objects/email-address';
import { Password } from '../../domain/value-objects/password';
import { PhoneNumber } from '../../domain/value-objects/phone-number';
import { UserRole } from '../../domain/user/user-role';

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: User;
  token?: string;
  refreshToken?: string;
  expiresAt?: Date;
  error?: string;
}

/**
 * Token verification result
 */
export interface TokenVerificationResult {
  isValid: boolean;
  userId?: string;
  email?: string;
  role?: UserRole;
  error?: string;
}

/**
 * Email verification options
 */
export interface EmailVerificationOptions {
  redirectUrl?: string;
  templateId?: string;
}

/**
 * Password reset options
 */
export interface PasswordResetOptions {
  redirectUrl?: string;
  templateId?: string;
  expiration?: number; // In seconds
}

/**
 * Authentication service interface
 */
export interface IAuthService {
  /**
   * Register a new user
   */
  register(
    email: EmailAddress,
    password: Password,
    firstName: string,
    lastName: string,
    role: UserRole,
    phone?: PhoneNumber
  ): Promise<AuthResult>;
  
  /**
   * Login with email and password
   */
  login(email: EmailAddress | string, password: string): Promise<AuthResult>;
  
  /**
   * Logout a user
   */
  logout(token: string): Promise<boolean>;
  
  /**
   * Refresh an authentication token
   */
  refreshToken(refreshToken: string): Promise<AuthResult>;
  
  /**
   * Verify an authentication token
   */
  verifyToken(token: string): Promise<TokenVerificationResult>;
  
  /**
   * Send an email verification link
   */
  sendEmailVerification(
    userId: string,
    options?: EmailVerificationOptions
  ): Promise<boolean>;
  
  /**
   * Verify an email verification token
   */
  verifyEmail(token: string): Promise<boolean>;
  
  /**
   * Send a password reset email
   */
  sendPasswordReset(
    email: EmailAddress | string,
    options?: PasswordResetOptions
  ): Promise<boolean>;
  
  /**
   * Reset a password using a reset token
   */
  resetPassword(token: string, newPassword: Password): Promise<boolean>;
  
  /**
   * Change a user's password
   */
  changePassword(
    userId: string,
    currentPassword: string,
    newPassword: Password
  ): Promise<boolean>;
  
  /**
   * Update a user's email
   */
  updateEmail(userId: string, newEmail: EmailAddress): Promise<boolean>;
  
  /**
   * Get the currently authenticated user
   */
  getCurrentUser(token: string): Promise<User | null>;
  
  /**
   * Check if a user is authenticated
   */
  isAuthenticated(token: string): Promise<boolean>;
  
  /**
   * Check if a user has a specific role
   */
  hasRole(token: string, role: UserRole): Promise<boolean>;
  
  /**
   * Check if a user has a specific permission
   */
  hasPermission(token: string, permission: string): Promise<boolean>;
}