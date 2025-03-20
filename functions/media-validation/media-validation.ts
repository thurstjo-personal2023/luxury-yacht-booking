/**
 * Media Validation Service
 * 
 * This module provides functionality to validate media URLs in Firestore documents.
 * It can detect invalid URLs, missing media, and other issues.
 */
import { URLValidator, URLValidationResult } from './url-validator';

/**
 * Configuration for the media validation service
 */
export interface MediaValidationOptions {
  /**
   * Base URL for the application (used to convert relative URLs)
   */
  baseUrl: string;
  
  /**
   * Maximum number of concurrent validation operations
   */
  concurrency?: number;
  
  /**
   * Timeout for each validation operation (ms)
   */
  timeout?: number;
  
  /**
   * Logger function for debug messages
   */
  logDebug?: (message: string) => void;
  
  /**
   * Logger function for information messages
   */
  logInfo: (message: string) => void;
  
  /**
   * Logger function for error messages
   */
  logError: (message: string, error?: any) => void;
  
  /**
   * Whether to validate images
   */
  validateImages?: boolean;
  
  /**
   * Whether to validate videos
   */
  validateVideos?: boolean;
  
  /**
   * Pattern to identify relative URLs
   */
  relativeUrlPattern?: RegExp;
}

/**
 * Result of validation for a single field
 */
export interface FieldValidationResult {
  /**
   * Path to the field (e.g., 'media[0].url')
   */
  path: string;
  
  /**
   * Value of the field (the URL)
   */
  value: string;
  
  /**
   * Expected media type for this field
   */
  expectedType: 'image' | 'video' | 'unknown';
  
  /**
   * Actual media type found during validation
   */
  actualType?: 'image' | 'video' | 'other';
  
  /**
   * Whether the field is valid
   */
  isValid: boolean;
  
  /**
   * Whether the field is a relative URL
   */
  isRelative?: boolean;
  
  /**
   * Error message if validation failed
   */
  error?: string;
  
  /**
   * HTTP status code from validation attempt
   */
  status?: number;
  
  /**
   * Content type from validation attempt
   */
  contentType?: string;
  
  /**
   * Whether the URL was normalized during validation
   */
  wasNormalized?: boolean;
  
  /**
   * Original value before normalization
   */
  originalValue?: string;
}

/**
 * Result of validation for a single document
 */
export interface DocumentValidationResult {
  /**
   * Document ID
   */
  id: string;
  
  /**
   * Document path
   */
  path: string;
  
  /**
   * Number of fields validated
   */
  fieldCount: number;
  
  /**
   * Number of invalid fields
   */
  invalidCount: number;
  
  /**
   * Number of relative URLs found
   */
  relativeUrlCount: number;
  
  /**
   * Time taken for validation (ms)
   */
  validationTimeMs: number;
  
  /**
   * List of validation results for each field
   */
  fieldResults: FieldValidationResult[];
  
  /**
   * Whether the document has any invalid fields
   */
  hasInvalidFields: boolean;
  
  /**
   * Whether the document has any relative URLs
   */
  hasRelativeUrls: boolean;
}

/**
 * Result of validation for a collection
 */
export interface CollectionValidationResult {
  /**
   * Collection name
   */
  collection: string;
  
  /**
   * Number of documents validated
   */
  documentCount: number;
  
  /**
   * Number of documents with invalid fields
   */
  invalidDocumentCount: number;
  
  /**
   * Number of fields validated
   */
  fieldCount: number;
  
  /**
   * Number of invalid fields
   */
  invalidFieldCount: number;
  
  /**
   * Number of relative URLs found
   */
  relativeUrlCount: number;
  
  /**
   * Time taken for validation (ms)
   */
  validationTimeMs: number;
  
  /**
   * List of invalid fields across all documents
   */
  invalidFields: FieldValidationResult[];
  
  /**
   * List of relative URLs across all documents
   */
  relativeUrls: FieldValidationResult[];
}

/**
 * Result of URL fixing for a field
 */
export interface FieldFixResult {
  /**
   * Path to the field (e.g., 'media[0].url')
   */
  path: string;
  
  /**
   * Original value before fixing
   */
  originalValue: string;
  
  /**
   * New value after fixing
   */
  newValue: string;
  
  /**
   * Type of fix applied
   */
  fixType: 'relative-to-absolute' | 'replace-invalid' | 'type-mismatch';
  
  /**
   * Whether the fix was successful
   */
  success: boolean;
  
  /**
   * Error message if fix failed
   */
  error?: string;
}

/**
 * Result of URL fixing for a document
 */
export interface DocumentFixResult {
  /**
   * Document ID
   */
  id: string;
  
  /**
   * Document path
   */
  path: string;
  
  /**
   * Number of fields fixed
   */
  fixedCount: number;
  
  /**
   * List of fix results for each field
   */
  fieldResults: FieldFixResult[];
  
  /**
   * Whether the document was updated
   */
  wasUpdated: boolean;
  
  /**
   * Error message if update failed
   */
  error?: string;
}

/**
 * Result of URL fixing for a collection
 */
export interface CollectionFixResult {
  /**
   * Collection name
   */
  collection: string;
  
  /**
   * Number of documents fixed
   */
  documentCount: number;
  
  /**
   * Number of fields fixed
   */
  fieldCount: number;
  
  /**
   * Time taken for fixing (ms)
   */
  fixTimeMs: number;
  
  /**
   * List of fix results for each document
   */
  documentResults: DocumentFixResult[];
}

/**
 * Result of media validation for all collections
 */
export interface MediaValidationReport {
  /**
   * Timestamp of validation
   */
  timestamp: number;
  
  /**
   * Results for each collection
   */
  collections: Record<string, CollectionValidationResult>;
  
  /**
   * Summary statistics
   */
  stats: {
    /**
     * Total number of documents validated
     */
    documentCount: number;
    
    /**
     * Total number of fields validated
     */
    fieldCount: number;
    
    /**
     * Total number of invalid fields
     */
    invalidFieldCount: number;
    
    /**
     * Total number of relative URLs found
     */
    relativeUrlCount: number;
    
    /**
     * Total number of image URLs validated
     */
    imageCount: number;
    
    /**
     * Total number of video URLs validated
     */
    videoCount: number;
    
    /**
     * Number of invalid URLs by collection
     */
    byCollection: Record<string, {
      documentCount: number;
      invalidCount: number;
      relativeCount: number;
    }>;
    
    /**
     * Time taken for validation (ms)
     */
    validationTimeMs: number;
  };
  
  /**
   * List of all invalid fields
   */
  invalid: FieldValidationResult[];
  
  /**
   * List of all relative URLs
   */
  relative: FieldValidationResult[];
  
  /**
   * Detailed information about each invalid item
   */
  invalidItemDetails?: Array<{
    collection: string;
    documentId: string;
    path: string;
    field: FieldValidationResult;
  }>;
}

/**
 * Result of URL fixing
 */
export interface UrlFixResult {
  /**
   * Timestamp of fix
   */
  timestamp: number;
  
  /**
   * Results for each collection
   */
  collections: Record<string, CollectionFixResult>;
  
  /**
   * Summary statistics
   */
  stats: {
    /**
     * Total number of documents processed
     */
    documentCount: number;
    
    /**
     * Total number of documents fixed
     */
    fixedDocumentCount: number;
    
    /**
     * Total number of fields fixed
     */
    fixedFieldCount: number;
    
    /**
     * Number of fixed fields by collection
     */
    byCollection: Record<string, {
      documentCount: number;
      fixedCount: number;
    }>;
    
    /**
     * Time taken for fixing (ms)
     */
    fixTimeMs: number;
  };
  
  /**
   * List of all field fixes
   */
  fixes: FieldFixResult[];
}

/**
 * Media Validation Service
 * 
 * This class provides methods to validate media URLs in Firestore documents.
 */
export class MediaValidationService {
  private options: Required<MediaValidationOptions>;
  private urlValidator: URLValidator;
  
  /**
   * Create a new media validation service
   */
  constructor(options: MediaValidationOptions) {
    // Set default options
    this.options = {
      baseUrl: options.baseUrl,
      concurrency: options.concurrency || 5,
      timeout: options.timeout || 5000,
      logDebug: options.logDebug || console.debug,
      logInfo: options.logInfo,
      logError: options.logError,
      validateImages: options.validateImages !== false,
      validateVideos: options.validateVideos !== false,
      relativeUrlPattern: options.relativeUrlPattern || /^\/[^\/].*/
    };
    
    // Create URL validator
    this.urlValidator = new URLValidator({
      logError: this.options.logError,
      logInfo: this.options.logInfo,
      isRelativeUrlPattern: this.options.relativeUrlPattern,
      timeout: this.options.timeout
    });
  }
  
  /**
   * Validate a specific field in a document
   * 
   * @param document The document containing the field
   * @param path Path to the field in the document
   * @param expectedType Expected media type ('image', 'video', or 'unknown')
   * @returns A validation result for the field
   */
  async validateField(
    document: any, 
    path: string, 
    expectedType: 'image' | 'video' | 'unknown' = 'unknown'
  ): Promise<FieldValidationResult> {
    // Get the field value
    const value = this.getValueAtPath(document, path);
    
    // Create result object
    const result: FieldValidationResult = {
      path,
      value,
      expectedType,
      isValid: false
    };
    
    // Skip empty values
    if (!value) {
      result.isValid = false;
      result.error = 'Empty URL';
      return result;
    }
    
    // Check if it's a relative URL
    result.isRelative = this.urlValidator.isRelativeURL(value);
    
    // Normalize relative URLs if needed
    if (result.isRelative) {
      result.originalValue = value;
      result.value = this.urlValidator.normalizePotentialRelativeURL(value, this.options.baseUrl);
      result.wasNormalized = true;
    }
    
    // Skip validation for certain cases (can be customized)
    if (
      value.startsWith('blob:') || 
      value.startsWith('data:') || 
      value.includes('localhost') ||
      value.includes('firebasestorage.googleapis.com') // Skip Firebase Storage URLs for now
    ) {
      result.isValid = true;
      return result;
    }
    
    try {
      // Validate the URL
      const expectedMediaType = expectedType === 'unknown' ? undefined : expectedType;
      const validationResult = await this.urlValidator.validateURL(result.value, expectedMediaType);
      
      // Copy validation results to field result
      result.isValid = validationResult.isValid;
      result.error = validationResult.error;
      result.status = validationResult.status;
      result.contentType = validationResult.contentType;
      result.actualType = validationResult.mediaType;
      
      // Type validation
      if (
        result.isValid && 
        expectedType !== 'unknown' && 
        result.actualType && 
        result.actualType !== expectedType
      ) {
        result.isValid = false;
        result.error = `Expected ${expectedType}, but got ${result.actualType}`;
      }
    } catch (error: any) {
      result.isValid = false;
      result.error = `Validation error: ${error.message}`;
    }
    
    return result;
  }
  
  /**
   * Validate all media fields in a document
   * 
   * @param document The document to validate
   * @param documentId ID of the document
   * @param path Path to the document
   * @returns A validation result for the document
   */
  async validateDocument(document: any, documentId: string, path: string): Promise<DocumentValidationResult> {
    const startTime = Date.now();
    
    // Find all fields that might contain media URLs
    const mediaFields = this.findMediaFields(document);
    
    // Initialize result
    const result: DocumentValidationResult = {
      id: documentId,
      path,
      fieldCount: mediaFields.length,
      invalidCount: 0,
      relativeUrlCount: 0,
      validationTimeMs: 0,
      fieldResults: [],
      hasInvalidFields: false,
      hasRelativeUrls: false
    };
    
    // Skip if no media fields
    if (mediaFields.length === 0) {
      result.validationTimeMs = Date.now() - startTime;
      return result;
    }
    
    // Validate each field
    for (const field of mediaFields) {
      const fieldResult = await this.validateField(document, field.path, field.type);
      result.fieldResults.push(fieldResult);
      
      // Update counters
      if (!fieldResult.isValid) {
        result.invalidCount++;
        result.hasInvalidFields = true;
      }
      
      if (fieldResult.isRelative) {
        result.relativeUrlCount++;
        result.hasRelativeUrls = true;
      }
    }
    
    // Update timing
    result.validationTimeMs = Date.now() - startTime;
    
    return result;
  }
  
  /**
   * Fix URLs in a document
   * 
   * @param document The document to fix
   * @param validationResult Previous validation result for the document
   * @returns A fix result for the document
   */
  async fixDocumentUrls(document: any, validationResult: DocumentValidationResult): Promise<DocumentFixResult> {
    // Copy document to avoid modifying the original
    const documentCopy = JSON.parse(JSON.stringify(document));
    
    // Initialize result
    const result: DocumentFixResult = {
      id: validationResult.id,
      path: validationResult.path,
      fixedCount: 0,
      fieldResults: [],
      wasUpdated: false
    };
    
    // Skip if no invalid fields or relative URLs
    if (!validationResult.hasInvalidFields && !validationResult.hasRelativeUrls) {
      return result;
    }
    
    // Process each field that needs fixing
    for (const fieldResult of validationResult.fieldResults) {
      // Skip valid fields that aren't relative
      if (fieldResult.isValid && !fieldResult.isRelative) {
        continue;
      }
      
      const fixResult: FieldFixResult = {
        path: fieldResult.path,
        originalValue: fieldResult.originalValue || fieldResult.value,
        newValue: fieldResult.originalValue || fieldResult.value,
        fixType: 'relative-to-absolute',
        success: false
      };
      
      try {
        // Fix relative URLs
        if (fieldResult.isRelative) {
          fixResult.newValue = this.urlValidator.normalizePotentialRelativeURL(
            fixResult.originalValue, 
            this.options.baseUrl
          );
          fixResult.fixType = 'relative-to-absolute';
          fixResult.success = true;
        }
        // Replace invalid URLs
        else if (!fieldResult.isValid) {
          if (fieldResult.expectedType === 'image') {
            fixResult.newValue = `${this.options.baseUrl}/images/placeholder-image.jpg`;
            fixResult.fixType = 'replace-invalid';
            fixResult.success = true;
          } else if (fieldResult.expectedType === 'video') {
            fixResult.newValue = `${this.options.baseUrl}/videos/placeholder-video.mp4`;
            fixResult.fixType = 'replace-invalid';
            fixResult.success = true;
          } else {
            fixResult.newValue = `${this.options.baseUrl}/media/placeholder.jpg`;
            fixResult.fixType = 'replace-invalid';
            fixResult.success = true;
          }
        }
        // Fix type mismatches
        else if (
          fieldResult.expectedType !== 'unknown' && 
          fieldResult.actualType && 
          fieldResult.actualType !== fieldResult.expectedType
        ) {
          if (fieldResult.expectedType === 'image') {
            fixResult.newValue = `${this.options.baseUrl}/images/placeholder-image.jpg`;
            fixResult.fixType = 'type-mismatch';
            fixResult.success = true;
          } else if (fieldResult.expectedType === 'video') {
            fixResult.newValue = `${this.options.baseUrl}/videos/placeholder-video.mp4`;
            fixResult.fixType = 'type-mismatch';
            fixResult.success = true;
          }
        }
        
        // Update document with fixed value if successful
        if (fixResult.success && fixResult.newValue !== fixResult.originalValue) {
          this.setValueAtPath(documentCopy, fieldResult.path, fixResult.newValue);
          result.fixedCount++;
          result.wasUpdated = true;
        }
      } catch (error: any) {
        fixResult.success = false;
        fixResult.error = `Fix error: ${error.message}`;
      }
      
      // Add fix result to document result
      result.fieldResults.push(fixResult);
    }
    
    // Only mark as updated if changes were made
    result.wasUpdated = result.fixedCount > 0;
    
    return result;
  }
  
  /**
   * Get a value from a nested object path
   * 
   * @param obj The object to search in
   * @param path The path to the value (e.g., 'media[0].url')
   * @returns The value at the path, or undefined if not found
   */
  private getValueAtPath(obj: any, path: string): any {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      // Handle array indexing
      const match = part.match(/^([^\[]+)(?:\[(\d+)\])?$/);
      if (!match) return undefined;
      
      const [, key, indexStr] = match;
      
      // Navigate to the key
      current = current[key];
      if (current === undefined) return undefined;
      
      // Navigate to array index if specified
      if (indexStr !== undefined) {
        const index = parseInt(indexStr, 10);
        if (!Array.isArray(current) || index >= current.length) return undefined;
        current = current[index];
      }
    }
    
    return current;
  }
  
  /**
   * Set a value at a nested object path
   * 
   * @param obj The object to modify
   * @param path The path to the value (e.g., 'media[0].url')
   * @param value The new value to set
   */
  private setValueAtPath(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      
      // Handle array indexing
      const match = part.match(/^([^\[]+)(?:\[(\d+)\])?$/);
      if (!match) return;
      
      const [, key, indexStr] = match;
      
      // Last part of the path - set the value
      if (i === parts.length - 1) {
        if (indexStr === undefined) {
          current[key] = value;
        } else {
          const index = parseInt(indexStr, 10);
          if (!Array.isArray(current[key]) || index >= current[key].length) return;
          current[key][index] = value;
        }
        return;
      }
      
      // Navigate to the key
      if (current[key] === undefined) {
        current[key] = indexStr ? [] : {};
      }
      current = current[key];
      
      // Navigate to array index if specified
      if (indexStr !== undefined) {
        const index = parseInt(indexStr, 10);
        if (!Array.isArray(current) || index >= current.length) return;
        if (current[index] === undefined) {
          current[index] = i === parts.length - 2 && parts[i + 1].includes('[') ? [] : {};
        }
        current = current[index];
      }
    }
  }
  
  /**
   * Find all fields that might contain media URLs in a document
   * 
   * @param document The document to search
   * @param prefix Optional prefix for nested paths
   * @returns List of paths and expected media types
   */
  private findMediaFields(document: any, prefix = ''): Array<{ path: string; type: 'image' | 'video' | 'unknown' }> {
    const fields: Array<{ path: string; type: 'image' | 'video' | 'unknown' }> = [];
    
    // Handle null or undefined
    if (document == null) {
      return fields;
    }
    
    // Handle arrays
    if (Array.isArray(document)) {
      for (let i = 0; i < document.length; i++) {
        const item = document[i];
        
        // Check if array item is a string that looks like a URL
        if (typeof item === 'string' && this.couldBeUrl(item)) {
          // If the array property contains "image", assume image type
          const type = prefix.toLowerCase().includes('image') ? 'image' : 
                      prefix.toLowerCase().includes('video') ? 'video' : 'unknown';
          fields.push({ path: `${prefix}[${i}]`, type });
        }
        // Check if array item is an object with media fields
        else if (typeof item === 'object') {
          const nestedFields = this.findMediaFields(item, `${prefix}[${i}]`);
          fields.push(...nestedFields);
        }
      }
      return fields;
    }
    
    // Handle objects
    if (typeof document === 'object') {
      // Iterate over object properties
      for (const key in document) {
        const value = document[key];
        const path = prefix ? `${prefix}.${key}` : key;
        
        // Check for common media field names
        const isImageField = 
          key === 'url' || key === 'imageUrl' || key === 'thumbnailUrl' || 
          key === 'image' || key === 'imageURL' || key === 'thumbnail' ||
          key === 'cover' || key === 'coverImage' || key === 'logo' ||
          key === 'profilePhoto' || key === 'avatar' || key === 'icon';
          
        const isVideoField =
          key === 'videoUrl' || key === 'videoURL' || key === 'video';
          
        // Check if value is a string that looks like a URL
        if (typeof value === 'string' && this.couldBeUrl(value)) {
          const type = isImageField ? 'image' : isVideoField ? 'video' : 'unknown';
          fields.push({ path, type });
        }
        // Check for media array
        else if (Array.isArray(value) && 
                (key === 'media' || key === 'images' || key === 'photos' || key === 'videos')) {
          // Handle standard media array with type field
          for (let i = 0; i < value.length; i++) {
            const item = value[i];
            if (typeof item === 'object' && item !== null) {
              // If media item has a URL property
              if (typeof item.url === 'string' && this.couldBeUrl(item.url)) {
                // Determine type from item's type field or from array name
                const mediaType = 
                  (item.type === 'image' || item.type === 'video') ? item.type :
                  key === 'images' || key === 'photos' ? 'image' :
                  key === 'videos' ? 'video' : 'unknown';
                  
                fields.push({ path: `${path}[${i}].url`, type: mediaType });
              }
              
              // Also check for alternative URL field names
              for (const urlField of ['imageUrl', 'videoUrl', 'thumbnailUrl', 'src']) {
                if (typeof item[urlField] === 'string' && this.couldBeUrl(item[urlField])) {
                  const mediaType = 
                    urlField.includes('image') || urlField.includes('thumbnail') ? 'image' :
                    urlField.includes('video') ? 'video' : 'unknown';
                    
                  fields.push({ path: `${path}[${i}].${urlField}`, type: mediaType });
                }
              }
            }
            // If array contains direct URL strings
            else if (typeof item === 'string' && this.couldBeUrl(item)) {
              const mediaType = 
                key === 'images' || key === 'photos' ? 'image' :
                key === 'videos' ? 'video' : 'unknown';
                
              fields.push({ path: `${path}[${i}]`, type: mediaType });
            }
          }
        }
        // Recursively check nested objects
        else if (typeof value === 'object' && value !== null) {
          const nestedFields = this.findMediaFields(value, path);
          fields.push(...nestedFields);
        }
      }
    }
    
    return fields;
  }
  
  /**
   * Check if a string could be a URL
   * 
   * @param str The string to check
   * @returns true if the string might be a URL
   */
  private couldBeUrl(str: string): boolean {
    // Skip empty strings
    if (!str) return false;
    
    // URLs typically start with http://, https://, /, or contain domains
    return (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('/') ||
      str.startsWith('blob:') ||
      str.startsWith('data:') ||
      /\.(jpg|jpeg|png|gif|webp|mp4|mov|avi|webm)$/i.test(str) ||
      str.includes('.com/') ||
      str.includes('.org/') ||
      str.includes('.net/') ||
      str.includes('.io/')
    );
  }
}