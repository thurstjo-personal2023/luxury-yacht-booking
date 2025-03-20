/**
 * Media Validation Service
 * 
 * This module provides functionality for validating media URLs in the Etoile Yachts platform.
 * It checks for broken URLs, validates media type consistency, and provides repair suggestions.
 */

import { UrlValidator, UrlValidationResult } from './url-validator';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Document validation result
 */
export interface DocumentValidationResult {
  id: string;
  collection: string;
  totalFields: number;
  validFields: number;
  invalidFields: number;
  missingFields: number;
  results: FieldValidationResult[];
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  id: string;
  collection: string;
  documentId: string;
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  contentType?: string;
  isImage?: boolean;
  isVideo?: boolean;
  mediaType?: 'image' | 'video' | 'unknown';
  expectedMediaType?: 'image' | 'video';
}

/**
 * Validation report
 */
export interface ValidationReport {
  id: string;
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
 * Collection summary
 */
export interface CollectionSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  validPercent: number;
  invalidPercent: number;
  missingPercent: number;
}

/**
 * Document with fields to validate
 */
export interface DocumentWithFields {
  id: string;
  collection: string;
  data: any;
}

/**
 * Field to validate
 */
export interface FieldToValidate {
  documentId: string;
  collection: string;
  field: string;
  url: string;
  expectedMediaType?: 'image' | 'video';
}

/**
 * Media validation service configuration
 */
export interface MediaValidationServiceConfig {
  baseUrl: string;
  concurrency: number;
  timeout: number;
  ignoreKeywords: string[];
  placeholderImage: string;
  placeholderVideo: string;
}

/**
 * Default media validation service configuration
 */
export const DEFAULT_VALIDATION_CONFIG: MediaValidationServiceConfig = {
  baseUrl: 'https://etoile-yachts.web.app',
  concurrency: 5,
  timeout: 10000,
  ignoreKeywords: ['data:', 'blob:', 'firebase-emulator'],
  placeholderImage: '/assets/placeholder-image.jpg',
  placeholderVideo: '/assets/placeholder-video.mp4'
};

/**
 * Media Validation Service
 */
export class MediaValidationService {
  private config: MediaValidationServiceConfig;
  private urlValidator: UrlValidator;
  
  /**
   * Create a new media validation service
   * 
   * @param config Configuration options
   */
  constructor(config: Partial<MediaValidationServiceConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATION_CONFIG, ...config };
    
    // Create URL validator with matching configuration
    this.urlValidator = new UrlValidator({
      baseUrl: this.config.baseUrl,
      concurrency: this.config.concurrency,
      timeout: this.config.timeout,
      ignoreKeywords: this.config.ignoreKeywords
    });
  }
  
  /**
   * Extract fields to validate from documents
   * 
   * @param documents Array of documents to extract fields from
   * @returns Array of fields to validate
   */
  extractFieldsToValidate(documents: DocumentWithFields[]): FieldToValidate[] {
    const fields: FieldToValidate[] = [];
    
    for (const document of documents) {
      const { id, collection, data } = document;
      
      // Extract URLs from document
      const extractedUrls = this.urlValidator.extractUrls(data);
      
      // Convert to fields to validate
      for (const extracted of extractedUrls) {
        // Skip empty URLs
        if (!extracted.url || extracted.url.trim() === '') {
          continue;
        }
        
        const field: FieldToValidate = {
          documentId: id,
          collection,
          field: extracted.path,
          url: extracted.url
        };
        
        // Try to determine expected media type based on field path
        if (field.field.includes('media')) {
          // Check if there's a media type specified in the data
          const pathParts = field.field.split('.');
          const mediaIndex = pathParts.findIndex(part => part === 'media' || part.startsWith('media['));
          
          if (mediaIndex >= 0 && mediaIndex < pathParts.length - 1) {
            // Try to extract the media item to check its type property
            let mediaItem: any = data;
            
            for (let i = 0; i <= mediaIndex; i++) {
              const part = pathParts[i];
              
              if (part.startsWith('media[') && part.endsWith(']')) {
                // Extract the index from media[N]
                const index = parseInt(part.substring(6, part.length - 1), 10);
                
                if (!isNaN(index) && Array.isArray(mediaItem.media) && index < mediaItem.media.length) {
                  mediaItem = mediaItem.media[index];
                } else {
                  mediaItem = null;
                  break;
                }
              } else if (mediaItem[part]) {
                mediaItem = mediaItem[part];
              } else {
                mediaItem = null;
                break;
              }
            }
            
            // If we found the media item, check its type
            if (mediaItem && typeof mediaItem === 'object' && mediaItem.type) {
              field.expectedMediaType = mediaItem.type as 'image' | 'video';
            }
          }
        } else if (field.field.includes('image') || field.field.endsWith('Img') || field.field.endsWith('Photo')) {
          field.expectedMediaType = 'image';
        } else if (field.field.includes('video') || field.field.endsWith('Video')) {
          field.expectedMediaType = 'video';
        }
        
        fields.push(field);
      }
    }
    
    return fields;
  }
  
  /**
   * Validate a list of fields
   * 
   * @param fields Array of fields to validate
   * @returns Promise resolving to array of field validation results
   */
  async validateFields(fields: FieldToValidate[]): Promise<FieldValidationResult[]> {
    // Extract unique URLs to validate
    const urls = fields.map(field => field.url);
    const uniqueUrls = [...new Set(urls)];
    
    // Validate unique URLs
    const urlResults = await this.urlValidator.validateUrls(uniqueUrls);
    
    // Create a map of URL to validation result for quick lookup
    const urlResultMap = new Map<string, UrlValidationResult>();
    for (const result of urlResults) {
      urlResultMap.set(result.url, result);
    }
    
    // Create field validation results
    const results: FieldValidationResult[] = [];
    
    for (const field of fields) {
      const urlResult = urlResultMap.get(field.url);
      
      if (!urlResult) {
        // This should never happen, but just in case
        results.push({
          id: `${field.collection}-${field.documentId}-${field.field}`,
          collection: field.collection,
          documentId: field.documentId,
          field: field.field,
          url: field.url,
          isValid: false,
          error: 'URL validation result not found'
        });
        continue;
      }
      
      // Determine media type from content type
      const mediaType = urlResult.isImage ? 'image' : (urlResult.isVideo ? 'video' : 'unknown');
      
      // Check if media type matches expected type
      let isValid = urlResult.isValid;
      let error = urlResult.error;
      
      if (isValid && field.expectedMediaType && mediaType !== 'unknown' && mediaType !== field.expectedMediaType) {
        isValid = false;
        error = `Media type mismatch: expected ${field.expectedMediaType}, got ${mediaType}`;
      }
      
      // Create field validation result
      results.push({
        id: `${field.collection}-${field.documentId}-${field.field}`,
        collection: field.collection,
        documentId: field.documentId,
        field: field.field,
        url: field.url,
        isValid,
        status: urlResult.status,
        statusText: urlResult.statusText,
        error,
        contentType: urlResult.contentType,
        isImage: urlResult.isImage,
        isVideo: urlResult.isVideo,
        mediaType,
        expectedMediaType: field.expectedMediaType
      });
    }
    
    return results;
  }
  
  /**
   * Validate documents
   * 
   * @param documents Array of documents to validate
   * @returns Promise resolving to array of document validation results
   */
  async validateDocuments(documents: DocumentWithFields[]): Promise<DocumentValidationResult[]> {
    // Extract fields to validate
    const fields = this.extractFieldsToValidate(documents);
    
    // Validate fields
    const fieldResults = await this.validateFields(fields);
    
    // Group field results by document
    const resultsByDocument = new Map<string, FieldValidationResult[]>();
    
    for (const result of fieldResults) {
      const key = `${result.collection}-${result.documentId}`;
      
      if (!resultsByDocument.has(key)) {
        resultsByDocument.set(key, []);
      }
      
      resultsByDocument.get(key)!.push(result);
    }
    
    // Create document validation results
    const results: DocumentValidationResult[] = [];
    
    for (const document of documents) {
      const key = `${document.collection}-${document.id}`;
      const docResults = resultsByDocument.get(key) || [];
      
      const totalFields = docResults.length;
      const validFields = docResults.filter(r => r.isValid).length;
      const invalidFields = totalFields - validFields;
      const missingFields = docResults.filter(r => r.error === 'URL is empty').length;
      
      results.push({
        id: document.id,
        collection: document.collection,
        totalFields,
        validFields,
        invalidFields,
        missingFields,
        results: docResults
      });
    }
    
    return results;
  }
  
  /**
   * Generate a validation report from document validation results
   * 
   * @param results Array of document validation results
   * @param startTime Start time of validation
   * @param endTime End time of validation
   * @returns Validation report
   */
  generateReport(
    results: DocumentValidationResult[],
    startTime: Date,
    endTime: Date
  ): ValidationReport {
    // Calculate totals
    const totalDocuments = results.length;
    const totalFields = results.reduce((sum, doc) => sum + doc.totalFields, 0);
    const validUrls = results.reduce((sum, doc) => sum + doc.validFields, 0);
    const invalidUrls = results.reduce((sum, doc) => sum + doc.invalidFields, 0);
    const missingUrls = results.reduce((sum, doc) => sum + doc.missingFields, 0);
    
    // Get invalid field results
    const invalidResults: FieldValidationResult[] = [];
    for (const doc of results) {
      invalidResults.push(...doc.results.filter(r => !r.isValid));
    }
    
    // Calculate collection summaries
    const collections = [...new Set(results.map(r => r.collection))];
    const collectionSummaries: CollectionSummary[] = [];
    
    for (const collection of collections) {
      const collectionDocs = results.filter(r => r.collection === collection);
      const totalUrls = collectionDocs.reduce((sum, doc) => sum + doc.totalFields, 0);
      const validUrlsInCollection = collectionDocs.reduce((sum, doc) => sum + doc.validFields, 0);
      const invalidUrlsInCollection = collectionDocs.reduce((sum, doc) => sum + doc.invalidFields, 0);
      const missingUrlsInCollection = collectionDocs.reduce((sum, doc) => sum + doc.missingFields, 0);
      
      collectionSummaries.push({
        collection,
        totalUrls,
        validUrls: validUrlsInCollection,
        invalidUrls: invalidUrlsInCollection,
        missingUrls: missingUrlsInCollection,
        validPercent: totalUrls > 0 ? (validUrlsInCollection / totalUrls) * 100 : 0,
        invalidPercent: totalUrls > 0 ? (invalidUrlsInCollection / totalUrls) * 100 : 0,
        missingPercent: totalUrls > 0 ? (missingUrlsInCollection / totalUrls) * 100 : 0
      });
    }
    
    // Sort collection summaries by invalid URL count in descending order
    collectionSummaries.sort((a, b) => b.invalidUrls - a.invalidUrls);
    
    // Calculate duration
    const duration = endTime.getTime() - startTime.getTime();
    
    // Generate report ID
    const reportId = `report-${startTime.getTime()}`;
    
    return {
      id: reportId,
      startTime,
      endTime,
      duration,
      totalDocuments,
      totalFields,
      validUrls,
      invalidUrls,
      missingUrls,
      collectionSummaries,
      invalidResults
    };
  }
  
  /**
   * Fix invalid URLs in a document
   * 
   * @param document Document to fix
   * @param validationResult Validation result for the document
   * @returns Fixed document data
   */
  fixInvalidUrls(document: DocumentWithFields, validationResult: DocumentValidationResult): any {
    // Clone document data to avoid modifying the original
    const fixedData = JSON.parse(JSON.stringify(document.data));
    
    // Get invalid fields
    const invalidFields = validationResult.results.filter(r => !r.isValid);
    
    for (const field of invalidFields) {
      // Skip fields with no errors or ignored URLs
      if (!field.error || field.error === 'URL is special and was not validated') {
        continue;
      }
      
      // Get path parts to traverse the document
      const pathParts = field.field.split('.');
      let current = fixedData;
      let parent: any = null;
      let lastPart: string | null = null;
      
      // Traverse to the field
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        
        // Handle array index in path (e.g., media[0])
        if (part.includes('[') && part.includes(']')) {
          const arrayName = part.substring(0, part.indexOf('['));
          const index = parseInt(part.substring(part.indexOf('[') + 1, part.indexOf(']')), 10);
          
          if (!current[arrayName] || !Array.isArray(current[arrayName]) || index >= current[arrayName].length) {
            // Array or index not found, skip this field
            current = null;
            break;
          }
          
          parent = current;
          lastPart = arrayName;
          current = current[arrayName][index];
        } else {
          // Regular property access
          if (i === pathParts.length - 1) {
            // Last part, store parent and part name
            parent = current;
            lastPart = part;
          } else if (current[part] === undefined || current[part] === null) {
            // Property not found, skip this field
            current = null;
            break;
          } else {
            // Continue traversing
            current = current[part];
          }
        }
      }
      
      // If we couldn't traverse to the field, skip it
      if (current === null || parent === null || lastPart === null) {
        continue;
      }
      
      // Determine placeholder URL to use
      let placeholderUrl: string;
      
      if (field.expectedMediaType === 'video' || field.mediaType === 'video') {
        placeholderUrl = this.config.placeholderVideo;
      } else {
        placeholderUrl = this.config.placeholderImage;
      }
      
      // Fix relative URLs by converting to absolute URLs
      if (field.error === 'URL is relative and was converted to absolute') {
        // If the URL starts with /, it's a relative URL
        if (field.url.startsWith('/')) {
          // Replace with the fixed absolute URL
          const absoluteUrl = this.urlValidator.fixRelativeUrl(field.url);
          
          // The field could be part of a media object with type
          if (parent[lastPart] && typeof parent[lastPart] === 'object' && parent[lastPart].url) {
            parent[lastPart].url = absoluteUrl;
          } else {
            parent[lastPart] = absoluteUrl;
          }
        }
      } 
      // Fix media type mismatches
      else if (field.error && field.error.startsWith('Media type mismatch')) {
        // Use a placeholder of the correct type
        if (parent[lastPart] && typeof parent[lastPart] === 'object' && parent[lastPart].url) {
          parent[lastPart].url = placeholderUrl;
        } else {
          parent[lastPart] = placeholderUrl;
        }
      }
      // Fix invalid URLs (404, timeout, etc.)
      else if (!field.isValid) {
        // Use a placeholder URL
        if (parent[lastPart] && typeof parent[lastPart] === 'object' && parent[lastPart].url) {
          parent[lastPart].url = placeholderUrl;
        } else {
          parent[lastPart] = placeholderUrl;
        }
      }
    }
    
    return fixedData;
  }
  
  /**
   * Create a Firestore-compatible report object
   * 
   * @param report Validation report
   * @returns Firestore-compatible report object
   */
  createFirestoreReport(report: ValidationReport): any {
    return {
      id: report.id,
      startTime: Timestamp.fromDate(report.startTime),
      endTime: Timestamp.fromDate(report.endTime),
      createdAt: Timestamp.now(),
      duration: report.duration,
      totalDocuments: report.totalDocuments,
      totalFields: report.totalFields,
      validUrls: report.validUrls,
      invalidUrls: report.invalidUrls,
      missingUrls: report.missingUrls,
      collectionSummaries: report.collectionSummaries,
      // Limit the number of invalid results to save in Firestore
      invalidResults: report.invalidResults.slice(0, 1000)
    };
  }
  
  /**
   * Clear the URL validation cache
   */
  clearCache(): void {
    this.urlValidator.clearCache();
  }
}