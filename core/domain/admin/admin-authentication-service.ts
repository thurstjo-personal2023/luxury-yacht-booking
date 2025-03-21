/**
 * Admin Authentication Service
 * 
 * Domain service for admin authentication operations.
 * This service contains pure business logic without external dependencies.
 */

import * as crypto from 'crypto';
import { AdminCredentials } from './admin-credentials';

/**
 * Result of an authentication operation
 */
export interface AuthenticationResult {
  success: boolean;
  requiresMfa: boolean;
  temporaryToken?: string;
  error?: string;
}

/**
 * Password validation rules
 */
export interface PasswordValidationRules {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
}

/**
 * Default password validation rules
 */
const DEFAULT_PASSWORD_RULES: PasswordValidationRules = {
  minLength: 10,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true
};

/**
 * Admin Authentication Service
 */
export class AdminAuthenticationService {
  /**
   * Validate a password against security rules
   * @param password The password to validate
   * @param rules Password validation rules
   * @returns Validation result
   */
  validatePassword(
    password: string,
    rules: PasswordValidationRules = DEFAULT_PASSWORD_RULES
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (password.length < rules.minLength) {
      errors.push(`Password must be at least ${rules.minLength} characters long`);
    }

    if (rules.requireUppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (rules.requireLowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (rules.requireNumbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    if (rules.requireSpecialChars && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Hash a password using a secure hashing algorithm
   * In a real system, this would use a proper password hashing function like bcrypt
   * @param password The password to hash
   * @returns Hashed password
   */
  hashPassword(password: string): string {
    // This is a placeholder for demonstration
    // In a real system, use bcrypt or similar
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  /**
   * Verify a password against a stored hash
   * @param password The password to verify
   * @param storedHash The stored password hash
   * @returns True if the password is valid
   */
  verifyPassword(password: string, storedHash: string): boolean {
    // This is a placeholder for demonstration
    // In a real system, use bcrypt or similar
    const [salt, hash] = storedHash.split(':');
    const computedHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === computedHash;
  }

  /**
   * Generate a secure MFA secret
   * In a real system, this would generate a proper TOTP secret
   * @returns MFA secret
   */
  generateMfaSecret(): string {
    // This is a placeholder for demonstration
    // In a real system, use a TOTP library
    return crypto.randomBytes(20).toString('hex');
  }

  /**
   * Validate an MFA token
   * @param token The token to validate
   * @param secret The MFA secret
   * @returns True if the token is valid
   */
  validateMfaToken(token: string, secret: string): boolean {
    // This is a placeholder for demonstration
    // In a real system, use a TOTP library
    
    // For demo, we just validate that it's a 6-digit number
    return /^\d{6}$/.test(token);
  }

  /**
   * Generate a secure JWT-like token
   * In a real system, this would generate a proper JWT
   * @param payload The token payload
   * @param expiryMinutes Token expiry in minutes
   * @returns Generated token
   */
  generateSecureToken(payload: any, expiryMinutes: number = 60): string {
    // This is a placeholder for demonstration
    // In a real system, use a JWT library
    
    const header = { alg: 'HS256', typ: 'JWT' };
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + (expiryMinutes * 60);
    
    const tokenPayload = {
      ...payload,
      iat: now,
      exp: expiry
    };
    
    const encodedHeader = Buffer.from(JSON.stringify(header)).toString('base64');
    const encodedPayload = Buffer.from(JSON.stringify(tokenPayload)).toString('base64');
    
    // In a real implementation, this would be signed with a secret key
    return `${encodedHeader}.${encodedPayload}.signature`;
  }

  /**
   * Authenticate an admin user
   * @param credentials The stored admin credentials
   * @param password The provided password
   * @returns Authentication result
   */
  authenticate(
    credentials: AdminCredentials | null,
    password: string
  ): AuthenticationResult {
    if (!credentials) {
      return {
        success: false,
        requiresMfa: false,
        error: 'Invalid credentials'
      };
    }

    if (!credentials.hasPassword) {
      return {
        success: false,
        requiresMfa: false,
        error: 'Password not set'
      };
    }

    const passwordValid = this.verifyPassword(password, credentials._passwordHash!);
    
    if (!passwordValid) {
      return {
        success: false,
        requiresMfa: false,
        error: 'Invalid password'
      };
    }

    // If MFA is set up, require MFA verification
    if (credentials.hasMfaSecret) {
      const temporaryToken = credentials.generateTemporaryToken(15); // 15 minutes
      
      return {
        success: true,
        requiresMfa: true,
        temporaryToken
      };
    }

    return {
      success: true,
      requiresMfa: false
    };
  }

  /**
   * Verify an MFA token
   * @param credentials The stored admin credentials
   * @param token The provided MFA token
   * @param tempToken The temporary token from the first auth step
   * @returns Authentication result
   */
  verifyMfa(
    credentials: AdminCredentials | null,
    token: string,
    tempToken: string
  ): AuthenticationResult {
    if (!credentials) {
      return {
        success: false,
        requiresMfa: false,
        error: 'Invalid credentials'
      };
    }

    if (!credentials.hasMfaSecret) {
      return {
        success: false,
        requiresMfa: false,
        error: 'MFA not set up'
      };
    }

    // Verify the temporary token
    if (!credentials.verifyTemporaryToken(tempToken)) {
      return {
        success: false,
        requiresMfa: true,
        error: 'Invalid or expired temporary token'
      };
    }

    // Verify the MFA token
    if (!credentials.validateMfaToken(token)) {
      return {
        success: false,
        requiresMfa: true,
        error: 'Invalid MFA token'
      };
    }

    // Clear the temporary token
    credentials.clearTemporaryToken();

    return {
      success: true,
      requiresMfa: false
    };
  }
}