/**
 * Media Validation Service
 * 
 * This domain service contains the core logic for validating media URLs.
 * It checks if URLs are valid and match the expected media type.
 */

import { Media, MediaType } from './media';

/**
 * Media validation result
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
 * Media validation service
 */
export class MediaValidationService {
  /**
   * Validate a media URL without performing a network request
   * This is a basic validation that only checks the URL format
   */
  static validateMediaBasic(media: Media): MediaValidationResult {
    const { url, type } = media;
    
    // Check if URL is present
    if (!url) {
      return {
        isValid: false,
        url: '',
        type,
        error: 'URL is required'
      };
    }
    
    // Check if URL is a string
    if (typeof url !== 'string') {
      return {
        isValid: false,
        url: String(url),
        type,
        error: 'URL must be a string'
      };
    }
    
    // Check for blob URLs (which are only valid in browser context)
    if (url.startsWith('blob:')) {
      return {
        isValid: false,
        url,
        type,
        error: 'Blob URLs are not persistent and must be converted to a storage URL'
      };
    }
    
    // Check for data URLs (which are inefficient and should be stored properly)
    if (url.startsWith('data:')) {
      return {
        isValid: false,
        url,
        type,
        error: 'Data URLs should be converted to stored files'
      };
    }
    
    // Check for relative URLs
    if (url.startsWith('/') && !url.startsWith('//')) {
      return {
        isValid: false,
        url,
        type,
        error: 'Relative URLs must be converted to absolute URLs'
      };
    }
    
    // Check for missing protocol
    if (!url.match(/^(https?:\/\/|ftp:\/\/|\/\/)/i)) {
      if (!url.startsWith('/')) {
        return {
          isValid: false,
          url,
          type,
          error: 'URL is missing protocol (http:// or https://)'
        };
      }
    }
    
    // Check for valid image/video file extensions based on type
    if (type === MediaType.IMAGE) {
      // Check for obvious video URLs
      const videoExtensions = ['.mp4', '.mov', '.avi', '.webm', '.mpg', '.mpeg', '.mkv'];
      const hasVideoExtension = videoExtensions.some(ext => url.toLowerCase().endsWith(ext));
      
      if (hasVideoExtension) {
        return {
          isValid: false,
          url,
          type,
          error: 'URL appears to be a video, but media type is image',
          expectedType: MediaType.IMAGE,
          actualType: 'video'
        };
      }
    } else if (type === MediaType.VIDEO) {
      // Check for obvious image URLs
      const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp'];
      const hasImageExtension = imageExtensions.some(ext => url.toLowerCase().endsWith(ext));
      
      if (hasImageExtension) {
        return {
          isValid: false,
          url,
          type,
          error: 'URL appears to be an image, but media type is video',
          expectedType: MediaType.VIDEO,
          actualType: 'image'
        };
      }
    }
    
    // All basic checks passed
    return {
      isValid: true,
      url,
      type
    };
  }
  
  /**
   * Infer media type from URL
   */
  static inferMediaTypeFromUrl(url: string): MediaType {
    if (!url || typeof url !== 'string') {
      return MediaType.IMAGE; // Default to image
    }
    
    // Check for video-related patterns in the URL
    const videoPatterns = [
      '-SBV-', 
      'Dynamic motion',
      '.mp4', 
      '.mov', 
      '.avi', 
      '.webm', 
      '.mpg', 
      '.mpeg', 
      '.mkv',
      'video/'
    ];
    
    // Check URL for video patterns
    const isVideoUrl = videoPatterns.some(pattern => url.includes(pattern));
    
    return isVideoUrl ? MediaType.VIDEO : MediaType.IMAGE;
  }
  
  /**
   * Check if media might be a video based on field path
   */
  static isVideoBasedOnFieldPath(fieldPath: string): boolean {
    if (!fieldPath || typeof fieldPath !== 'string') {
      return false;
    }
    
    // Check field path for video-related patterns
    return (
      fieldPath.toLowerCase().includes('video') || 
      fieldPath.toLowerCase().includes('mov') ||
      fieldPath.toLowerCase().includes('mp4')
    );
  }
}