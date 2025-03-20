/**
 * Media Validation Service
 * 
 * This module provides a service for validating media URLs in Firestore documents.
 * It identifies invalid or broken URLs and provides recommendations for fixing them.
 */

import { UrlValidator, UrlValidationResult, ExtractedUrl } from './url-validator';

/**
 * Media validation service configuration
 */
export interface MediaValidationServiceConfig {
  baseUrl: string;
  concurrency?: number;
  timeout?: number;
  placeholderImage: string;
  placeholderVideo: string;
}

/**
 * Default media validation service configuration
 */
export const DEFAULT_SERVICE_CONFIG: MediaValidationServiceConfig = {
  baseUrl: 'https://etoile-yachts.web.app',
  concurrency: 5,
  timeout: 10000,
  placeholderImage: '/assets/placeholder-image.jpg',
  placeholderVideo: '/assets/placeholder-video.mp4'
};

/**
 * Document with fields to validate
 */
export interface DocumentWithFields {
  id: string;
  collection: string;
  data: any;
}

/**
 * Field validation result
 */
export interface FieldValidationResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  isImage?: boolean;
  isVideo?: boolean;
  collection: string;
  documentId: string;
}

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
  fieldResults: FieldValidationResult[];
}

/**
 * Collection validation summary
 */
export interface CollectionValidationSummary {
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
  collectionSummaries: CollectionValidationSummary[];
  invalidResults: FieldValidationResult[];
}

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
    this.config = { ...DEFAULT_SERVICE_CONFIG, ...config };
    
    // Create URL validator
    this.urlValidator = new UrlValidator({
      baseUrl: this.config.baseUrl,
      concurrency: this.config.concurrency,
      timeout: this.config.timeout
    });
  }
  
  /**
   * Validate a document's media URLs
   * 
   * @param documents Documents to validate
   * @returns Promise resolving to validation results
   */
  async validateDocuments(documents: DocumentWithFields[]): Promise<DocumentValidationResult[]> {
    const results: DocumentValidationResult[] = [];
    
    // Process documents one by one to avoid overwhelming the system
    for (const document of documents) {
      try {
        // Extract URLs from document
        const extractedUrls = this.urlValidator.extractUrls(document.data);
        
        // Create document validation result
        const result: DocumentValidationResult = {
          id: document.id,
          collection: document.collection,
          totalFields: extractedUrls.length,
          validFields: 0,
          invalidFields: 0,
          missingFields: 0,
          fieldResults: []
        };
        
        // If no URLs were found, add empty result
        if (extractedUrls.length === 0) {
          results.push(result);
          continue;
        }
        
        // Validate each URL
        const urls = extractedUrls.map(extractedUrl => extractedUrl.url);
        const validationResults = await this.urlValidator.validateUrls(urls);
        
        // Map validation results to field results
        const fieldResults: FieldValidationResult[] = [];
        
        for (let i = 0; i < extractedUrls.length; i++) {
          const extractedUrl = extractedUrls[i];
          const validationResult = validationResults.find(result => result.url === extractedUrl.url);
          
          if (!validationResult) {
            // URL was not validated, count as missing
            result.missingFields++;
            fieldResults.push({
              field: extractedUrl.path,
              url: extractedUrl.url,
              isValid: false,
              error: 'URL was not validated',
              collection: document.collection,
              documentId: document.id
            });
            continue;
          }
          
          // Create field validation result
          const fieldResult: FieldValidationResult = {
            field: extractedUrl.path,
            url: extractedUrl.url,
            isValid: validationResult.isValid,
            status: validationResult.status,
            statusText: validationResult.statusText,
            error: validationResult.error,
            isImage: validationResult.isImage,
            isVideo: validationResult.isVideo,
            collection: document.collection,
            documentId: document.id
          };
          
          // Add field result to list
          fieldResults.push(fieldResult);
          
          // Update counts
          if (validationResult.isValid) {
            result.validFields++;
          } else {
            result.invalidFields++;
          }
        }
        
        // Add field results to document result
        result.fieldResults = fieldResults;
        
        // Add document result to list
        results.push(result);
      } catch (error) {
        console.error(`Error validating document ${document.collection}/${document.id}:`, error);
        
        // Add error result
        results.push({
          id: document.id,
          collection: document.collection,
          totalFields: 0,
          validFields: 0,
          invalidFields: 0,
          missingFields: 0,
          fieldResults: [{
            field: 'error',
            url: 'error',
            isValid: false,
            error: error instanceof Error ? error.message : String(error),
            collection: document.collection,
            documentId: document.id
          }]
        });
      }
    }
    
    return results;
  }
  
  /**
   * Fix invalid URLs in a document
   * 
   * @param document Document to fix
   * @param validationResult Validation result for the document
   * @returns Fixed document data
   */
  fixInvalidUrls(document: DocumentWithFields, validationResult: DocumentValidationResult): any {
    // Create copy of document data
    const fixedData: any = { ...document.data };
    
    // Fix each invalid URL
    for (const fieldResult of validationResult.fieldResults) {
      if (fieldResult.isValid) {
        continue;
      }
      
      try {
        // Get path to field
        const path = fieldResult.field;
        
        // Handle special case of array paths
        if (path.includes('.[')) {
          // Extract array path components
          const arrayPathMatch = path.match(/(.+)\.(?:\[(\d+)\])(?:\.(.+))?/);
          
          if (arrayPathMatch) {
            const [_, arrayPath, indexStr, remainingPath] = arrayPathMatch;
            const index = parseInt(indexStr, 10);
            
            if (arrayPath && !isNaN(index)) {
              // Get array
              const array = getValueByPath(fixedData, arrayPath);
              
              if (Array.isArray(array) && index < array.length) {
                if (remainingPath) {
                  // Handle nested object in array
                  const item = array[index];
                  if (typeof item === 'object' && item !== null) {
                    // Set field in object
                    setValueByPath(item, remainingPath, this.getReplacementUrl(fieldResult));
                  }
                } else {
                  // Handle string in array
                  array[index] = this.getReplacementUrl(fieldResult);
                }
              }
            }
          }
        } else {
          // Regular path
          setValueByPath(fixedData, path, this.getReplacementUrl(fieldResult));
        }
      } catch (error) {
        console.error(`Error fixing URL in field ${fieldResult.field}:`, error);
      }
    }
    
    return fixedData;
  }
  
  /**
   * Get appropriate replacement URL for invalid URL
   * 
   * @param fieldResult Field validation result
   * @returns Replacement URL
   */
  private getReplacementUrl(fieldResult: FieldValidationResult): string {
    // Return original URL if valid
    if (fieldResult.isValid) {
      return fieldResult.url;
    }
    
    // Fix relative URLs
    if (fieldResult.url.startsWith('/')) {
      return this.urlValidator.fixRelativeUrl(fieldResult.url);
    }
    
    // Use appropriate placeholder based on content type
    if (fieldResult.isVideo) {
      return this.config.placeholderVideo;
    } else {
      return this.config.placeholderImage;
    }
  }
  
  /**
   * Generate a report from validation results
   * 
   * @param results Validation results
   * @param startTime Start time of validation
   * @param endTime End time of validation
   * @returns Validation report
   */
  generateReport(results: DocumentValidationResult[], startTime: Date, endTime: Date): ValidationReport {
    // Calculate duration
    const duration = endTime.getTime() - startTime.getTime();
    
    // Calculate totals
    let totalDocuments = 0;
    let totalFields = 0;
    let validUrls = 0;
    let invalidUrls = 0;
    let missingUrls = 0;
    
    // Collect invalid results
    const invalidResults: FieldValidationResult[] = [];
    
    // Process results
    for (const result of results) {
      totalDocuments++;
      totalFields += result.totalFields;
      validUrls += result.validFields;
      invalidUrls += result.invalidFields;
      missingUrls += result.missingFields;
      
      // Collect invalid field results
      for (const fieldResult of result.fieldResults) {
        if (!fieldResult.isValid) {
          invalidResults.push(fieldResult);
        }
      }
    }
    
    // Calculate collection summaries
    const collectionMap = new Map<string, CollectionValidationSummary>();
    
    for (const result of results) {
      const collection = result.collection;
      
      // Get or create collection summary
      let summary = collectionMap.get(collection);
      
      if (!summary) {
        summary = {
          collection,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          validPercent: 0,
          invalidPercent: 0,
          missingPercent: 0
        };
        collectionMap.set(collection, summary);
      }
      
      // Update collection summary
      summary.totalUrls += result.totalFields;
      summary.validUrls += result.validFields;
      summary.invalidUrls += result.invalidFields;
      summary.missingUrls += result.missingFields;
    }
    
    // Calculate percentages
    for (const summary of collectionMap.values()) {
      if (summary.totalUrls > 0) {
        summary.validPercent = Math.round((summary.validUrls / summary.totalUrls) * 100);
        summary.invalidPercent = Math.round((summary.invalidUrls / summary.totalUrls) * 100);
        summary.missingPercent = Math.round((summary.missingUrls / summary.totalUrls) * 100);
      }
    }
    
    // Create report ID
    const id = generateReportId();
    
    // Create report
    const report: ValidationReport = {
      id,
      startTime,
      endTime,
      duration,
      totalDocuments,
      totalFields,
      validUrls,
      invalidUrls,
      missingUrls,
      collectionSummaries: Array.from(collectionMap.values()),
      invalidResults
    };
    
    return report;
  }
  
  /**
   * Create a Firestore-compatible version of a validation report
   * 
   * @param report Validation report
   * @returns Firestore-compatible report
   */
  createFirestoreReport(report: ValidationReport): any {
    // Convert dates to ISO strings
    const firestoreReport: any = {
      ...report,
      startTime: report.startTime.toISOString(),
      endTime: report.endTime.toISOString(),
      timestamp: new Date().toISOString()
    };
    
    return firestoreReport;
  }
}

/**
 * Get a value by path from an object
 * 
 * @param obj Object to get value from
 * @param path Path to value
 * @returns Value at path
 */
function getValueByPath(obj: any, path: string): any {
  // Handle empty path
  if (!path) {
    return obj;
  }
  
  // Split path into parts
  const parts = path.split('.');
  
  // Traverse object
  let value = obj;
  
  for (const part of parts) {
    if (value === null || value === undefined) {
      return undefined;
    }
    
    value = value[part];
  }
  
  return value;
}

/**
 * Set a value by path in an object
 * 
 * @param obj Object to set value in
 * @param path Path to value
 * @param value Value to set
 */
function setValueByPath(obj: any, path: string, value: any): void {
  // Handle empty path
  if (!path) {
    return;
  }
  
  // Split path into parts
  const parts = path.split('.');
  
  // Get parent object
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    
    if (current[part] === undefined) {
      // Create missing objects
      current[part] = {};
    }
    
    current = current[part];
  }
  
  // Set value
  const lastPart = parts[parts.length - 1];
  current[lastPart] = value;
}

/**
 * Generate a random report ID
 * 
 * @returns Random report ID
 */
function generateReportId(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}