import * as speakeasy from 'speakeasy';
import * as crypto from 'crypto';

/**
 * Generate a TOTP secret for authenticator app
 * @param issuer The issuer name (e.g., 'Etoile Yachts')
 * @param account The user's account name (e.g., email)
 * @returns The TOTP secret and QR code URL
 */
export function generateTotpSecret(issuer: string, account: string) {
  const secret = speakeasy.generateSecret({
    length: 20,
    name: `${issuer}:${account}`,
    issuer: issuer,
  });
  
  return {
    base32: secret.base32,
    otpauth_url: secret.otpauth_url,
  };
}

/**
 * Verify a TOTP token against a secret
 * @param token The token to verify
 * @param secret The TOTP secret
 * @returns Whether the token is valid
 */
export function verifyTotpToken(token: string, secret: string) {
  return speakeasy.totp.verify({
    secret: secret,
    encoding: 'base32',
    token: token,
    window: 2, // Allow 1 period before and after (60 second window)
  });
}

/**
 * Generate a set of backup codes
 * @param count The number of backup codes to generate
 * @returns An array of backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];
  
  for (let i = 0; i < count; i++) {
    // Generate a random 10-character alphanumeric code
    const code = crypto.randomBytes(6).toString('hex');
    codes.push(code);
  }
  
  return codes;
}

/**
 * Hash a backup code for secure storage
 * @param code The backup code to hash
 * @returns The hashed backup code
 */
export function hashBackupCode(code: string): string {
  return crypto
    .createHash('sha256')
    .update(code)
    .digest('hex');
}

/**
 * Verify a backup code against a list of hashed backup codes
 * @param code The backup code to verify
 * @param hashedCodes The list of hashed backup codes
 * @returns Object with validation result and index of matched code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): { valid: boolean; index: number } {
  const hashedCode = hashBackupCode(code);
  const index = hashedCodes.findIndex(c => c === hashedCode);
  
  return {
    valid: index !== -1,
    index: index,
  };
}