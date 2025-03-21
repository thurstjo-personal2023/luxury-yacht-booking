/**
 * Admin Credentials Repository Interface
 * 
 * This interface defines the repository operations for admin credentials.
 * It abstracts the authentication data access layer from the application logic.
 */

import { AdminCredentials } from '../../../domain/admin/admin-credentials';

/**
 * Interface for the admin credentials repository
 */
export interface IAdminCredentialsRepository {
  /**
   * Get admin credentials by user ID
   * @param userId Admin user ID
   * @returns Admin credentials or null if not found
   */
  getCredentials(userId: string): Promise<AdminCredentials | null>;

  /**
   * Get admin credentials by email
   * @param email Admin email
   * @returns Admin credentials or null if not found
   */
  getCredentialsByEmail(email: string): Promise<AdminCredentials | null>;

  /**
   * Create new admin credentials
   * @param credentials Admin credentials
   * @returns Created admin credentials
   */
  createCredentials(credentials: AdminCredentials): Promise<AdminCredentials>;

  /**
   * Update existing admin credentials
   * @param credentials Admin credentials
   * @returns Updated admin credentials
   */
  updateCredentials(credentials: AdminCredentials): Promise<AdminCredentials>;

  /**
   * Update admin password
   * @param userId Admin user ID
   * @param passwordHash Hashed password
   * @returns True if successful
   */
  updatePassword(userId: string, passwordHash: string): Promise<boolean>;

  /**
   * Setup MFA for an admin
   * @param userId Admin user ID
   * @param mfaSecret MFA secret
   * @returns True if successful
   */
  setupMfa(userId: string, mfaSecret: string): Promise<boolean>;

  /**
   * Disable MFA for an admin
   * @param userId Admin user ID
   * @returns True if successful
   */
  disableMfa(userId: string): Promise<boolean>;

  /**
   * Store a temporary token for an admin
   * @param userId Admin user ID
   * @param token Temporary token
   * @param expiryDate Token expiry date
   * @returns True if successful
   */
  storeTemporaryToken(userId: string, token: string, expiryDate: Date): Promise<boolean>;

  /**
   * Validate a temporary token for an admin
   * @param userId Admin user ID
   * @param token Temporary token
   * @returns True if the token is valid
   */
  validateTemporaryToken(userId: string, token: string): Promise<boolean>;

  /**
   * Clear a temporary token for an admin
   * @param userId Admin user ID
   * @returns True if successful
   */
  clearTemporaryToken(userId: string): Promise<boolean>;

  /**
   * Delete admin credentials
   * @param userId Admin user ID
   * @returns True if successful
   */
  deleteCredentials(userId: string): Promise<boolean>;
}