/**
 * Phone Number Value Object
 * 
 * Represents a phone number with validation logic.
 */

export class PhoneNumber {
  private readonly _value: string;
  
  constructor(value: string) {
    const normalizedValue = PhoneNumber.normalize(value);
    
    if (!PhoneNumber.isValid(normalizedValue)) {
      throw new Error(`Invalid phone number: ${value}`);
    }
    
    this._value = normalizedValue;
  }
  
  /**
   * Get the phone number value
   */
  get value(): string {
    return this._value;
  }
  
  /**
   * Get the formatted phone number
   */
  get formatted(): string {
    // Format as (XXX) XXX-XXXX for US numbers
    if (this._value.length === 10) {
      return `(${this._value.substring(0, 3)}) ${this._value.substring(3, 6)}-${this._value.substring(6)}`;
    }
    
    // For international numbers, just add a + prefix
    return `+${this._value}`;
  }
  
  /**
   * Normalize a phone number by removing non-digit characters
   */
  static normalize(value: string): string {
    return value.replace(/[^\d+]/g, '');
  }
  
  /**
   * Check if a phone number is valid
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    // Remove any non-digit characters except the + for international format
    const digits = value.replace(/[^\d+]/g, '');
    
    // Must have at least 10 digits (US number)
    if (digits.length < 10) {
      return false;
    }
    
    // If it starts with +, ensure it has a valid country code
    if (digits.startsWith('+')) {
      // Simple validation for common country codes
      const validCountryCodes = ['+1', '+44', '+33', '+49', '+61', '+971', '+91'];
      return validCountryCodes.some(code => digits.startsWith(code));
    }
    
    // For US numbers (no + prefix), must be exactly 10 digits
    return digits.length === 10;
  }
  
  /**
   * Convert to string
   */
  toString(): string {
    return this.formatted;
  }
  
  /**
   * Check if two phone numbers are equal
   */
  equals(other: PhoneNumber): boolean {
    return this._value === other.value;
  }
}