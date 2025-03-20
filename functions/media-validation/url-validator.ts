/**
 * URL Validator Module
 * 
 * This module provides URL validation functionality, with special handling for
 * media URLs (images and videos).
 */
import axios, { AxiosRequestConfig } from 'axios';

/**
 * Configuration options for the URL validator
 */
export interface URLValidatorOptions {
  /**
   * Logger function for errors
   */
  logError: (message: string, error?: any) => void;
  
  /**
   * Logger function for informational messages
   */
  logInfo: (message: string) => void;
  
  /**
   * Regular expression for identifying relative URLs
   * Default is URLs starting with a single slash: /image.jpg
   */
  isRelativeUrlPattern?: RegExp;
  
  /**
   * Request timeout in milliseconds
   * Default is 5000 (5 seconds)
   */
  timeout?: number;
  
  /**
   * User agent to use for requests
   * Default is a standard browser user agent
   */
  userAgent?: string;
}

/**
 * Result of URL validation
 */
export interface URLValidationResult {
  /**
   * Original URL that was validated
   */
  url: string;
  
  /**
   * Whether the URL is valid
   */
  isValid: boolean;
  
  /**
   * Error message if not valid
   */
  error?: string;
  
  /**
   * HTTP status code if available
   */
  status?: number;
  
  /**
   * Content type of the URL if available
   */
  contentType?: string;
  
  /**
   * Content length if available
   */
  contentLength?: number;
  
  /**
   * Whether the URL is a relative URL
   */
  isRelative?: boolean;
  
  /**
   * Type of media ('image', 'video', 'other')
   */
  mediaType?: 'image' | 'video' | 'other';
}

/**
 * URL Validator class
 * 
 * Validates URLs and provides utilities for determining URL types and characteristics
 */
export class URLValidator {
  private options: Required<URLValidatorOptions>;
  
  /**
   * Create a new URL validator
   */
  constructor(options: URLValidatorOptions) {
    // Default options
    this.options = {
      logError: options.logError,
      logInfo: options.logInfo,
      isRelativeUrlPattern: options.isRelativeUrlPattern || /^\/[^\/].*/,
      timeout: options.timeout || 5000,
      userAgent: options.userAgent || 'Mozilla/5.0 (compatible; EtoileYachtsValidator/1.0)'
    };
  }
  
  /**
   * Validate a URL by making a HEAD request and checking the response
   * 
   * @param url The URL to validate
   * @param expectedMediaType Optional media type to check against (e.g., 'image', 'video')
   * @returns A validation result
   */
  async validateURL(url: string, expectedMediaType?: 'image' | 'video'): Promise<URLValidationResult> {
    const result: URLValidationResult = {
      url,
      isValid: false,
      isRelative: this.isRelativeURL(url)
    };
    
    // Don't try to validate relative URLs
    if (result.isRelative) {
      result.error = 'Relative URL cannot be validated directly';
      return result;
    }
    
    try {
      // Set up request options
      const requestOptions: AxiosRequestConfig = {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': this.options.userAgent,
          'Accept': 'image/*, video/*, */*'
        },
        validateStatus: (status) => true, // Accept any status to handle it ourselves
        timeout: this.options.timeout
      };
      
      // Make request
      const response = await axios.get(url, requestOptions);
      
      // Set up result fields from response
      result.status = response.status;
      
      // Handle HTTP errors
      if (response.status >= 400) {
        result.error = response.statusText;
        return result;
      }
      
      // Check content type
      const contentType = response.headers['content-type'];
      if (contentType) {
        result.contentType = contentType;
        
        // Determine media type from content type
        if (contentType.startsWith('image/')) {
          result.mediaType = 'image';
        } else if (contentType.startsWith('video/')) {
          result.mediaType = 'video';
        } else {
          result.mediaType = 'other';
        }
        
        // Check if content type matches expected media type
        if (expectedMediaType) {
          if (
            (expectedMediaType === 'image' && !contentType.startsWith('image/')) ||
            (expectedMediaType === 'video' && !contentType.startsWith('video/'))
          ) {
            result.error = `Expected ${expectedMediaType}, but got ${contentType}`;
            return result;
          }
        }
      }
      
      // Get content length if available
      const contentLength = response.headers['content-length'];
      if (contentLength) {
        result.contentLength = parseInt(contentLength, 10);
      }
      
      // If we made it this far, the URL is valid
      result.isValid = true;
    } catch (error: any) {
      // Handle network and other errors
      this.options.logError(`Error validating URL ${url}:`, error);
      result.error = error.message;
    }
    
    return result;
  }
  
  /**
   * Check if a URL is a relative URL (starting with a /)
   * 
   * @param url The URL to check
   * @returns true if relative, false otherwise
   */
  isRelativeURL(url: string): boolean {
    if (!url) return false;
    return this.options.isRelativeUrlPattern.test(url);
  }
  
  /**
   * Check if a URL is an absolute URL (starting with http:// or https://)
   * 
   * @param url The URL to check
   * @returns true if absolute, false otherwise
   */
  isAbsoluteURL(url: string): boolean {
    if (!url) return false;
    return /^https?:\/\//.test(url);
  }
  
  /**
   * If URL is relative, convert it to absolute using the base URL
   * Otherwise, return the URL unchanged
   * 
   * @param url The URL to normalize
   * @param baseUrl The base URL to use for relative URLs
   * @returns The normalized URL
   */
  normalizePotentialRelativeURL(url: string, baseUrl: string): string {
    if (!url) return url;
    
    // Check if it's a relative URL
    if (this.isRelativeURL(url)) {
      // Remove trailing slash from baseUrl if present
      const cleanBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${cleanBaseUrl}${url}`;
    }
    
    return url;
  }
}