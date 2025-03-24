/**
 * TOTP Utilities
 * 
 * This module provides utilities for working with TOTP (Time-based One-Time Password)
 * authentication for MFA and backup codes.
 */

import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

/**
 * Generate a TOTP secret
 * @returns TOTP secret and related data
 */
export function generateTotpSecret(issuer: string, accountName: string) {
  // Generate a secret using speakeasy
  const secret = speakeasy.generateSecret({
    length: 20, // Secret length
    name: `${issuer}:${accountName}`, // Used in authenticator apps
    issuer: issuer, // Organization name
  });

  return {
    ascii: secret.ascii,
    hex: secret.hex,
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Generate backup codes for TOTP authentication
 * @param count Number of backup codes to generate
 * @returns Array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random 10-character backup code
    // Format: XXXX-XXXX-XXXX (3 groups of 4 alphanumeric characters)
    const segment1 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const segment2 = crypto.randomBytes(2).toString('hex').toUpperCase();
    const segment3 = crypto.randomBytes(2).toString('hex').toUpperCase();
    
    codes.push(`${segment1}-${segment2}-${segment3}`);
  }
  
  return codes;
}

/**
 * Verify a TOTP token
 * @param token Token to verify
 * @param secret TOTP secret
 * @returns Whether the token is valid
 */
export function verifyTotpToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 1, // Allow 1 step before and after (30 seconds each)
  });
}

/**
 * Hash a backup code for storage
 * @param code Backup code to hash
 * @returns Hashed backup code
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/**
 * Verify a backup code
 * @param code Backup code to verify
 * @param hashedCodes Array of hashed backup codes
 * @returns Whether the code is valid and the index of the code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): 
  { valid: boolean, index: number } {
  const normalizedCode = code.toUpperCase().replace(/\s/g, '');
  const hashedCode = hashBackupCode(normalizedCode);
  
  const index = hashedCodes.findIndex(hc => hc === hashedCode);
  return {
    valid: index !== -1,
    index
  };
}