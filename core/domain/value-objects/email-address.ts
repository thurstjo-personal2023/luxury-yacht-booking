/**
 * Email Address Value Object
 * 
 * This represents a validated email address in the domain model.
 */

/**
 * Regular expression for validating email addresses
 */
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Email address value object
 */
export class EmailAddress {
  private readonly value: string;
  
  constructor(email: string) {
    this.validate(email);
    this.value = email.toLowerCase().trim();
  }
  
  /**
   * Get the email address value
   */
  getValue(): string {
    return this.value;
  }
  
  /**
   * Check if the email address is valid
   */
  private validate(email: string): void {
    if (!email) {
      throw new Error('Email address is required');
    }
    
    const trimmedEmail = email.trim();
    
    if (trimmedEmail.length > 320) {
      throw new Error('Email address is too long');
    }
    
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      throw new Error('Invalid email address format');
    }
  }
  
  /**
   * Check if two email addresses are equal
   */
  equals(other: EmailAddress): boolean {
    return this.value === other.getValue();
  }
  
  /**
   * Create an email address from a string
   */
  static create(email: string): EmailAddress {
    return new EmailAddress(email);
  }
  
  /**
   * Convert the email address to a string
   */
  toString(): string {
    return this.value;
  }
}