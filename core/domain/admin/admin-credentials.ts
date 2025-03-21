/**
 * AdminCredentials Entity
 * 
 * Represents the authentication credentials for an administrator.
 * This is an entity in the domain model.
 */

import { Timestamp } from 'firebase/firestore';

/**
 * AdminCredentials entity
 */
export class AdminCredentials {
  private readonly _userId: string;
  private readonly _email: string;
  private _passwordHash?: string;
  private _mfaSecret?: string;
  private _temporaryToken?: string;
  private _tokenExpiry?: Date;
  private _updatedAt: Date;

  /**
   * Create a new AdminCredentials
   */
  constructor(
    userId: string,
    email: string,
    updatedAt: Date,
    passwordHash?: string,
    mfaSecret?: string,
    temporaryToken?: string,
    tokenExpiry?: Date
  ) {
    this._userId = userId;
    this._email = email;
    this._passwordHash = passwordHash;
    this._mfaSecret = mfaSecret;
    this._temporaryToken = temporaryToken;
    this._tokenExpiry = tokenExpiry;
    this._updatedAt = updatedAt;
  }

  // Getters
  get userId(): string { return this._userId; }
  get email(): string { return this._email; }
  get updatedAt(): Date { return new Date(this._updatedAt); }
  get hasPassword(): boolean { return !!this._passwordHash; }
  get hasMfaSecret(): boolean { return !!this._mfaSecret; }
  get hasTemporaryToken(): boolean { return !!this._temporaryToken; }

  /**
   * Update the password hash
   * Note: In a real system, password hashing would be handled by security services
   */
  updatePasswordHash(passwordHash: string): void {
    this._passwordHash = passwordHash;
    this._updatedAt = new Date();
  }

  /**
   * Set up MFA with a secret
   */
  setupMfa(mfaSecret: string): void {
    this._mfaSecret = mfaSecret;
    this._updatedAt = new Date();
  }

  /**
   * Disable MFA
   */
  disableMfa(): void {
    this._mfaSecret = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Generate a temporary token for reset/verification
   * @param expiryMinutes Token expiry in minutes
   * @returns The generated token
   */
  generateTemporaryToken(expiryMinutes: number = 60): string {
    // In a real implementation, this would use a secure token generator
    this._temporaryToken = `temp-token-${Math.random().toString(36).substring(2, 15)}`;
    this._tokenExpiry = new Date(Date.now() + expiryMinutes * 60 * 1000);
    this._updatedAt = new Date();
    return this._temporaryToken;
  }

  /**
   * Verify a temporary token
   */
  verifyTemporaryToken(token: string): boolean {
    if (!this._temporaryToken || !this._tokenExpiry) {
      return false;
    }

    // Check if token is expired
    if (new Date() > this._tokenExpiry) {
      return false;
    }

    return this._temporaryToken === token;
  }

  /**
   * Clear the temporary token
   */
  clearTemporaryToken(): void {
    this._temporaryToken = undefined;
    this._tokenExpiry = undefined;
    this._updatedAt = new Date();
  }

  /**
   * Validate MFA token using the stored secret
   * In a real implementation, this would use TOTP validation
   */
  validateMfaToken(token: string): boolean {
    // Simplified for demo purposes
    // In a real implementation, this would validate using TOTP
    if (!this._mfaSecret) {
      return false;
    }

    // Placeholder for TOTP validation
    // For demo, any 6-digit number is valid
    return /^\d{6}$/.test(token);
  }

  /**
   * Convert to a data object for storage
   */
  toData(): any {
    return {
      userId: this._userId,
      email: this._email,
      passwordHash: this._passwordHash,
      mfaSecret: this._mfaSecret,
      temporaryToken: this._temporaryToken,
      tokenExpiry: this._tokenExpiry ? Timestamp.fromDate(this._tokenExpiry) : null,
      updatedAt: Timestamp.fromDate(this._updatedAt)
    };
  }

  /**
   * Create an AdminCredentials from a data object
   */
  static fromData(data: any): AdminCredentials {
    return new AdminCredentials(
      data.userId,
      data.email,
      data.updatedAt.toDate(),
      data.passwordHash,
      data.mfaSecret,
      data.temporaryToken,
      data.tokenExpiry ? data.tokenExpiry.toDate() : undefined
    );
  }
}