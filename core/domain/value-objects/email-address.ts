/**
 * EmailAddress Value Object
 * 
 * This value object encapsulates an email address and its validation rules.
 */

/**
 * Email validation error types
 */
export enum EmailValidationError {
  EMPTY = 'Email address cannot be empty',
  FORMAT = 'Email address format is invalid',
  LENGTH = 'Email address length is invalid'
}

/**
 * EmailAddress value object
 */
export class EmailAddress {
  private readonly value: string;
  
  /**
   * Regular expression pattern for validating email addresses
   * This pattern is RFC 5322 compliant and covers most valid email formats
   */
  private static readonly EMAIL_PATTERN = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
  
  /**
   * Minimum and maximum valid lengths for email addresses
   */
  private static readonly MIN_LENGTH = 5;  // a@b.c
  private static readonly MAX_LENGTH = 254; // Maximum length according to RFC 5321
  
  private constructor(email: string) {
    this.value = email.trim().toLowerCase();
  }
  
  /**
   * Create a new EmailAddress value object
   * @throws Error if the email is invalid
   */
  static create(email: string): EmailAddress {
    const trimmedEmail = email.trim();
    
    // Check if email is empty
    if (!trimmedEmail) {
      throw new Error(EmailValidationError.EMPTY);
    }
    
    // Check email length
    if (trimmedEmail.length < EmailAddress.MIN_LENGTH || 
        trimmedEmail.length > EmailAddress.MAX_LENGTH) {
      throw new Error(EmailValidationError.LENGTH);
    }
    
    // Validate email format
    if (!EmailAddress.EMAIL_PATTERN.test(trimmedEmail)) {
      throw new Error(EmailValidationError.FORMAT);
    }
    
    return new EmailAddress(trimmedEmail);
  }
  
  /**
   * Create a new EmailAddress value object without validation
   * Use with caution! Only when email is already validated.
   */
  static createWithoutValidation(email: string): EmailAddress {
    return new EmailAddress(email);
  }
  
  /**
   * Try to create an EmailAddress, return null if invalid
   */
  static tryCreate(email: string): EmailAddress | null {
    try {
      return EmailAddress.create(email);
    } catch (error) {
      return null;
    }
  }
  
  /**
   * Check if an email string is valid
   */
  static isValid(email: string): boolean {
    try {
      EmailAddress.create(email);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Get the string value of the email address
   */
  toString(): string {
    return this.value;
  }
  
  /**
   * Check if this email equals another email
   */
  equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }
  
  /**
   * Get the domain part of the email address
   */
  getDomain(): string {
    return this.value.split('@')[1];
  }
  
  /**
   * Get the local part of the email address (before the @)
   */
  getLocalPart(): string {
    return this.value.split('@')[0];
  }
  
  /**
   * Create a masked version of the email for display
   * Example: j****e@example.com
   */
  getMasked(): string {
    const [local, domain] = this.value.split('@');
    
    if (local.length <= 2) {
      return `${local[0]}*@${domain}`;
    }
    
    return `${local[0]}${Array(local.length - 1).fill('*').join('')}@${domain}`;
  }
}