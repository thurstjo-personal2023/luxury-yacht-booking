/**
 * Phone Number Value Object
 * 
 * This represents a validated phone number in the domain model.
 */

/**
 * Regular expression for validating phone numbers
 * This validates international phone numbers in E.164 format
 * or formats with separators like +1-234-567-8901 or +1 (234) 567-8901
 */
const PHONE_REGEX = /^\+?[1-9]\d{1,14}$|^\+?[1-9][\d\s\-()]{1,20}$/;

/**
 * Phone number value object
 */
export class PhoneNumber {
  private readonly value: string;
  private readonly countryCode?: string;
  
  constructor(phoneNumber: string, countryCode?: string) {
    this.validate(phoneNumber);
    this.value = this.normalize(phoneNumber);
    this.countryCode = countryCode;
  }
  
  /**
   * Get the phone number value
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Get the country code
   */
  getCountryCode(): string | undefined {
    return this.countryCode;
  }
  
  /**
   * Check if the phone number is valid
   */
  private validate(phoneNumber: string): void {
    if (!phoneNumber) {
      throw new Error('Phone number is required');
    }
    
    const trimmedPhone = phoneNumber.trim();
    
    if (!PHONE_REGEX.test(trimmedPhone)) {
      throw new Error('Invalid phone number format');
    }
  }
  
  /**
   * Normalize the phone number by removing non-digit characters except leading +
   */
  private normalize(phoneNumber: string): string {
    const trimmedPhone = phoneNumber.trim();
    
    // If it's an international number (starting with +), keep the + sign
    if (trimmedPhone.startsWith('+')) {
      return '+' + trimmedPhone.substring(1).replace(/[^\d]/g, '');
    }
    
    // Otherwise, just keep the digits
    return trimmedPhone.replace(/[^\d]/g, '');
  }
  
  /**
   * Format the phone number for display
   */
  format(): string {
    // Simple formatting logic for display - could be expanded based on country
    const digits = this.value.replace(/^\+/, '');
    
    if (digits.length === 10) {
      // US/Canada format: (XXX) XXX-XXXX
      return `(${digits.substring(0, 3)}) ${digits.substring(3, 6)}-${digits.substring(6)}`;
    } else if (digits.length === 11 && digits.startsWith('1')) {
      // US/Canada with country code: +1 (XXX) XXX-XXXX
      return `+1 (${digits.substring(1, 4)}) ${digits.substring(4, 7)}-${digits.substring(7)}`;
    } else if (this.value.startsWith('+')) {
      // International format with country code: +XX XXX XXX XXXX
      return this.value;
    }
    
    // Default format
    return this.value;
  }
  
  /**
   * Check if two phone numbers are equal
   */
  equals(other: PhoneNumber): boolean {
    return this.value === other.getValue();
  }
  
  /**
   * Create a phone number from a string
   */
  static create(phoneNumber: string, countryCode?: string): PhoneNumber {
    return new PhoneNumber(phoneNumber, countryCode);
  }
  
  /**
   * Convert the phone number to a string
   */
  toString(): string {
    return this.value;
  }
}