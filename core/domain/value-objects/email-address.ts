/**
 * Email Address Value Object
 * 
 * Represents an email address with validation logic.
 */

export class EmailAddress {
  private readonly _value: string;
  
  constructor(value: string) {
    const trimmedValue = value.trim();
    
    if (!EmailAddress.isValid(trimmedValue)) {
      throw new Error(`Invalid email address: ${trimmedValue}`);
    }
    
    this._value = trimmedValue;
  }
  
  /**
   * Get the email address value
   */
  get value(): string {
    return this._value;
  }
  
  /**
   * Check if an email address is valid
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    // Email regex pattern
    const pattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    return pattern.test(value);
  }
  
  /**
   * Convert to string
   */
  toString(): string {
    return this.value;
  }
  
  /**
   * Check if two email addresses are equal
   */
  equals(other: EmailAddress): boolean {
    return this.value.toLowerCase() === other.value.toLowerCase();
  }
}