/**
 * URL Validator Module
 * 
 * This module provides utilities for validating URLs and detecting issues
 * with media URLs in the Etoile Yachts platform.
 */

import { createHash } from 'crypto';

/**
 * URL validation result
 */
export interface UrlValidationResult {
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  error?: string;
  validationTime?: number;
  contentType?: string;
  isImage?: boolean;
  isVideo?: boolean;
  fileSize?: number;
  hash?: string;
}

/**
 * URL validator configuration
 */
export interface UrlValidatorConfig {
  timeout: number;
  concurrency: number;
  baseUrl: string;
  ignoreKeywords: string[];
}

/**
 * Default URL validator configuration
 */
export const DEFAULT_VALIDATOR_CONFIG: UrlValidatorConfig = {
  timeout: 10000,
  concurrency: 5,
  baseUrl: 'https://etoile-yachts.web.app',
  ignoreKeywords: ['data:', 'blob:', 'firebase-emulator']
};

/**
 * Cache of URL validation results to avoid re-validating the same URLs
 */
const validationCache = new Map<string, UrlValidationResult>();

/**
 * URL Validator class
 */
export class UrlValidator {
  private config: UrlValidatorConfig;
  
  /**
   * Create a new URL validator
   * 
   * @param config Configuration options
   */
  constructor(config: Partial<UrlValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
  }
  
  /**
   * Validate a URL
   * 
   * @param url URL to validate
   * @returns Promise resolving to validation result
   */
  async validateUrl(url: string): Promise<UrlValidationResult> {
    // Check cache first
    const cachedResult = validationCache.get(url);
    if (cachedResult) {
      return cachedResult;
    }
    
    // Default response structure
    const result: UrlValidationResult = {
      url,
      isValid: false
    };
    
    try {
      // Handle empty URLs
      if (!url || url.trim() === '') {
        result.error = 'URL is empty';
        return result;
      }
      
      // Handle special URLs (data URLs, blob URLs)
      if (this.shouldIgnoreUrl(url)) {
        result.isValid = true;
        result.error = 'URL is special and was not validated';
        return result;
      }
      
      // Handle relative URLs
      if (url.startsWith('/')) {
        const absoluteUrl = `${this.config.baseUrl}${url}`;
        result.url = absoluteUrl;
        result.error = 'URL is relative and was converted to absolute';
      }
      
      // Start timer for performance measurement
      const startTime = Date.now();
      
      // Make the request with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);
      
      try {
        const response = await fetch(result.url, {
          method: 'HEAD',
          redirect: 'follow',
          // Avoid security issues by not sending credentials
          credentials: 'omit',
          // Add signal for timeout
          signal: controller.signal,
          timeout: this.config.timeout
        });
        
        // Clear timeout
        clearTimeout(timeoutId);
        
        // If response is not OK (200-299), the URL is invalid
        result.isValid = response.ok;
        result.status = response.status;
        result.statusText = response.statusText;
        
        // For non-HEAD supporting servers, try GET request
        if (result.status === 405) { // Method Not Allowed
          try {
            const getResponse = await fetch(result.url, {
              method: 'GET',
              redirect: 'follow',
              credentials: 'omit',
              signal: controller.signal,
              timeout: this.config.timeout
            });
            
            result.isValid = getResponse.ok;
            result.status = getResponse.status;
            result.statusText = getResponse.statusText;
            
            // Get content type to determine if it's an image or video
            const contentType = getResponse.headers.get('content-type');
            if (contentType) {
              result.contentType = contentType;
              result.isImage = contentType.startsWith('image/');
              result.isVideo = contentType.startsWith('video/');
            }
            
            // Get file size
            const contentLength = getResponse.headers.get('content-length');
            if (contentLength) {
              result.fileSize = parseInt(contentLength, 10);
            }
          } catch (error) {
            result.isValid = false;
            result.error = error instanceof Error ? error.message : String(error);
          }
        } else {
          // Get content type to determine if it's an image or video
          const contentType = response.headers.get('content-type');
          if (contentType) {
            result.contentType = contentType;
            result.isImage = contentType.startsWith('image/');
            result.isVideo = contentType.startsWith('video/');
          }
          
          // Get file size
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            result.fileSize = parseInt(contentLength, 10);
          }
        }
      } catch (error) {
        // Clear timeout
        clearTimeout(timeoutId);
        
        result.isValid = false;
        
        if (error instanceof Error) {
          // Handle specific error types for better error messages
          if (error.name === 'AbortError') {
            result.error = `Request timed out after ${this.config.timeout}ms`;
          } else {
            result.error = error.message;
          }
        } else {
          result.error = String(error);
        }
      }
      
      // Calculate validation time
      result.validationTime = Date.now() - startTime;
    } catch (error) {
      result.isValid = false;
      result.error = error instanceof Error ? error.message : String(error);
    }
    
    // Cache the result
    validationCache.set(url, result);
    
    return result;
  }
  
  /**
   * Validate multiple URLs in parallel
   * 
   * @param urls Array of URLs to validate
   * @returns Promise resolving to array of validation results
   */
  async validateUrls(urls: string[]): Promise<UrlValidationResult[]> {
    // Deduplicate URLs
    const uniqueUrls = [...new Set(urls)];
    
    // Create batches of URLs to process in parallel
    const batches: string[][] = [];
    for (let i = 0; i < uniqueUrls.length; i += this.config.concurrency) {
      batches.push(uniqueUrls.slice(i, i + this.config.concurrency));
    }
    
    // Process batches sequentially
    const results: UrlValidationResult[] = [];
    for (const batch of batches) {
      // Process URLs in batch in parallel
      const batchResults = await Promise.all(
        batch.map(url => this.validateUrl(url))
      );
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Extract URLs from an object
   * 
   * @param obj Object to extract URLs from
   * @param path Current object path
   * @returns Array of URL entries with their paths
   */
  extractUrls(obj: any, path = ''): { url: string; path: string }[] {
    const urls: { url: string; path: string }[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return urls;
    }
    
    // Check if object has a 'url' property that is a string
    if (obj.url && typeof obj.url === 'string') {
      urls.push({ url: obj.url, path: path ? `${path}.url` : 'url' });
    }
    
    // Special handling for arrays of media objects
    if (obj.media && Array.isArray(obj.media)) {
      obj.media.forEach((mediaItem: any, index: number) => {
        if (mediaItem && typeof mediaItem === 'object' && mediaItem.url) {
          urls.push({
            url: mediaItem.url,
            path: path ? `${path}.media[${index}].url` : `media[${index}].url`
          });
        }
      });
    }
    
    // Recursively search for URLs in nested objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const newPath = path ? `${path}.${key}` : key;
        
        if (typeof value === 'string' && this.isUrlLike(value)) {
          // Found a string that looks like a URL
          urls.push({ url: value, path: newPath });
        } else if (typeof value === 'object') {
          // Recursively search nested objects and arrays
          urls.push(...this.extractUrls(value, newPath));
        }
      }
    }
    
    return urls;
  }
  
  /**
   * Check if a string looks like a URL
   * 
   * @param str String to check
   * @returns True if string looks like a URL
   */
  isUrlLike(str: string): boolean {
    // Check if string is a URL
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    // Simple URL patterns
    const urlPatterns = [
      /^https?:\/\//i,    // http:// or https://
      /^\/[a-zA-Z0-9]/,   // starts with / followed by alphanumeric
      /^data:image\//i,   // data:image/ (inline images)
      /^blob:/i           // blob: (blob URLs)
    ];
    
    return urlPatterns.some(pattern => pattern.test(str));
  }
  
  /**
   * Check if a URL should be ignored during validation
   * 
   * @param url URL to check
   * @returns True if URL should be ignored
   */
  shouldIgnoreUrl(url: string): boolean {
    if (!url || typeof url !== 'string') {
      return true;
    }
    
    return this.config.ignoreKeywords.some(keyword => url.includes(keyword));
  }
  
  /**
   * Generate a hash for a URL
   * 
   * @param url URL to hash
   * @returns Hash of URL
   */
  hashUrl(url: string): string {
    return createHash('md5').update(url).digest('hex');
  }
  
  /**
   * Fix a relative URL by converting it to an absolute URL
   * 
   * @param url URL to fix
   * @returns Fixed URL
   */
  fixRelativeUrl(url: string): string {
    if (!url || typeof url !== 'string') {
      return url;
    }
    
    if (url.startsWith('/')) {
      return `${this.config.baseUrl}${url}`;
    }
    
    return url;
  }
  
  /**
   * Clear the validation cache
   */
  clearCache(): void {
    validationCache.clear();
  }
}