/**
 * Password Value Object
 * 
 * This represents a password in the domain model.
 * It includes validation rules and hashing utilities.
 */

/**
 * Regular expression for validating password strength
 * Requires at least:
 * - 8 characters
 * - 1 uppercase letter
 * - 1 lowercase letter
 * - 1 number
 * - 1 special character from !@#$%^&*()_+{}[]|:;"'<>,.?/~`-=
 */
const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]|:;"'<>,.?/~`\-=])[A-Za-z\d!@#$%^&*()_+{}\[\]|:;"'<>,.?/~`\-=]{8,}$/;

/**
 * Minimum password length
 */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Maximum password length
 */
const MAX_PASSWORD_LENGTH = 128;

/**
 * Password value object
 */
export class Password {
  private readonly value: string;
  private readonly hashed: boolean;
  
  private constructor(password: string, hashed: boolean = false) {
    this.value = password;
    this.hashed = hashed;
    
    // Only validate if the password is not already hashed
    if (!hashed) {
      this.validate(password);
    }
  }
  
  /**
   * Get the password value
   * @warning This should only be used for authentication, not for storage or display
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Check if the password is hashed
   */
  isHashed(): boolean {
    return this.hashed;
  }
  
  /**
   * Validate the password
   */
  private validate(password: string): void {
    if (!password) {
      throw new Error('Password is required');
    }
    
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
    }
    
    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new Error(`Password cannot be longer than ${MAX_PASSWORD_LENGTH} characters`);
    }
  }
  
  /**
   * Check if the password is strong
   */
  isStrong(): boolean {
    return STRONG_PASSWORD_REGEX.test(this.value);
  }
  
  /**
   * Create a password from a plain text string
   */
  static createFromPlainText(password: string): Password {
    return new Password(password, false);
  }
  
  /**
   * Create a password from a hashed string
   */
  static createFromHashed(hashedPassword: string): Password {
    return new Password(hashedPassword, true);
  }
  
  /**
   * Hash the password
   * Note: This is a placeholder. In a real implementation, you would use a proper
   * hashing library like bcrypt, argon2, or scrypt.
   */
  async hash(): Promise<Password> {
    if (this.hashed) {
      return this;
    }
    
    // This is a placeholder for actual hashing
    // In production, use a proper password hashing library
    const hashedValue = `hashed:${this.value}`;
    
    return Password.createFromHashed(hashedValue);
  }
  
  /**
   * Verify a password against this password
   * Note: This is a placeholder. In a real implementation, you would use a proper
   * verification function from a hashing library.
   */
  async verify(plainTextPassword: string): Promise<boolean> {
    if (!this.hashed) {
      return this.value === plainTextPassword;
    }
    
    // This is a placeholder for actual verification
    // In production, use a proper password hashing library
    const hashedAttempt = `hashed:${plainTextPassword}`;
    
    return this.value === hashedAttempt;
  }
}