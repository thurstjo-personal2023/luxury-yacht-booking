/**
 * Firebase Repository Mock for Integration Tests
 * 
 * This file provides enhanced mocking capabilities for testing the Firebase repository
 * with emulators. It implements HTTP mocking for URL validation, so we can test
 * URLs without making actual HTTP requests.
 */

import { Firestore } from 'firebase/firestore';
import { MediaType } from '../../../core/domain/media/media-type';
import { ValidationResult } from '../../../core/domain/validation/validation-result';
import { FirebaseMediaRepository, FirebaseMediaRepositoryConfig } from '../../../adapters/repositories/firebase/firebase-media-repository';

/**
 * Mock URL validation based on patterns
 */
export function createUrlValidationMock() {
  // Define validation patterns
  const validImagePatterns = [
    /\.jpg$/i,
    /\.jpeg$/i,
    /\.png$/i,
    /\.gif$/i,
    /\.webp$/i,
    /\/images\//i,
    /\/photos\//i,
    /example\.com\/valid/i,
    /placeholderImage/i
  ];
  
  const validVideoPatterns = [
    /\.mp4$/i,
    /\.mov$/i,
    /\.avi$/i,
    /\.webm$/i,
    /\-SBV\-/i,
    /\/videos\//i,
    /video\-preview/i,
    /example\.com\/video/i
  ];
  
  const invalidPatterns = [
    /invalid/i,
    /broken/i,
    /error/i,
    /not-found/i,
    /deleted/i,
    /undefined/i,
    /null/i
  ];
  
  /**
   * Determine if a URL is valid based on patterns
   */
  function isValidUrl(url: string, expectedType: MediaType): {
    isValid: boolean;
    contentType?: string;
    error?: string;
  } {
    // Always fail for invalid patterns
    if (invalidPatterns.some(pattern => pattern.test(url))) {
      return {
        isValid: false,
        error: 'Invalid URL or resource not found'
      };
    }
    
    // Empty URLs are invalid
    if (!url) {
      return {
        isValid: false,
        error: 'Empty URL'
      };
    }
    
    // Relative URLs (starting with /) are invalid
    if (url.startsWith('/')) {
      return {
        isValid: false,
        error: 'Invalid URL'
      };
    }
    
    // Blob URLs are invalid
    if (url.startsWith('blob:')) {
      return {
        isValid: false,
        error: 'Blob URL not allowed'
      };
    }
    
    // Check if it's an image URL
    const isImage = validImagePatterns.some(pattern => pattern.test(url));
    
    // Check if it's a video URL
    const isVideo = validVideoPatterns.some(pattern => pattern.test(url));
    
    // If it's a video but we expected an image, return type mismatch
    if (isVideo && expectedType === MediaType.IMAGE) {
      return {
        isValid: false,
        contentType: 'video/mp4',
        error: 'Expected image, got video'
      };
    }
    
    // If it's an image but we expected a video, return type mismatch
    if (isImage && expectedType === MediaType.VIDEO) {
      return {
        isValid: false,
        contentType: 'image/jpeg',
        error: 'Expected video, got image'
      };
    }
    
    // If it matches the expected type, return valid
    if ((isImage && expectedType === MediaType.IMAGE) || 
        (isVideo && expectedType === MediaType.VIDEO) ||
        expectedType === MediaType.UNKNOWN) {
      return {
        isValid: true,
        contentType: isImage ? 'image/jpeg' : 'video/mp4'
      };
    }
    
    // Default case: assume not valid
    return {
      isValid: false,
      error: 'URL does not match expected media type'
    };
  }
  
  return isValidUrl;
}

/**
 * Enhanced Firebase Media Repository for testing
 * 
 * This extends the regular repository but mocks HTTP requests
 * for URL validation to avoid external dependencies in tests.
 */
export class MockFirebaseMediaRepository extends FirebaseMediaRepository {
  private urlValidator: ReturnType<typeof createUrlValidationMock>;
  
  constructor(
    firestore: Firestore,
    config?: FirebaseMediaRepositoryConfig
  ) {
    super(firestore, config);
    this.urlValidator = createUrlValidationMock();
  }
  
  /**
   * Override validateUrl to use the pattern-based validator
   * instead of making actual HTTP requests
   */
  async validateUrl(
    url: string,
    expectedType: MediaType = MediaType.IMAGE
  ): Promise<ValidationResult> {
    // Get validation result from pattern matching
    const result = this.urlValidator(url, expectedType);
    
    if (result.isValid) {
      return ValidationResult.createValid(
        url,
        result.contentType,
        200,
        'OK'
      );
    } else {
      return ValidationResult.createInvalid(
        url,
        result.error || 'Validation failed',
        404,
        'Not Found',
        result.contentType
      );
    }
  }
}