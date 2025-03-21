/**
 * Document Validation Result
 * 
 * A value object that represents the result of validating all media URLs in a document.
 */

import { ValidationResult, ValidationResultProps } from './validation-result';

/**
 * Invalid field result
 */
export interface InvalidFieldResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
}

/**
 * Properties for creating a document validation result
 */
export interface DocumentValidationResultProps {
  collection: string;
  documentId: string;
  fields: Map<string, ValidationResultProps>;
  validatedAt?: Date;
}

/**
 * Document validation result
 */
export class DocumentValidationResult {
  private readonly collection: string;
  private readonly documentId: string;
  private readonly fields: Map<string, ValidationResult>;
  private readonly validatedAt: Date;
  private readonly totalUrls: number;
  private readonly validUrls: number;
  private readonly invalidUrls: number;
  private readonly missingUrls: number;

  constructor(props: DocumentValidationResultProps) {
    this.collection = props.collection;
    this.documentId = props.documentId;
    this.validatedAt = props.validatedAt || new Date();
    
    // Convert field results to ValidationResult objects
    this.fields = new Map();
    for (const [field, result] of props.fields.entries()) {
      this.fields.set(field, new ValidationResult(result));
    }
    
    // Calculate statistics
    this.totalUrls = this.fields.size;
    this.validUrls = Array.from(this.fields.values()).filter(r => r.getIsValid()).length;
    this.invalidUrls = Array.from(this.fields.values()).filter(r => !r.getIsValid()).length;
    this.missingUrls = 0; // For now, missing URLs are counted as invalid
  }

  /**
   * Get the collection name
   */
  getCollection(): string {
    return this.collection;
  }

  /**
   * Get the document ID
   */
  getDocumentId(): string {
    return this.documentId;
  }

  /**
   * Get all field validation results
   */
  getFields(): Map<string, ValidationResult> {
    return this.fields;
  }

  /**
   * Get the validation timestamp
   */
  getValidatedAt(): Date {
    return this.validatedAt;
  }

  /**
   * Get total number of URLs validated
   */
  getTotalUrls(): number {
    return this.totalUrls;
  }

  /**
   * Get number of valid URLs
   */
  getValidUrls(): number {
    return this.validUrls;
  }

  /**
   * Get number of invalid URLs
   */
  getInvalidUrls(): number {
    return this.invalidUrls;
  }

  /**
   * Get number of missing URLs
   */
  getMissingUrls(): number {
    return this.missingUrls;
  }

  /**
   * Check if the document has any invalid URLs
   */
  hasInvalidUrls(): boolean {
    return this.invalidUrls > 0;
  }

  /**
   * Get all invalid fields
   */
  getInvalidFields(): InvalidFieldResult[] {
    const invalidFields: InvalidFieldResult[] = [];
    
    for (const [field, result] of this.fields.entries()) {
      if (!result.getIsValid()) {
        invalidFields.push({
          field,
          url: result.getUrl(),
          isValid: false,
          status: result.getStatus(),
          statusText: result.getStatusText(),
          contentType: result.getContentType(),
          error: result.getError()
        });
      }
    }
    
    return invalidFields;
  }

  /**
   * Convert to a plain object
   */
  toObject(): any {
    return {
      collection: this.collection,
      documentId: this.documentId,
      validatedAt: this.validatedAt,
      totalUrls: this.totalUrls,
      validUrls: this.validUrls,
      invalidUrls: this.invalidUrls,
      missingUrls: this.missingUrls,
      fields: Array.from(this.fields.entries()).map(([field, result]) => ({
        field,
        ...result.toObject()
      })),
      invalidFields: this.getInvalidFields()
    };
  }
}