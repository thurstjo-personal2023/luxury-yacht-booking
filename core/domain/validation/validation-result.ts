/**
 * Validation Result
 * 
 * A value object that represents the result of a URL validation.
 */

/**
 * Properties for creating a validation result
 */
export interface ValidationResultProps {
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
  validatedAt?: Date;
}

/**
 * Validation result
 */
export class ValidationResult {
  private readonly url: string;
  private readonly isValid: boolean;
  private readonly status?: number;
  private readonly statusText?: string;
  private readonly contentType?: string;
  private readonly error?: string;
  private readonly validatedAt: Date;

  constructor(props: ValidationResultProps) {
    this.url = props.url;
    this.isValid = props.isValid;
    this.status = props.status;
    this.statusText = props.statusText;
    this.contentType = props.contentType;
    this.error = props.error;
    this.validatedAt = props.validatedAt || new Date();
  }

  /**
   * Create a valid validation result
   */
  static createValid(
    url: string,
    contentType?: string,
    status?: number,
    statusText?: string
  ): ValidationResult {
    return new ValidationResult({
      url,
      isValid: true,
      contentType,
      status,
      statusText
    });
  }

  /**
   * Create an invalid validation result
   */
  static createInvalid(
    url: string,
    error: string,
    status?: number,
    statusText?: string,
    contentType?: string
  ): ValidationResult {
    return new ValidationResult({
      url,
      isValid: false,
      error,
      status,
      statusText,
      contentType
    });
  }

  /**
   * Get the URL that was validated
   */
  getUrl(): string {
    return this.url;
  }

  /**
   * Check if the URL is valid
   */
  getIsValid(): boolean {
    return this.isValid;
  }

  /**
   * Get the HTTP status code
   */
  getStatus(): number | undefined {
    return this.status;
  }

  /**
   * Get the HTTP status text
   */
  getStatusText(): string | undefined {
    return this.statusText;
  }

  /**
   * Get the content type
   */
  getContentType(): string | undefined {
    return this.contentType;
  }

  /**
   * Get the error message
   */
  getError(): string | undefined {
    return this.error;
  }

  /**
   * Get the validation timestamp
   */
  getValidatedAt(): Date {
    return this.validatedAt;
  }

  /**
   * Convert to a plain object
   */
  toObject(): ValidationResultProps {
    return {
      url: this.url,
      isValid: this.isValid,
      status: this.status,
      statusText: this.statusText,
      contentType: this.contentType,
      error: this.error,
      validatedAt: this.validatedAt
    };
  }
}