/**
 * PhoneNumber Value Object
 * 
 * This represents a phone number with validation rules.
 */

export class PhoneNumber {
  private readonly value: string;

  /**
   * Create a new PhoneNumber
   * @throws Error if the phone number is invalid
   */
  private constructor(phone: string) {
    if (!PhoneNumber.isValid(phone)) {
      throw new Error(`Invalid phone number: ${phone}`);
    }
    this.value = PhoneNumber.normalize(phone);
  }

  /**
   * Check if a phone string is valid
   */
  public static isValid(phone: string): boolean {
    if (!phone || typeof phone !== 'string') return false;
    
    // Remove all non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Phone numbers should have at least 8 digits and not more than 15
    // This is a simplified validation - real-world validation would be more complex
    return digitsOnly.length >= 8 && digitsOnly.length <= 15;
  }

  /**
   * Normalize a phone number by removing formatting but keeping the + prefix
   */
  private static normalize(phone: string): string {
    // Keep the + prefix if it exists
    const hasPlus = phone.startsWith('+');
    
    // Remove all non-digit characters
    const digitsOnly = phone.replace(/\D/g, '');
    
    // Re-add the + if it was present
    return hasPlus ? `+${digitsOnly}` : digitsOnly;
  }

  /**
   * Create a new PhoneNumber instance
   * @throws Error if the phone number is invalid
   */
  public static create(phone: string): PhoneNumber {
    return new PhoneNumber(phone);
  }

  /**
   * Get the string value of the phone number
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Compare two PhoneNumber objects for equality
   */
  public equals(other: PhoneNumber): boolean {
    return this.value === other.value;
  }

  /**
   * Convert to string representation
   */
  public toString(): string {
    return this.value;
  }
}