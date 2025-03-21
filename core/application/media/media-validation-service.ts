/**
 * Media Validation Service Implementation
 * 
 * This module implements the IMediaValidationService interface.
 * It provides functionality for validating media resources.
 */

import axios from 'axios';
import { 
  IMediaValidationService, 
  MediaValidationResult,
  MediaTypeDetectionResult,
  MediaValidationOptions
} from '../../domain/media/media-validation-service';
import { Media } from '../../domain/media/media';

/**
 * Media validation service configuration
 */
export interface MediaValidationServiceConfig {
  timeout: number;
  placeholderImageUrl: string;
  placeholderVideoUrl: string;
  checkContentTypes: boolean;
}

/**
 * Media validation service implementation
 */
export class MediaValidationService implements IMediaValidationService {
  // File extension mappings
  private readonly imageExtensions = [
    '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff'
  ];
  
  private readonly videoExtensions = [
    '.mp4', '.mov', '.avi', '.webm', '.ogg', '.mkv', '.flv', '.m4v'
  ];
  
  // Video detection patterns
  private readonly videoPatterns = [
    '-SBV-',
    'Dynamic motion',
    '.mp4',
    '.mov',
    '.avi',
    '.webm',
    'video/'
  ];
  
  constructor(private readonly config: MediaValidationServiceConfig) {}
  
  /**
   * Validate a media URL
   */
  async validateMediaUrl(
    url: string,
    options?: MediaValidationOptions
  ): Promise<MediaValidationResult> {
    try {
      if (!url) {
        return {
          isValid: false,
          url,
          mediaType: 'unknown',
          error: 'URL is empty or undefined'
        };
      }
      
      // Handle relative URLs
      if (this.isRelativeUrl(url)) {
        return {
          isValid: false,
          url,
          mediaType: 'unknown',
          error: 'Invalid URL: Relative URLs are not supported'
        };
      }
      
      // Handle blob URLs
      if (this.isBlobUrl(url)) {
        return {
          isValid: false,
          url,
          mediaType: 'unknown',
          error: 'Invalid URL: Blob URLs are not supported'
        };
      }
      
      // Handle data URLs (they're always valid)
      if (this.isDataUrl(url)) {
        const mediaType = url.startsWith('data:image/') 
          ? 'image' 
          : url.startsWith('data:video/') 
            ? 'video' 
            : 'unknown';
            
        return {
          isValid: true,
          url,
          mediaType,
          status: 200,
          statusText: 'OK',
          contentType: mediaType === 'image' ? 'image/base64' : 'unknown'
        };
      }
      
      // Check URL validity
      if (!this.isValidUrl(url)) {
        return {
          isValid: false,
          url,
          mediaType: 'unknown',
          error: 'Invalid URL format'
        };
      }
      
      // Skip content validation if not needed
      if (options?.validateContent === false) {
        // Guess mediaType based on URL
        const mediaType = this.guessMediaTypeFromUrl(url);
        
        return {
          isValid: true,
          url,
          mediaType,
          status: 200,
          statusText: 'OK (not validated)'
        };
      }
      
      // Verify URL with HTTP request
      try {
        const response = await axios.head(url, {
          timeout: options?.timeout || this.config.timeout,
          maxRedirects: 5,
          validateStatus: () => true // Accept any status code
        });
        
        const contentType = response.headers['content-type'] || '';
        const mediaType = this.getMediaTypeFromContentType(contentType, url);
        
        // Check if expected media type matches detected media type
        if (options?.expectedType && mediaType !== 'unknown' && options.expectedType !== mediaType) {
          return {
            isValid: false,
            url,
            mediaType,
            status: response.status,
            statusText: response.statusText,
            contentType,
            error: `Expected ${options.expectedType}, got ${mediaType}`
          };
        }
        
        // Check if response status is successful
        if (response.status >= 400) {
          return {
            isValid: false,
            url,
            mediaType,
            status: response.status,
            statusText: response.statusText,
            contentType,
            error: `HTTP error: ${response.status} ${response.statusText}`
          };
        }
        
        return {
          isValid: true,
          url,
          mediaType,
          status: response.status,
          statusText: response.statusText,
          contentType
        };
      } catch (error) {
        // Handle Axios errors
        if (axios.isAxiosError(error)) {
          return {
            isValid: false,
            url,
            mediaType: 'unknown',
            status: error.response?.status,
            statusText: error.response?.statusText,
            contentType: error.response?.headers?.['content-type'],
            error: error.message
          };
        }
        
        // Handle other errors
        return {
          isValid: false,
          url,
          mediaType: 'unknown',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } catch (error) {
      return {
        isValid: false,
        url,
        mediaType: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Validate a media object
   */
  async validateMedia(
    media: Media,
    options?: MediaValidationOptions
  ): Promise<MediaValidationResult> {
    const expectedType = media.type === 'image' || media.type === 'video'
      ? media.type
      : undefined;
    
    return this.validateMediaUrl(media.url, {
      ...options,
      expectedType
    });
  }
  
  /**
   * Check if a URL points to an image
   */
  async isImageUrl(url: string): Promise<boolean> {
    const result = await this.detectMediaType(url);
    return result.detectedType === 'image';
  }
  
  /**
   * Check if a URL points to a video
   */
  async isVideoUrl(url: string): Promise<boolean> {
    const result = await this.detectMediaType(url);
    return result.detectedType === 'video';
  }
  
  /**
   * Detect the media type of a URL
   */
  async detectMediaType(url: string): Promise<MediaTypeDetectionResult> {
    // Check for null or empty URL
    if (!url) {
      return {
        url,
        detectedType: 'unknown',
        isTypeValid: false
      };
    }
    
    // Check for data URLs
    if (this.isDataUrl(url)) {
      const isImage = url.startsWith('data:image/');
      const isVideo = url.startsWith('data:video/');
      
      if (isImage) {
        return {
          url,
          detectedType: 'image',
          mimeType: 'image/data-url',
          isTypeValid: true
        };
      }
      
      if (isVideo) {
        return {
          url,
          detectedType: 'video',
          mimeType: 'video/data-url',
          isTypeValid: true
        };
      }
      
      return {
        url,
        detectedType: 'unknown',
        mimeType: 'application/data-url',
        isTypeValid: false
      };
    }
    
    // Check file extension first
    const extension = this.getFileExtension(url);
    
    if (extension) {
      if (this.isImageExtension(extension)) {
        return {
          url,
          detectedType: 'image',
          mimeType: this.getMimeTypeFromExtension(extension),
          isTypeValid: true
        };
      }
      
      if (this.isVideoExtension(extension)) {
        return {
          url,
          detectedType: 'video',
          mimeType: this.getMimeTypeFromExtension(extension),
          isTypeValid: true
        };
      }
    }
    
    // Check for video patterns in URL
    for (const pattern of this.videoPatterns) {
      if (url.includes(pattern)) {
        return {
          url,
          detectedType: 'video',
          isTypeValid: true
        };
      }
    }
    
    // If the config allows content type checking, make an HTTP request
    if (this.config.checkContentTypes && this.isValidUrl(url) && !this.isRelativeUrl(url)) {
      try {
        const response = await axios.head(url, {
          timeout: this.config.timeout,
          maxRedirects: 5,
          validateStatus: () => true
        });
        
        const contentType = response.headers['content-type'] || '';
        
        if (contentType.startsWith('image/')) {
          return {
            url,
            detectedType: 'image',
            mimeType: contentType,
            isTypeValid: true
          };
        }
        
        if (contentType.startsWith('video/')) {
          return {
            url,
            detectedType: 'video',
            mimeType: contentType,
            isTypeValid: true
          };
        }
        
        return {
          url,
          detectedType: 'unknown',
          mimeType: contentType,
          isTypeValid: false
        };
      } catch (error) {
        // If we can't check content type, fall back to guessing
        const guessedType = this.guessMediaTypeFromUrl(url);
        
        return {
          url,
          detectedType: guessedType,
          isTypeValid: guessedType !== 'unknown'
        };
      }
    }
    
    // Default to guessing based on URL patterns
    const guessedType = this.guessMediaTypeFromUrl(url);
    
    return {
      url,
      detectedType: guessedType,
      isTypeValid: guessedType !== 'unknown'
    };
  }
  
  /**
   * Check if a URL is relative
   */
  isRelativeUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    
    // Check if it starts with / or ./ or ../
    return url.startsWith('/') || 
      url.startsWith('./') || 
      url.startsWith('../') || 
      (!url.includes('://') && !url.startsWith('data:') && !url.startsWith('blob:'));
  }
  
  /**
   * Check if a URL is a blob URL
   */
  isBlobUrl(url: string): boolean {
    return url?.startsWith('blob:') || false;
  }
  
  /**
   * Check if a URL is a data URL
   */
  isDataUrl(url: string): boolean {
    return url?.startsWith('data:') || false;
  }
  
  /**
   * Normalize a URL by adding a base URL if it's relative
   */
  normalizeUrl(url: string, baseUrl: string): string {
    if (!url) {
      return '';
    }
    
    if (!this.isRelativeUrl(url)) {
      return url;
    }
    
    // Remove trailing slash from base URL if present
    const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    
    // Add leading slash to URL if missing
    const path = url.startsWith('/') ? url : `/${url}`;
    
    return `${base}${path}`;
  }
  
  /**
   * Extract the file extension from a URL
   */
  getFileExtension(url: string): string | null {
    if (!url) {
      return null;
    }
    
    // Remove query string and hash
    const cleanUrl = url.split('?')[0].split('#')[0];
    
    // Find the last dot in the path
    const lastDot = cleanUrl.lastIndexOf('.');
    
    if (lastDot === -1 || lastDot === 0) {
      return null;
    }
    
    // Extract the extension (including the dot)
    return cleanUrl.slice(lastDot).toLowerCase();
  }
  
  /**
   * Check if a file extension is an image extension
   */
  isImageExtension(extension: string): boolean {
    return this.imageExtensions.includes(extension.toLowerCase());
  }
  
  /**
   * Check if a file extension is a video extension
   */
  isVideoExtension(extension: string): boolean {
    return this.videoExtensions.includes(extension.toLowerCase());
  }
  
  /**
   * Get a placeholder URL for a media type
   */
  getPlaceholderUrl(mediaType: 'image' | 'video'): string {
    return mediaType === 'image'
      ? this.config.placeholderImageUrl
      : this.config.placeholderVideoUrl;
  }
  
  /**
   * Get media type from content type header
   */
  private getMediaTypeFromContentType(
    contentType: string,
    url: string
  ): 'image' | 'video' | 'unknown' {
    if (!contentType) {
      return this.guessMediaTypeFromUrl(url);
    }
    
    if (contentType.startsWith('image/')) {
      return 'image';
    }
    
    if (contentType.startsWith('video/')) {
      return 'video';
    }
    
    // Check URL for video patterns
    for (const pattern of this.videoPatterns) {
      if (url.includes(pattern)) {
        return 'video';
      }
    }
    
    return 'unknown';
  }
  
  /**
   * Guess media type from URL
   */
  private guessMediaTypeFromUrl(url: string): 'image' | 'video' | 'unknown' {
    if (!url) {
      return 'unknown';
    }
    
    // Check extension
    const extension = this.getFileExtension(url);
    
    if (extension) {
      if (this.isImageExtension(extension)) {
        return 'image';
      }
      
      if (this.isVideoExtension(extension)) {
        return 'video';
      }
    }
    
    // Check for common video indicators in URL
    for (const pattern of this.videoPatterns) {
      if (url.includes(pattern)) {
        return 'video';
      }
    }
    
    // Check for common image indicators in URL
    if (
      url.includes('image') || 
      url.includes('photo') || 
      url.includes('picture') || 
      url.includes('img') || 
      url.includes('thumbnail')
    ) {
      return 'image';
    }
    
    // Default assumption: most media URLs are images
    return 'image';
  }
  
  /**
   * Get MIME type from file extension
   */
  private getMimeTypeFromExtension(extension: string): string {
    // Image MIME types
    const imageMimeTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.webp': 'image/webp',
      '.bmp': 'image/bmp',
      '.tiff': 'image/tiff'
    };
    
    // Video MIME types
    const videoMimeTypes: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.webm': 'video/webm',
      '.ogg': 'video/ogg',
      '.mkv': 'video/x-matroska',
      '.flv': 'video/x-flv',
      '.m4v': 'video/x-m4v'
    };
    
    // Check for image MIME type
    if (extension in imageMimeTypes) {
      return imageMimeTypes[extension];
    }
    
    // Check for video MIME type
    if (extension in videoMimeTypes) {
      return videoMimeTypes[extension];
    }
    
    // Unknown extension
    return 'application/octet-stream';
  }
  
  /**
   * Check if a URL is valid
   */
  private isValidUrl(url: string): boolean {
    if (!url) {
      return false;
    }
    
    // Data URLs and blob URLs are valid
    if (this.isDataUrl(url) || this.isBlobUrl(url)) {
      return true;
    }
    
    // Relative URLs need a base URL
    if (this.isRelativeUrl(url)) {
      return false;
    }
    
    try {
      // Try to parse the URL
      new URL(url);
      return true;
    } catch (error) {
      return false;
    }
  }
}