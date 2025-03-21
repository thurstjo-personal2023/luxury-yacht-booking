/**
 * Password Value Object
 * 
 * Represents a password with validation logic.
 */

export class Password {
  private readonly _value: string;
  
  constructor(value: string) {
    const trimmedValue = value.trim();
    
    if (!Password.isValid(trimmedValue)) {
      throw new Error(
        'Invalid password. Password must be at least 8 characters long, ' +
        'contain at least one uppercase letter, one lowercase letter, ' +
        'one number, and one special character.'
      );
    }
    
    this._value = trimmedValue;
  }
  
  /**
   * Get the password value
   */
  get value(): string {
    return this._value;
  }
  
  /**
   * Check if a password is valid
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string' || value.length < 8) {
      return false;
    }
    
    // Check for at least one uppercase letter
    if (!/[A-Z]/.test(value)) {
      return false;
    }
    
    // Check for at least one lowercase letter
    if (!/[a-z]/.test(value)) {
      return false;
    }
    
    // Check for at least one number
    if (!/[0-9]/.test(value)) {
      return false;
    }
    
    // Check for at least one special character
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value)) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Create a password hash (for illustration - in real app would use bcrypt)
   */
  hash(): string {
    // In a real application, we would use a proper hashing algorithm
    // For demonstration purposes, we'll just prepend "hashed_" to the password
    return `hashed_${this._value}`;
  }
  
  /**
   * Verify that a given password matches this password
   */
  verify(password: string): boolean {
    return this._value === password;
  }
}