/**
 * Media Validation Service
 * 
 * This module provides functionality to validate media URLs in Firestore documents.
 * It can identify invalid URLs, mismatched media types, and generate validation reports.
 */

import { validateImageUrl, validateVideoUrl, getPlaceholderUrl, ValidationResult } from './url-validator';

/**
 * Media validation configuration
 */
export interface MediaValidationOptions {
  collections?: string[];
  batchSize?: number;
  maxItems?: number;
  fixInvalidUrls?: boolean;
}

/**
 * Media validation field result
 */
export interface FieldValidationResult {
  field: string;
  url: string;
  isValid: boolean;
  contentType?: string;
  status?: number;
  statusText?: string;
  reason?: string;
  error?: string;
}

/**
 * Document validation result
 */
export interface DocumentValidationResult {
  id: string;
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  results: FieldValidationResult[];
}

/**
 * Collection validation summary
 */
export interface CollectionSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  invalidPercent: number;
  validPercent: number;
  missingPercent: number;
}

/**
 * Validation report
 */
export interface ValidationReport {
  id?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
  invalidResults: FieldValidationResult[];
}

/**
 * URL Fix Result
 */
export interface UrlFixResult {
  id: string;
  collection: string;
  field: string;
  originalUrl: string;
  newUrl: string;
  fixed: boolean;
  error?: string;
}

/**
 * Media validation service
 */
export class MediaValidationService {
  private options: MediaValidationOptions;

  /**
   * Constructor
   * 
   * @param options Media validation options
   */
  constructor(options: MediaValidationOptions = {}) {
    this.options = {
      collections: options.collections || [],
      batchSize: options.batchSize || 50,
      maxItems: options.maxItems || 1000,
      fixInvalidUrls: options.fixInvalidUrls || false
    };
  }

  /**
   * Set media validation options
   * 
   * @param options Media validation options
   */
  setOptions(options: MediaValidationOptions) {
    this.options = {
      ...this.options,
      ...options
    };
  }

  /**
   * Validate media URLs in a document
   * 
   * @param document Firestore document data
   * @param id Document ID
   * @param collection Collection name
   * @returns Promise resolving to document validation result
   */
  async validateDocument(document: any, id: string, collection: string): Promise<DocumentValidationResult> {
    const results: FieldValidationResult[] = [];
    const mediaFields = this.findMediaFields(document);
    
    let totalUrls = 0;
    let validUrls = 0;
    let invalidUrls = 0;
    
    for (const field of mediaFields) {
      const validationResult = await this.validateField(document, field);
      
      if (validationResult) {
        results.push(validationResult);
        totalUrls++;
        
        if (validationResult.isValid) {
          validUrls++;
        } else {
          invalidUrls++;
        }
      }
    }
    
    return {
      id,
      collection,
      totalUrls,
      validUrls,
      invalidUrls,
      results
    };
  }

  /**
   * Validate a media field in a document
   * 
   * @param document Firestore document data
   * @param field Field path
   * @returns Promise resolving to field validation result or undefined
   */
  private async validateField(document: any, field: string): Promise<FieldValidationResult | undefined> {
    try {
      const value = this.getFieldValue(document, field);
      
      if (!value || typeof value !== 'string') {
        return undefined;
      }
      
      const url = value;
      const expectedType = this.getExpectedMediaType(field);
      
      let validationResult: ValidationResult;
      
      if (expectedType === 'image') {
        validationResult = await validateImageUrl(url);
      } else if (expectedType === 'video') {
        validationResult = await validateVideoUrl(url);
      } else {
        validationResult = {
          isValid: false,
          url,
          error: 'Unknown media type'
        };
      }
      
      return {
        field,
        url,
        isValid: validationResult.isValid,
        contentType: validationResult.contentType,
        status: validationResult.status,
        statusText: validationResult.statusText,
        reason: validationResult.isValid ? undefined : 'Request failed',
        error: validationResult.error
      };
    } catch (error) {
      return {
        field,
        url: '',
        isValid: false,
        reason: 'Error processing field',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Find all media fields in a document
   * 
   * @param document Firestore document data
   * @param prefix Field prefix for nested fields
   * @returns Array of field paths
   */
  private findMediaFields(document: any, prefix = ''): string[] {
    const fields: string[] = [];
    
    if (!document || typeof document !== 'object') {
      return fields;
    }
    
    for (const key in document) {
      const value = document[key];
      const field = prefix ? `${prefix}.${key}` : key;
      
      if (this.isMediaField(field, value)) {
        fields.push(field);
      } else if (Array.isArray(value)) {
        // Handle arrays of objects that might contain media
        for (let i = 0; i < value.length; i++) {
          if (typeof value[i] === 'object' && value[i] !== null) {
            const arrayFields = this.findMediaFields(value[i], `${field}.[${i}]`);
            fields.push(...arrayFields);
          } else if (this.isMediaField(`${field}.[${i}]`, value[i])) {
            fields.push(`${field}.[${i}]`);
          }
        }
      } else if (typeof value === 'object' && value !== null) {
        // Recursively check nested objects
        const nestedFields = this.findMediaFields(value, field);
        fields.push(...nestedFields);
      }
    }
    
    return fields;
  }

  /**
   * Check if a field is a media field
   * 
   * @param field Field path
   * @param value Field value
   * @returns True if field is a media field, false otherwise
   */
  private isMediaField(field: string, value: any): boolean {
    if (typeof value !== 'string') {
      return false;
    }
    
    // Check if field path contains image or media indicators
    const lowerField = field.toLowerCase();
    const containsImageIndicator = lowerField.includes('image') || 
                                 lowerField.includes('media') || 
                                 lowerField.includes('photo') || 
                                 lowerField.includes('picture') ||
                                 lowerField.includes('url') ||
                                 lowerField.endsWith('.url');
    
    // Check if value looks like a URL
    const looksLikeUrl = (value.startsWith('http') || value.startsWith('/')) && 
                         (value.endsWith('.jpg') || 
                          value.endsWith('.jpeg') || 
                          value.endsWith('.png') || 
                          value.endsWith('.gif') || 
                          value.endsWith('.webp') ||
                          value.endsWith('.mp4') ||
                          value.endsWith('.webm') ||
                          value.endsWith('.mov'));
    
    return containsImageIndicator && looksLikeUrl;
  }

  /**
   * Get the expected media type for a field
   * 
   * @param field Field path
   * @returns Expected media type ('image' or 'video')
   */
  private getExpectedMediaType(field: string): 'image' | 'video' {
    const lowerField = field.toLowerCase();
    
    if (lowerField.includes('video') || 
        field.endsWith('.mp4') || 
        field.endsWith('.webm') || 
        field.endsWith('.mov')) {
      return 'video';
    }
    
    return 'image';
  }

  /**
   * Get a field value from a document using a path
   * 
   * @param document Firestore document data
   * @param field Field path
   * @returns Field value or undefined
   */
  private getFieldValue(document: any, field: string): any {
    try {
      let current = document;
      const parts = field.split('.');
      
      for (const part of parts) {
        if (part.startsWith('[') && part.endsWith(']')) {
          // Handle array index
          const index = parseInt(part.substring(1, part.length - 1), 10);
          if (Array.isArray(current) && !isNaN(index) && index >= 0 && index < current.length) {
            current = current[index];
          } else {
            return undefined;
          }
        } else {
          // Handle object property
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            return undefined;
          }
        }
      }
      
      return current;
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Generate a report from validation results
   * 
   * @param results Array of document validation results
   * @param startTime Validation start time
   * @param endTime Validation end time
   * @returns Validation report
   */
  generateReport(
    results: DocumentValidationResult[], 
    startTime: Date, 
    endTime: Date
  ): ValidationReport {
    const collectionMap = new Map<string, CollectionSummary>();
    const invalidResults: FieldValidationResult[] = [];
    
    let totalDocuments = 0;
    let totalFields = 0;
    let validUrls = 0;
    let invalidUrls = 0;
    let missingUrls = 0;
    
    // Process results
    for (const result of results) {
      totalDocuments++;
      totalFields += result.totalUrls;
      validUrls += result.validUrls;
      invalidUrls += result.invalidUrls;
      
      // Add invalid URLs to report
      for (const fieldResult of result.results) {
        if (!fieldResult.isValid) {
          invalidResults.push({
            ...fieldResult,
            field: `${result.collection} (${result.id}): ${fieldResult.field}`
          });
        }
      }
      
      // Update collection summary
      if (!collectionMap.has(result.collection)) {
        collectionMap.set(result.collection, {
          collection: result.collection,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          validPercent: 0,
          invalidPercent: 0,
          missingPercent: 0
        });
      }
      
      const summary = collectionMap.get(result.collection)!;
      summary.totalUrls += result.totalUrls;
      summary.validUrls += result.validUrls;
      summary.invalidUrls += result.invalidUrls;
    }
    
    // Calculate percentages for each collection
    for (const summary of collectionMap.values()) {
      if (summary.totalUrls > 0) {
        summary.validPercent = Math.round((summary.validUrls / summary.totalUrls) * 100);
        summary.invalidPercent = Math.round((summary.invalidUrls / summary.totalUrls) * 100);
        summary.missingPercent = Math.round((summary.missingUrls / summary.totalUrls) * 100);
      }
    }
    
    // Sort invalid results by collection and document ID
    invalidResults.sort((a, b) => a.field.localeCompare(b.field));
    
    return {
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
      totalDocuments,
      totalFields,
      validUrls,
      invalidUrls,
      missingUrls,
      collectionSummaries: Array.from(collectionMap.values()),
      invalidResults
    };
  }

  /**
   * Fix invalid URLs in a document
   * 
   * @param document Firestore document data
   * @param validation Document validation result
   * @returns Object with updated document and array of fix results
   */
  fixInvalidUrls(document: any, validation: DocumentValidationResult): { 
    updatedDocument: any; 
    fixes: UrlFixResult[];
  } {
    const updatedDocument = JSON.parse(JSON.stringify(document));
    const fixes: UrlFixResult[] = [];
    
    for (const result of validation.results) {
      if (!result.isValid) {
        try {
          const field = result.field;
          const expectedType = this.getExpectedMediaType(field);
          const placeholderUrl = getPlaceholderUrl(result.url, expectedType);
          
          // Update the document with placeholder URL
          this.updateFieldValue(updatedDocument, field, placeholderUrl);
          
          fixes.push({
            id: validation.id,
            collection: validation.collection,
            field,
            originalUrl: result.url,
            newUrl: placeholderUrl,
            fixed: true
          });
        } catch (error) {
          fixes.push({
            id: validation.id,
            collection: validation.collection,
            field: result.field,
            originalUrl: result.url,
            newUrl: '',
            fixed: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    return { updatedDocument, fixes };
  }

  /**
   * Update a field value in a document using a path
   * 
   * @param document Firestore document data
   * @param field Field path
   * @param value New field value
   */
  private updateFieldValue(document: any, field: string, value: any): void {
    try {
      const parts = field.split('.');
      let current = document;
      
      // Navigate to the parent object of the field
      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        
        if (part.startsWith('[') && part.endsWith(']')) {
          // Handle array index
          const index = parseInt(part.substring(1, part.length - 1), 10);
          if (Array.isArray(current) && !isNaN(index) && index >= 0 && index < current.length) {
            current = current[index];
          } else {
            throw new Error(`Invalid array index: ${part}`);
          }
        } else {
          // Handle object property
          if (current && typeof current === 'object' && part in current) {
            current = current[part];
          } else {
            throw new Error(`Property not found: ${part}`);
          }
        }
      }
      
      // Get the last part (property or array index)
      const lastPart = parts[parts.length - 1];
      
      if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
        // Update array element
        const index = parseInt(lastPart.substring(1, lastPart.length - 1), 10);
        if (Array.isArray(current) && !isNaN(index) && index >= 0 && index < current.length) {
          current[index] = value;
        } else {
          throw new Error(`Invalid array index: ${lastPart}`);
        }
      } else {
        // Update object property
        if (current && typeof current === 'object') {
          current[lastPart] = value;
        } else {
          throw new Error(`Cannot update property: ${lastPart}`);
        }
      }
    } catch (error) {
      throw new Error(`Failed to update field ${field}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}