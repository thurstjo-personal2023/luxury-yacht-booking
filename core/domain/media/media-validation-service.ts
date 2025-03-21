/**
 * Media Validation Domain Service
 * 
 * This service contains the core logic for validating media URLs and types.
 * It is framework-agnostic and depends only on domain entities.
 */

import { Media, MediaType } from './media';

/**
 * Result of media URL validation
 */
export interface MediaValidationResult {
  isValid: boolean;
  url: string;
  type: MediaType;
  status?: number;
  statusText?: string;
  error?: string;
  expectedType?: MediaType;
  actualType?: string;
}

/**
 * Media validation domain service
 */
export class MediaValidationService {
  
  /**
   * Video file extensions that indicate a video media type
   */
  private static readonly VIDEO_EXTENSIONS = [
    '.mp4', '.mov', '.avi', '.webm', '.mkv', '.flv', '.wmv', '.m4v'
  ];

  /**
   * Video filename indicators that suggest video content
   */
  private static readonly VIDEO_INDICATORS = [
    '-SBV-', 'Dynamic motion', 'video'
  ];

  /**
   * Image file extensions that indicate an image media type
   */
  private static readonly IMAGE_EXTENSIONS = [
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.tiff'
  ];
  
  /**
   * Detect media type from URL
   * This logic examines the URL for patterns that indicate image or video content
   */
  public static detectMediaTypeFromUrl(url: string): MediaType {
    // Convert to lowercase for case-insensitive matching
    const lowerUrl = url.toLowerCase();
    
    // Check for video extensions
    if (this.VIDEO_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
      return MediaType.VIDEO;
    }
    
    // Check for video indicators in the URL
    if (this.VIDEO_INDICATORS.some(indicator => lowerUrl.includes(indicator.toLowerCase()))) {
      return MediaType.VIDEO;
    }
    
    // Check for image extensions
    if (this.IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
      return MediaType.IMAGE;
    }
    
    // Default to image type if no specific indicators are found
    // This is a safe default as most media in the system are images
    return MediaType.IMAGE;
  }
  
  /**
   * Check if a URL is valid (syntactically)
   */
  public static isUrlValid(url: string): boolean {
    // Handle relative URLs (starting with /)
    if (url.startsWith('/') && !url.startsWith('//')) {
      return true;
    }
    
    try {
      // Check if URL can be parsed
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Validate a media item without checking external resources
   * This performs basic validation without network requests
   */
  public static validateMediaBasic(media: Media): MediaValidationResult {
    // Check if URL is syntactically valid
    if (!this.isUrlValid(media.url)) {
      return {
        isValid: false,
        url: media.url,
        type: media.type,
        error: 'Invalid URL format',
        expectedType: media.type
      };
    }
    
    // Check for blob URLs (which need resolution)
    if (media.isBlobUrl()) {
      return {
        isValid: false,
        url: media.url,
        type: media.type,
        error: 'Blob URL needs resolution',
        expectedType: media.type
      };
    }
    
    // Detect media type from URL and compare with specified type
    const detectedType = this.detectMediaTypeFromUrl(media.url);
    const typeMatches = detectedType === media.type;
    
    if (!typeMatches) {
      return {
        isValid: false,
        url: media.url,
        type: media.type,
        error: `Type mismatch: expected ${media.type}, detected ${detectedType}`,
        expectedType: media.type,
        actualType: detectedType
      };
    }
    
    return {
      isValid: true,
      url: media.url,
      type: media.type,
      expectedType: media.type
    };
  }
}