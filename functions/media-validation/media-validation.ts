/**
 * Media Validation Service
 * 
 * This module provides functionality to validate media URLs in documents.
 * It can validate image and video URLs, detect missing or broken links,
 * and fix invalid URLs.
 */

import { extractUrls, isImageUrl, isVideoUrl, validateImageUrl, validateUrl, validateVideoUrl, ValidationResult } from './url-validator';
import get from 'lodash/get';
import set from 'lodash/set';

/**
 * Media validation options
 */
export interface MediaValidationOptions {
  batchSize?: number;
  maxItems?: number;
  fixInvalidUrls?: boolean;
  collections?: string[];
  onProgress?: (progress: number, total: number) => void;
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
  id?: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionValidationSummary[];
  invalidResults: Array<UrlValidationResult & { field: string; collection?: string; documentId?: string }>;
}

/**
 * URL validation result
 */
export interface UrlValidationResult {
  field: string;
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
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
  results: UrlValidationResult[];
}

/**
 * URL fix result
 */
export interface UrlFixResult {
  field: string;
  originalUrl: string;
  newUrl: string;
  fixed: boolean;
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
      batchSize: options.batchSize || 50,
      maxItems: options.maxItems || 1000,
      fixInvalidUrls: options.fixInvalidUrls || false,
      collections: options.collections || [],
      onProgress: options.onProgress
    };
  }
  
  /**
   * Validate a document
   * 
   * @param document Document data
   * @param id Document ID
   * @param collection Collection name
   * @returns Document validation result
   */
  async validateDocument(document: any, id: string, collection: string): Promise<DocumentValidationResult> {
    // Extract URLs from document
    const urls = extractUrls(document);
    
    // Track validation results
    const results: UrlValidationResult[] = [];
    let validCount = 0;
    let invalidCount = 0;
    
    // Validate each URL
    for (const [field, url] of urls) {
      let result: ValidationResult;
      
      // Validate based on field type and URL pattern
      if (this.isImageField(field)) {
        result = await validateImageUrl(url);
      } else if (this.isVideoField(field)) {
        result = await validateVideoUrl(url);
      } else if (isImageUrl(url)) {
        result = await validateImageUrl(url);
      } else if (isVideoUrl(url)) {
        result = await validateVideoUrl(url);
      } else {
        result = await validateUrl(url);
      }
      
      // Create validation result
      const urlResult: UrlValidationResult = {
        field,
        url,
        isValid: result.isValid,
        status: result.status,
        statusText: result.statusText,
        contentType: result.contentType,
        reason: result.reason,
        error: result.error
      };
      
      // Update counters
      if (result.isValid) {
        validCount++;
      } else {
        invalidCount++;
      }
      
      // Add to results
      results.push(urlResult);
    }
    
    // Return document validation result
    return {
      id,
      collection,
      totalUrls: urls.length,
      validUrls: validCount,
      invalidUrls: invalidCount,
      results
    };
  }
  
  /**
   * Generate validation report from results
   * 
   * @param results Document validation results
   * @param startTime Start time
   * @param endTime End time
   * @returns Validation report
   */
  generateReport(results: DocumentValidationResult[], startTime: Date, endTime: Date): ValidationReport {
    // Track report statistics
    let totalDocuments = results.length;
    let totalFields = 0;
    let validUrls = 0;
    let invalidUrls = 0;
    let missingUrls = 0;
    
    // Track collection summaries
    const collectionMap = new Map<string, {
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }>();
    
    // Extract invalid results for reporting
    const invalidResults: Array<UrlValidationResult & { field: string; collection?: string; documentId?: string }> = [];
    
    // Process document results
    for (const result of results) {
      // Update document counters
      totalFields += result.totalUrls;
      validUrls += result.validUrls;
      invalidUrls += result.invalidUrls;
      
      // Update collection counters
      const collectionStats = collectionMap.get(result.collection) || {
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0
      };
      
      collectionStats.totalUrls += result.totalUrls;
      collectionStats.validUrls += result.validUrls;
      collectionStats.invalidUrls += result.invalidUrls;
      
      collectionMap.set(result.collection, collectionStats);
      
      // Add invalid results to report
      for (const urlResult of result.results) {
        if (!urlResult.isValid) {
          invalidResults.push({
            ...urlResult,
            collection: result.collection,
            documentId: result.id,
            field: `${result.collection} (${result.id}): ${urlResult.field}`
          });
        }
      }
    }
    
    // Calculate collection summaries
    const collectionSummaries: CollectionValidationSummary[] = [];
    for (const [collection, stats] of collectionMap.entries()) {
      const totalUrls = stats.totalUrls;
      const validPercent = totalUrls > 0 ? Math.round((stats.validUrls / totalUrls) * 100) : 0;
      const invalidPercent = totalUrls > 0 ? Math.round((stats.invalidUrls / totalUrls) * 100) : 0;
      const missingPercent = totalUrls > 0 ? Math.round((stats.missingUrls / totalUrls) * 100) : 0;
      
      collectionSummaries.push({
        collection,
        totalUrls,
        validUrls: stats.validUrls,
        invalidUrls: stats.invalidUrls,
        missingUrls: stats.missingUrls,
        validPercent,
        invalidPercent,
        missingPercent
      });
    }
    
    // Sort collection summaries by total URLs (descending)
    collectionSummaries.sort((a, b) => b.totalUrls - a.totalUrls);
    
    // Return report
    return {
      startTime,
      endTime,
      duration: endTime.getTime() - startTime.getTime(),
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
   * @param validation Document validation result
   * @returns Updated document and list of fixes
   */
  fixInvalidUrls(document: any, validation: DocumentValidationResult): { updatedDocument: any; fixes: UrlFixResult[] } {
    // Clone document to avoid modifying original
    const updatedDocument = JSON.parse(JSON.stringify(document));
    const fixes: UrlFixResult[] = [];
    
    // Fix each invalid URL
    for (const result of validation.results) {
      if (!result.isValid) {
        // Get current value
        const currentValue = get(updatedDocument, result.field);
        
        // Skip if value not found
        if (currentValue === undefined) {
          continue;
        }
        
        // Replace URL with placeholder based on field type
        let newUrl: string;
        
        if (this.isVideoField(result.field) || isVideoUrl(result.url)) {
          newUrl = '/yacht-video-placeholder.mp4';
        } else {
          newUrl = '/yacht-placeholder.jpg';
        }
        
        // Update document
        set(updatedDocument, result.field, newUrl);
        
        // Add fix result
        fixes.push({
          field: result.field,
          originalUrl: result.url,
          newUrl,
          fixed: true
        });
      }
    }
    
    // Return updated document and fixes
    return {
      updatedDocument,
      fixes
    };
  }
  
  /**
   * Check if a field is likely an image field
   * 
   * @param field Field name
   * @returns True if field is likely an image field
   */
  private isImageField(field: string): boolean {
    const imagePatterns = ['image', 'photo', 'thumbnail', 'avatar', 'icon', 'logo', 'banner', 'cover'];
    const fieldLower = field.toLowerCase();
    
    return imagePatterns.some(pattern => fieldLower.includes(pattern));
  }
  
  /**
   * Check if a field is likely a video field
   * 
   * @param field Field name
   * @returns True if field is likely a video field
   */
  private isVideoField(field: string): boolean {
    const videoPatterns = ['video', 'movie', 'clip', 'recording'];
    const fieldLower = field.toLowerCase();
    
    return videoPatterns.some(pattern => fieldLower.includes(pattern));
  }
}