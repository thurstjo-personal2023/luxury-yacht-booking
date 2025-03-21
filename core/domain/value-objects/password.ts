/**
 * Password Value Object
 * 
 * This represents a password with validation rules.
 * Note: This does not store the actual password value for security reasons,
 * but validates password strength and provides hashing capabilities.
 */

export class Password {
  private static readonly MIN_LENGTH = 8;
  private static readonly REQUIRES_UPPERCASE = true;
  private static readonly REQUIRES_LOWERCASE = true;
  private static readonly REQUIRES_NUMBER = true;
  private static readonly REQUIRES_SPECIAL = true;

  /**
   * Validate password strength
   */
  public static validate(password: string): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!password) {
      errors.push('Password is required');
      return { isValid: false, errors };
    }
    
    if (password.length < this.MIN_LENGTH) {
      errors.push(`Password must be at least ${this.MIN_LENGTH} characters long`);
    }
    
    if (this.REQUIRES_UPPERCASE && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }
    
    if (this.REQUIRES_LOWERCASE && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }
    
    if (this.REQUIRES_NUMBER && !/\d/.test(password)) {
      errors.push('Password must contain at least one number');
    }
    
    if (this.REQUIRES_SPECIAL && !/[^A-Za-z0-9]/.test(password)) {
      errors.push('Password must contain at least one special character');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Calculate password strength score (0-100)
   */
  public static calculateStrength(password: string): number {
    if (!password) return 0;
    
    let score = 0;
    
    // Length contribution (up to 40 points)
    score += Math.min(40, password.length * 4);
    
    // Character variety contribution
    if (/[A-Z]/.test(password)) score += 10; // Uppercase
    if (/[a-z]/.test(password)) score += 10; // Lowercase
    if (/\d/.test(password)) score += 10;    // Numbers
    if (/[^A-Za-z0-9]/.test(password)) score += 15; // Special characters
    
    // Variety of character types (up to 15 points)
    const charTypes = [/[A-Z]/, /[a-z]/, /\d/, /[^A-Za-z0-9]/].filter(regex => regex.test(password)).length;
    score += charTypes * 5;
    
    // Cap at 100
    return Math.min(100, score);
  }
}