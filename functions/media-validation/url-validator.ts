/**
 * URL Validator
 * 
 * This module handles URL validation, specifically for image URLs.
 * It checks if URLs are valid, properly formatted, and points to actual images.
 */
import axios, { AxiosRequestConfig } from 'axios';

export interface ValidationOptions {
  timeout?: number;
  userAgent?: string;
  acceptImageMimeTypes?: string[];
}

export interface ValidationResult {
  url: string;
  isValid: boolean;
  status?: number;
  contentType?: string;
  error?: string;
  responseData?: string;
}

export interface URLValidatorConfig {
  logError: (message: string, error?: any) => void;
  logInfo: (message: string) => void;
  isRelativeUrlPattern?: RegExp;
}

export class URLValidator {
  private readonly DEFAULT_TIMEOUT = 10000; // 10 seconds
  private readonly DEFAULT_USER_AGENT = 'EtoileYachts/MediaValidator';
  private readonly DEFAULT_ACCEPT_IMAGE_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml'
  ];
  
  private readonly isRelativeUrlPattern: RegExp;
  
  constructor(private config: URLValidatorConfig) {
    this.isRelativeUrlPattern = config.isRelativeUrlPattern || /^\/[^\/].*/;
  }
  
  /**
   * Validate a URL by making a request to it
   */
  async validateURL(url: string, options: ValidationOptions = {}): Promise<ValidationResult> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      userAgent = this.DEFAULT_USER_AGENT,
      acceptImageMimeTypes = this.DEFAULT_ACCEPT_IMAGE_MIME_TYPES
    } = options;
    
    // Check for empty or invalid URL formats
    if (!url || url.trim() === '') {
      return {
        url,
        isValid: false,
        error: 'Empty URL'
      };
    }
    
    try {
      // Configure axios request
      const requestConfig: AxiosRequestConfig = {
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': userAgent,
          'Accept': 'image/*'
        },
        validateStatus: () => true, // Don't throw on any status code
        timeout
      };
      
      // Make the request
      const response = await axios.get(url, requestConfig);
      
      // Get content type from headers
      const contentType = response.headers['content-type'];
      
      // Check for error status codes
      if (response.status >= 400) {
        return {
          url,
          isValid: false,
          status: response.status,
          error: response.statusText || `HTTP Error ${response.status}`
        };
      }
      
      // Check if we received an image
      const isImage = contentType && acceptImageMimeTypes.some(mime => contentType.includes(mime));
      
      if (!isImage) {
        return {
          url,
          isValid: false,
          status: response.status,
          contentType,
          error: contentType 
            ? `Expected image, got ${contentType}` 
            : 'Unknown content type'
        };
      }
      
      // URL is valid and points to an image
      return {
        url,
        isValid: true,
        status: response.status,
        contentType
      };
    } catch (error) {
      // Handle errors (network, timeout, etc.)
      this.config.logError(`Failed to validate URL: ${url}`, error);
      
      return {
        url,
        isValid: false,
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Check if a URL is relative (starts with a single slash)
   */
  isRelativeURL(url: string): boolean {
    return this.isRelativeUrlPattern.test(url);
  }
  
  /**
   * Check if a URL is absolute (includes protocol)
   */
  isAbsoluteURL(url: string): boolean {
    try {
      // Attempt to create a URL object - this will throw if not a valid absolute URL
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Convert a relative URL to an absolute URL if needed
   */
  normalizePotentialRelativeURL(url: string, baseUrl: string): string {
    if (this.isRelativeURL(url)) {
      // Ensure baseUrl doesn't end with a slash
      const normalizedBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
      return `${normalizedBase}${url}`;
    }
    return url;
  }
}