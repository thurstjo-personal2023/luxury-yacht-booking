/**
 * Media Validation Service Interface
 * 
 * This interface defines the contract for media validation service implementations.
 * It is responsible for validating media resources across the application.
 */

import { Media } from './media';

/**
 * Media validation result
 */
export interface MediaValidationResult {
  isValid: boolean;
  url: string;
  mediaType: 'image' | 'video' | 'unknown';
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
}

/**
 * Media type detection result
 */
export interface MediaTypeDetectionResult {
  url: string;
  detectedType: 'image' | 'video' | 'unknown';
  mimeType?: string;
  isTypeValid: boolean;
  expectedType?: 'image' | 'video';
}

/**
 * Media validation options
 */
export interface MediaValidationOptions {
  validateContent?: boolean;
  timeout?: number;
  expectedType?: 'image' | 'video';
}

/**
 * Media validation service interface
 */
export interface IMediaValidationService {
  /**
   * Validate a media URL
   */
  validateMediaUrl(
    url: string,
    options?: MediaValidationOptions
  ): Promise<MediaValidationResult>;
  
  /**
   * Validate a media object
   */
  validateMedia(
    media: Media,
    options?: MediaValidationOptions
  ): Promise<MediaValidationResult>;
  
  /**
   * Check if a URL points to an image
   */
  isImageUrl(url: string): Promise<boolean>;
  
  /**
   * Check if a URL points to a video
   */
  isVideoUrl(url: string): Promise<boolean>;
  
  /**
   * Detect the media type of a URL
   */
  detectMediaType(url: string): Promise<MediaTypeDetectionResult>;
  
  /**
   * Check if a URL is relative
   */
  isRelativeUrl(url: string): boolean;
  
  /**
   * Check if a URL is a blob URL
   */
  isBlobUrl(url: string): boolean;
  
  /**
   * Check if a URL is a data URL
   */
  isDataUrl(url: string): boolean;
  
  /**
   * Normalize a URL by adding a base URL if it's relative
   */
  normalizeUrl(url: string, baseUrl: string): string;
  
  /**
   * Extract the file extension from a URL
   */
  getFileExtension(url: string): string | null;
  
  /**
   * Check if a file extension is an image extension
   */
  isImageExtension(extension: string): boolean;
  
  /**
   * Check if a file extension is a video extension
   */
  isVideoExtension(extension: string): boolean;
  
  /**
   * Get a placeholder URL for a media type
   */
  getPlaceholderUrl(mediaType: 'image' | 'video'): string;
}