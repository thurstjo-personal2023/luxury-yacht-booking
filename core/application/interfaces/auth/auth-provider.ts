/**
 * Auth Provider Interface
 * 
 * This interface defines the operations for an authentication provider.
 * It abstracts the authentication system from the application logic.
 */

/**
 * User credentials for authentication
 */
export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Custom claims to be attached to a user token
 */
export interface CustomClaims {
  role?: string;
  permissions?: string[];
  [key: string]: any;
}

/**
 * Authentication token
 */
export interface AuthToken {
  token: string;
  expiresIn: number;
  refreshToken?: string;
}

/**
 * User information
 */
export interface UserInfo {
  uid: string;
  email: string;
  emailVerified: boolean;
  displayName?: string;
  phoneNumber?: string;
  photoURL?: string;
  disabled: boolean;
  customClaims?: CustomClaims;
  creationTime?: string;
  lastSignInTime?: string;
}

/**
 * Interface for the authentication provider
 */
export interface IAuthProvider {
  /**
   * Create a new user
   * @param credentials User credentials
   * @returns User information
   */
  createUser(credentials: UserCredentials): Promise<UserInfo>;

  /**
   * Get a user by ID
   * @param uid User ID
   * @returns User information
   */
  getUser(uid: string): Promise<UserInfo>;

  /**
   * Get a user by email
   * @param email User email
   * @returns User information
   */
  getUserByEmail(email: string): Promise<UserInfo>;

  /**
   * Update a user
   * @param uid User ID
   * @param updates User properties to update
   * @returns Updated user information
   */
  updateUser(uid: string, updates: Partial<UserInfo>): Promise<UserInfo>;

  /**
   * Delete a user
   * @param uid User ID
   * @returns True if successful
   */
  deleteUser(uid: string): Promise<boolean>;

  /**
   * Set custom claims on a user
   * @param uid User ID
   * @param claims Custom claims
   * @returns True if successful
   */
  setCustomClaims(uid: string, claims: CustomClaims): Promise<boolean>;

  /**
   * Verify an ID token
   * @param token ID token
   * @returns User information
   */
  verifyIdToken(token: string): Promise<UserInfo>;

  /**
   * Generate a token for a user
   * @param uid User ID
   * @returns Authentication token
   */
  generateToken(uid: string): Promise<AuthToken>;

  /**
   * Revoke refresh tokens for a user
   * @param uid User ID
   * @returns True if successful
   */
  revokeRefreshTokens(uid: string): Promise<boolean>;

  /**
   * Generate a password reset link
   * @param email User email
   * @returns Password reset link
   */
  generatePasswordResetLink(email: string): Promise<string>;

  /**
   * Generate an email verification link
   * @param email User email
   * @returns Email verification link
   */
  generateEmailVerificationLink(email: string): Promise<string>;

  /**
   * Generate a sign-in with email link
   * @param email User email
   * @returns Sign-in link
   */
  generateSignInWithEmailLink(email: string): Promise<string>;
}