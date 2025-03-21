/**
 * ValidationResult Value Object
 * 
 * Represents the result of validating a media URL.
 */

/**
 * ValidationResult properties
 */
export interface ValidationResultProps {
  url: string;
  isValid: boolean;
  error?: string;
  statusCode?: number;
  statusText?: string;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  detectedType?: string;
  validatedAt: Date;
}

/**
 * ValidationResult value object
 */
export class ValidationResult {
  readonly url: string;
  readonly isValid: boolean;
  readonly error?: string;
  readonly statusCode?: number;
  readonly statusText?: string;
  readonly mimeType?: string;
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly detectedType?: string;
  readonly validatedAt: Date;

  constructor(props: ValidationResultProps) {
    this.url = props.url;
    this.isValid = props.isValid;
    this.error = props.error;
    this.statusCode = props.statusCode;
    this.statusText = props.statusText;
    this.mimeType = props.mimeType;
    this.size = props.size;
    this.width = props.width;
    this.height = props.height;
    this.duration = props.duration;
    this.detectedType = props.detectedType;
    this.validatedAt = props.validatedAt;
  }

  /**
   * Create a successful validation result
   */
  static createValid(
    url: string,
    options: {
      statusCode?: number;
      statusText?: string;
      mimeType?: string;
      size?: number;
      width?: number;
      height?: number;
      duration?: number;
      detectedType?: string;
    } = {}
  ): ValidationResult {
    return new ValidationResult({
      url,
      isValid: true,
      statusCode: options.statusCode,
      statusText: options.statusText,
      mimeType: options.mimeType,
      size: options.size,
      width: options.width,
      height: options.height,
      duration: options.duration,
      detectedType: options.detectedType,
      validatedAt: new Date()
    });
  }

  /**
   * Create a failed validation result
   */
  static createInvalid(
    url: string,
    error: string,
    options: {
      statusCode?: number;
      statusText?: string;
      mimeType?: string;
    } = {}
  ): ValidationResult {
    return new ValidationResult({
      url,
      isValid: false,
      error,
      statusCode: options.statusCode,
      statusText: options.statusText,
      mimeType: options.mimeType,
      validatedAt: new Date()
    });
  }

  /**
   * Convert to plain object
   */
  toObject(): ValidationResultProps {
    return {
      url: this.url,
      isValid: this.isValid,
      error: this.error,
      statusCode: this.statusCode,
      statusText: this.statusText,
      mimeType: this.mimeType,
      size: this.size,
      width: this.width,
      height: this.height,
      duration: this.duration,
      detectedType: this.detectedType,
      validatedAt: this.validatedAt
    };
  }
}