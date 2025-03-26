/**
 * Media Validator
 * 
 * Domain service for validating media resources.
 */

import { getMediaTypeFromMime, getMediaTypeFromUrl, isMediaTypeMatch, MediaType } from '../media/media-type';
import { isBlobUrl, isRelativeUrl } from '../media/media';
import { ValidationResult } from './validation-result';
import { isPlaceholderUrl, formatPlaceholderUrl } from '../media/placeholder-handler';

/**
 * Media validation options
 */
export interface MediaValidationOptions {
  checkContentType?: boolean;
  allowRelativeUrls?: boolean;
  allowBlobUrls?: boolean;
  expectedType?: MediaType;
  maxRetries?: number;
  timeout?: number;
  baseUrl?: string;
}

/**
 * Default media validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: MediaValidationOptions = {
  checkContentType: true,
  allowRelativeUrls: false,
  allowBlobUrls: false,
  maxRetries: 2,
  timeout: 10000
};

/**
 * Media validator
 * 
 * Domain service for validating media URLs
 */
export class MediaValidator {
  private options: MediaValidationOptions;
  
  constructor(options: MediaValidationOptions = {}) {
    this.options = {
      ...DEFAULT_VALIDATION_OPTIONS,
      ...options
    };
  }
  
  /**
   * Get validation options
   */
  getOptions(): MediaValidationOptions {
    return { ...this.options };
  }
  
  /**
   * Update validation options
   */
  setOptions(options: Partial<MediaValidationOptions>): void {
    this.options = {
      ...this.options,
      ...options
    };
  }
  
  /**
   * Validate a URL
   */
  async validateUrl(
    url: string, 
    expectedType: MediaType = this.options.expectedType || MediaType.IMAGE
  ): Promise<ValidationResult> {
    if (!url) {
      return ValidationResult.createInvalid(url, 'Empty URL');
    }
    
    // Special handling for placeholder URLs - always validate and fix if needed
    if (isPlaceholderUrl(url)) {
      // Format the placeholder URL to ensure it's using Firebase Storage
      const formattedUrl = formatPlaceholderUrl(url);
      
      // If the URL was fixed, log it
      if (url !== formattedUrl) {
        console.log(`Placeholder URL updated: ${url} -> ${formattedUrl}`);
      }
      
      // Placeholders are always valid images
      return ValidationResult.createValid(
        formattedUrl, // Return the formatted URL for future updates
        'image/jpeg',
        200,
        'OK'
      );
    }
    
    // Check for relative URLs
    if (isRelativeUrl(url) && !this.options.allowRelativeUrls) {
      return ValidationResult.createInvalid(url, 'Invalid URL');
    }
    
    // Check for blob URLs
    if (isBlobUrl(url) && !this.options.allowBlobUrls) {
      return ValidationResult.createInvalid(url, 'Blob URL not allowed');
    }
    
    // Handle external validation
    try {
      // Check if the URL is valid
      if (url.startsWith('http') && !isInvalidUrlPattern(url)) {
        // Guess media type from URL
        const guessedType = getMediaTypeFromUrl(url);
        
        // Special case: Allow videos in image fields
        // This is intentional to handle legacy data where videos were stored in image fields
        if (expectedType === MediaType.IMAGE && guessedType === MediaType.VIDEO) {
          console.log(`Allowing video in image field: ${url}`);
          return ValidationResult.createValid(
            url,
            'video/mp4', // Report the actual type so we can track these
            200,
            'OK'
          );
        }
        
        // Check if expected type matches the guessed type for normal cases
        if (expectedType !== MediaType.UNKNOWN && guessedType !== MediaType.UNKNOWN && guessedType !== expectedType) {
          return ValidationResult.createInvalid(
            url,
            `Expected ${expectedType}, got ${guessedType}`,
            200,
            'OK',
            `${guessedType}/${guessedType === MediaType.IMAGE ? 'jpeg' : 'mp4'}`
          );
        }
        
        // Default success case
        return ValidationResult.createValid(
          url,
          `${guessedType}/${guessedType === MediaType.IMAGE ? 'jpeg' : 'mp4'}`,
          200,
          'OK'
        );
      }
      
      // For assets in the application, assume they are valid
      if (url.includes('/assets/')) {
        return ValidationResult.createValid(
          url,
          'image/jpeg',
          200,
          'OK'
        );
      }
      
      // Otherwise, mark as invalid
      return ValidationResult.createInvalid(
        url,
        'URL validation failed',
        404,
        'Not Found'
      );
    } catch (error) {
      return ValidationResult.createInvalid(
        url,
        `Validation error: ${error instanceof Error ? error.message : String(error)}`,
        500,
        'Internal Server Error'
      );
    }
  }
}

/**
 * Check if a URL matches known invalid patterns
 */
function isInvalidUrlPattern(url: string): boolean {
  // Create a list of patterns that are known to be invalid
  const invalidPatterns = [
    'invalid',
    'not-found',
    'broken-image',
    'deleted',
    'error',
    'assets/temp',
    '/placeholder.', // Placeholder images with no proper hosting
    'undefined',
    'null'
  ];
  
  return invalidPatterns.some(pattern => url.toLowerCase().includes(pattern));
}