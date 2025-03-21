/**
 * MediaValidator Domain Service
 * 
 * Contains pure validation logic for media URLs, separated from infrastructure concerns.
 */

import { MediaType } from '../media/media-type';
import { URL } from '../value-objects/url';
import { ValidationResult } from './validation-result';

/**
 * Video detection patterns
 */
export const VIDEO_PATTERNS = [
  "-SBV-",
  "Dynamic motion",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  "video/"
];

/**
 * Media type detection options
 */
export interface MediaTypeDetectionOptions {
  urlPatternDetection?: boolean;
  mimeTypeCheck?: boolean;
}

/**
 * Media validation options
 */
export interface MediaValidationOptions {
  baseUrl?: string;
  placeholderUrl?: string;
  detectMediaType?: boolean;
  typeDetectionOptions?: MediaTypeDetectionOptions;
}

/**
 * Default media validation options
 */
export const DEFAULT_VALIDATION_OPTIONS: MediaValidationOptions = {
  baseUrl: "https://etoile-yachts.firebasestorage.app",
  placeholderUrl: "https://etoile-yachts.firebasestorage.app/yacht-placeholder.jpg",
  detectMediaType: true,
  typeDetectionOptions: {
    urlPatternDetection: true,
    mimeTypeCheck: true
  }
};

/**
 * Media Validator Domain Service
 */
export class MediaValidator {
  /**
   * Validate a media URL
   */
  static validateUrl(
    url: string | URL,
    expectedType: MediaType = MediaType.IMAGE,
    options: MediaValidationOptions = DEFAULT_VALIDATION_OPTIONS
  ): ValidationResult {
    // Skip empty URLs
    if (!url) {
      return ValidationResult.createInvalid("", "URL is empty or undefined");
    }

    const urlStr = url instanceof URL ? url.value : url;

    // Fix relative URLs if base URL is provided
    if (urlStr.startsWith("/") && options.baseUrl) {
      // Convert to absolute URL with provided base
      const absoluteUrl = `${options.baseUrl}${urlStr}`;
      
      // Return a validation result for the fixed URL
      return ValidationResult.createValid(absoluteUrl, {
        detectedType: expectedType
      });
    }

    // Fix blob URLs if placeholder is provided
    if (urlStr.startsWith("blob:") && options.placeholderUrl) {
      // Replace with placeholder
      return ValidationResult.createValid(options.placeholderUrl, {
        detectedType: expectedType
      });
    }

    // Detect if this should be a video based on URL patterns
    if (options.detectMediaType && 
        expectedType === MediaType.IMAGE && 
        options.typeDetectionOptions?.urlPatternDetection && 
        this.isLikelyVideo(urlStr)) {
      return ValidationResult.createValid(urlStr, {
        detectedType: MediaType.VIDEO
      });
    }

    // Return the validated URL
    return ValidationResult.createValid(urlStr, {
      detectedType: expectedType
    });
  }

  /**
   * Check if a URL is likely a video based on known patterns
   */
  static isLikelyVideo(url: string): boolean {
    const lowerUrl = url.toLowerCase();
    return VIDEO_PATTERNS.some(pattern => 
      lowerUrl.includes(pattern.toLowerCase())
    );
  }

  /**
   * Validate a MIME type matches the expected media type
   */
  static validateMimeType(
    mimeType: string,
    expectedType: MediaType
  ): boolean {
    if (!mimeType) return true;
    
    const lowerMimeType = mimeType.toLowerCase();
    
    if (expectedType === MediaType.IMAGE) {
      return lowerMimeType.startsWith('image/');
    } else if (expectedType === MediaType.VIDEO) {
      return lowerMimeType.startsWith('video/');
    }
    
    return true;
  }

  /**
   * Create a validation error for MIME type mismatch
   */
  static createMimeTypeError(
    url: string,
    mimeType: string,
    expectedType: MediaType
  ): ValidationResult {
    return ValidationResult.createInvalid(
      url,
      `Expected ${expectedType.toLowerCase()}, got ${mimeType}`,
      {
        statusCode: 200,
        statusText: "OK",
        mimeType
      }
    );
  }

  /**
   * Process a media URL, fixing relative paths and detecting media types
   */
  static processMediaUrl(
    url: string,
    declaredType: MediaType,
    options: MediaValidationOptions = DEFAULT_VALIDATION_OPTIONS
  ): {
    url: string;
    wasFixed: boolean;
    detectedType?: MediaType;
  } {
    if (!url) {
      return { url, wasFixed: false };
    }

    let wasFixed = false;
    let detectedType: MediaType | undefined;
    let processedUrl = url;

    // Fix relative URLs
    if (url.startsWith("/") && options.baseUrl) {
      processedUrl = `${options.baseUrl}${url}`;
      wasFixed = true;
    }

    // Fix blob URLs
    if (url.startsWith("blob:") && options.placeholderUrl) {
      processedUrl = options.placeholderUrl;
      wasFixed = true;
    }

    // Detect if this should be a video based on URL patterns
    if (options.detectMediaType &&
        declaredType === MediaType.IMAGE &&
        options.typeDetectionOptions?.urlPatternDetection &&
        this.isLikelyVideo(url)) {
      detectedType = MediaType.VIDEO;
      wasFixed = true;
    }

    return { url: processedUrl, wasFixed, detectedType };
  }
}