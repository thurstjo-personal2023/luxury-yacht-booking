/**
 * Password Value Object
 * 
 * This value object encapsulates a password and its validation rules.
 */

/**
 * Password validation error types
 */
export enum PasswordValidationError {
  EMPTY = 'Password cannot be empty',
  LENGTH = 'Password must be at least 8 characters',
  FORMAT = 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  ADMIN_FORMAT = 'Admin password must contain at least one uppercase letter, one lowercase letter, one number, and one special character, and be at least 12 characters long'
}

/**
 * Password strength levels
 */
export enum PasswordStrength {
  WEAK = 'weak',
  MEDIUM = 'medium',
  STRONG = 'strong',
  VERY_STRONG = 'very_strong'
}

/**
 * Password value object
 */
export class Password {
  private readonly value: string;
  private readonly isHashed: boolean;
  
  // Validation patterns
  private static readonly HAS_UPPERCASE = /[A-Z]/;
  private static readonly HAS_LOWERCASE = /[a-z]/;
  private static readonly HAS_NUMBER = /[0-9]/;
  private static readonly HAS_SPECIAL = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/;
  
  // Minimum password lengths
  private static readonly MIN_LENGTH = 8;
  private static readonly ADMIN_MIN_LENGTH = 12;
  
  private constructor(password: string, isHashed: boolean = false) {
    this.value = password;
    this.isHashed = isHashed;
  }
  
  /**
   * Create a new Password value object
   * @throws Error if the password is invalid
   */
  static create(password: string, isAdmin: boolean = false): Password {
    // Check if password is empty
    if (!password) {
      throw new Error(PasswordValidationError.EMPTY);
    }
    
    // Check minimum length based on user type
    const minLength = isAdmin ? Password.ADMIN_MIN_LENGTH : Password.MIN_LENGTH;
    if (password.length < minLength) {
      throw new Error(isAdmin ? PasswordValidationError.ADMIN_FORMAT : PasswordValidationError.LENGTH);
    }
    
    // Check password complexity
    const hasUppercase = Password.HAS_UPPERCASE.test(password);
    const hasLowercase = Password.HAS_LOWERCASE.test(password);
    const hasNumber = Password.HAS_NUMBER.test(password);
    const hasSpecial = Password.HAS_SPECIAL.test(password);
    
    // For regular users, only enforce minimum length
    if (!isAdmin) {
      return new Password(password);
    }
    
    // For admin users, enforce strict complexity requirements
    if (!hasUppercase || !hasLowercase || !hasNumber || !hasSpecial) {
      throw new Error(PasswordValidationError.ADMIN_FORMAT);
    }
    
    return new Password(password);
  }
  
  /**
   * Create a password object from a hashed password
   */
  static createFromHashed(hashedPassword: string): Password {
    return new Password(hashedPassword, true);
  }
  
  /**
   * Try to create a Password, return null if invalid
   */
  static tryCreate(password: string, isAdmin: boolean = false): Password | null {
    try {
      return Password.create(password, isAdmin);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Check if a password is valid
   */
  static isValid(password: string, isAdmin: boolean = false): boolean {
    try {
      Password.create(password, isAdmin);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check password strength
   */
  static checkStrength(password: string): PasswordStrength {
    // Empty password
    if (!password) {
      return PasswordStrength.WEAK;
    }
    
    let score = 0;
    
    // Length
    if (password.length >= 8) score++;
    if (password.length >= 12) score++;
    if (password.length >= 16) score++;
    
    // Complexity
    if (Password.HAS_UPPERCASE.test(password)) score++;
    if (Password.HAS_LOWERCASE.test(password)) score++;
    if (Password.HAS_NUMBER.test(password)) score++;
    if (Password.HAS_SPECIAL.test(password)) score++;
    
    // Convert score to strength level
    if (score <= 3) return PasswordStrength.WEAK;
    if (score <= 5) return PasswordStrength.MEDIUM;
    if (score <= 7) return PasswordStrength.STRONG;
    return PasswordStrength.VERY_STRONG;
  }
  
  /**
   * Get the password value
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Check if the password is hashed
   */
  getIsHashed(): boolean {
    return this.isHashed;
  }
}