/**
 * PhoneNumber Value Object
 * 
 * This value object encapsulates a phone number and its validation rules.
 */

/**
 * Phone number validation error types
 */
export enum PhoneValidationError {
  EMPTY = 'Phone number cannot be empty',
  FORMAT = 'Phone number format is invalid',
  LENGTH = 'Phone number length is invalid'
}

/**
 * PhoneNumber value object
 */
export class PhoneNumber {
  private readonly value: string;
  private readonly countryCode: string;
  private readonly nationalNumber: string;
  
  /**
   * Regular expression for international phone number format 
   * Supports formats like +971 XX XXX XXXX or +1 (XXX) XXX-XXXX
   */
  private static readonly PHONE_PATTERN = /^\+[1-9]\d{0,2}[\s-]?\(?(?:\d{1,4})\)?[\s.-]?(?:\d{1,4})[\s.-]?(?:\d{1,4})$/;
  
  /**
   * Minimum and maximum valid lengths for phone numbers (including country code)
   */
  private static readonly MIN_LENGTH = 8;  // Minimum viable international number
  private static readonly MAX_LENGTH = 16; // Maximum practical length with formatting
  
  private constructor(phone: string) {
    this.value = phone.trim();
    
    // Extract country code and national number
    // This is a simplified extraction that works for standard formats
    const matches = this.value.match(/^\+(\d+)[^0-9]+(.*)$/);
    if (matches && matches.length >= 3) {
      this.countryCode = matches[1];
      this.nationalNumber = matches[2].replace(/[^0-9]/g, '');
    } else {
      this.countryCode = '';
      this.nationalNumber = this.value.replace(/[^0-9]/g, '');
    }
  }
  
  /**
   * Create a new PhoneNumber value object
   * @throws Error if the phone number is invalid
   */
  static create(phone: string): PhoneNumber {
    const trimmedPhone = phone.trim();
    
    // Check if phone is empty
    if (!trimmedPhone) {
      throw new Error(PhoneValidationError.EMPTY);
    }
    
    // Check phone length
    if (trimmedPhone.length < PhoneNumber.MIN_LENGTH || 
        trimmedPhone.length > PhoneNumber.MAX_LENGTH) {
      throw new Error(PhoneValidationError.LENGTH);
    }
    
    // Validate phone format
    if (!PhoneNumber.PHONE_PATTERN.test(trimmedPhone)) {
      throw new Error(PhoneValidationError.FORMAT);
    }
    
    return new PhoneNumber(trimmedPhone);
  }
  
  /**
   * Create a new PhoneNumber value object without validation
   * Use with caution! Only when phone is already validated.
   */
  static createWithoutValidation(phone: string): PhoneNumber {
    return new PhoneNumber(phone);
  }
  
  /**
   * Try to create a PhoneNumber, return null if invalid
   */
  static tryCreate(phone: string): PhoneNumber | null {
    try {
      return PhoneNumber.create(phone);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Check if a phone string is valid
   */
  static isValid(phone: string): boolean {
    try {
      PhoneNumber.create(phone);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the raw string value of the phone number
   */
  toString(): string {
    return this.value;
  }
  
  /**
   * Check if this phone equals another phone
   */
  equals(other: PhoneNumber): boolean {
    // Compare by normalizing both numbers (stripping non-digits)
    const thisDigitsOnly = this.value.replace(/\D/g, '');
    const otherDigitsOnly = other.value.replace(/\D/g, '');
    return thisDigitsOnly === otherDigitsOnly;
  }
  
  /**
   * Get the country code part
   */
  getCountryCode(): string {
    return this.countryCode;
  }
  
  /**
   * Get the national number part
   */
  getNationalNumber(): string {
    return this.nationalNumber;
  }
  
  /**
   * Get digits-only format
   */
  getDigitsOnly(): string {
    return this.value.replace(/\D/g, '');
  }
  
  /**
   * Create a masked version of the phone for display
   * Example: +971 XX XXX 1234
   */
  getMasked(): string {
    if (!this.countryCode || !this.nationalNumber) {
      const digitsOnly = this.getDigitsOnly();
      const lastFour = digitsOnly.slice(-4);
      const masked = digitsOnly.slice(0, -4).replace(/\d/g, 'X');
      return `${masked}${lastFour}`;
    }
    
    const lastFour = this.nationalNumber.slice(-4);
    const maskedNational = this.nationalNumber.slice(0, -4).replace(/\d/g, 'X');
    return `+${this.countryCode} ${maskedNational}${lastFour}`;
  }
}