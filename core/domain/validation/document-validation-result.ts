/**
 * DocumentValidationResult Entity
 * 
 * Represents the result of validating media fields within a document.
 */

import { MediaType } from '../media/media-type';
import { ValidationResult } from './validation-result';

/**
 * Field validation result interface
 */
export interface FieldValidationResult {
  path: string;
  url: string;
  expectedType: MediaType;
  isValid: boolean;
  error?: string;
  statusCode?: number;
  statusText?: string;
  mimeType?: string;
}

/**
 * Document validation result properties
 */
export interface DocumentValidationResultProps {
  collection: string;
  documentId: string;
  fields: FieldValidationResult[];
  totalUrls?: number;
  validUrls?: number;
  invalidUrls?: number;
  missingUrls?: number;
  validatedAt: Date;
}

/**
 * Document validation result entity
 */
export class DocumentValidationResult {
  readonly collection: string;
  readonly documentId: string;
  readonly fields: ReadonlyArray<FieldValidationResult>;
  readonly totalUrls: number;
  readonly validUrls: number;
  readonly invalidUrls: number;
  readonly missingUrls: number;
  readonly validatedAt: Date;

  constructor(props: DocumentValidationResultProps) {
    this.collection = props.collection;
    this.documentId = props.documentId;
    this.fields = [...props.fields];
    this.totalUrls = props.totalUrls || props.fields.length;
    this.validUrls = props.validUrls || props.fields.filter(field => field.isValid).length;
    this.invalidUrls = props.invalidUrls || props.fields.filter(field => !field.isValid).length;
    this.missingUrls = props.missingUrls || 0;
    this.validatedAt = props.validatedAt;
  }

  /**
   * Check if document has any invalid URLs
   */
  hasInvalidUrls(): boolean {
    return this.invalidUrls > 0;
  }

  /**
   * Check if document has any missing URLs
   */
  hasMissingUrls(): boolean {
    return this.missingUrls > 0;
  }

  /**
   * Get all invalid field results
   */
  getInvalidFields(): FieldValidationResult[] {
    return this.fields.filter(field => !field.isValid);
  }

  /**
   * Calculate the percentage of valid URLs
   */
  getValidPercentage(): number {
    if (this.totalUrls === 0) return 100;
    return (this.validUrls / this.totalUrls) * 100;
  }

  /**
   * Convert ValidationResult to FieldValidationResult
   */
  static createFieldResult(
    path: string,
    result: ValidationResult,
    expectedType: MediaType
  ): FieldValidationResult {
    return {
      path,
      url: result.url,
      expectedType,
      isValid: result.isValid,
      error: result.error,
      statusCode: result.statusCode,
      statusText: result.statusText,
      mimeType: result.mimeType
    };
  }

  /**
   * Convert to plain object
   */
  toObject(): DocumentValidationResultProps {
    return {
      collection: this.collection,
      documentId: this.documentId,
      fields: [...this.fields],
      totalUrls: this.totalUrls,
      validUrls: this.validUrls,
      invalidUrls: this.invalidUrls,
      missingUrls: this.missingUrls,
      validatedAt: this.validatedAt
    };
  }
}