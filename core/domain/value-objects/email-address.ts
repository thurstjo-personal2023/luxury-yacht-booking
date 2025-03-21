/**
 * EmailAddress Value Object
 * 
 * This represents an email address with validation rules.
 */

export class EmailAddress {
  private readonly value: string;

  /**
   * Create a new EmailAddress
   * @throws Error if the email is invalid
   */
  private constructor(email: string) {
    if (!EmailAddress.isValid(email)) {
      throw new Error(`Invalid email address: ${email}`);
    }
    this.value = email.toLowerCase();
  }

  /**
   * Check if an email string is valid
   */
  public static isValid(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    
    // Simple email validation regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a new EmailAddress instance
   * @throws Error if the email is invalid
   */
  public static create(email: string): EmailAddress {
    return new EmailAddress(email);
  }

  /**
   * Get the string value of the email address
   */
  public getValue(): string {
    return this.value;
  }

  /**
   * Compare two EmailAddress objects for equality
   */
  public equals(other: EmailAddress): boolean {
    return this.value === other.value;
  }

  /**
   * Convert to string representation
   */
  public toString(): string {
    return this.value;
  }
}