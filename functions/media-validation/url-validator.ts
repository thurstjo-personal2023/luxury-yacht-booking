/**
 * URL Validator Module
 * 
 * This module provides utilities to validate URLs and check if they are accessible.
 * It can detect issues with:
 * - Invalid URLs
 * - Missing resources (404)
 * - Server errors
 * - Media type mismatches (e.g., video content in image fields)
 */

import fetch from 'node-fetch';

/**
 * Validation result interface
 */
export interface ValidationResult {
  isValid: boolean;
  url: string;
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
  reason?: string;
}

/**
 * URL validator configuration
 */
export interface UrlValidatorConfig {
  timeout?: number;
  maxRedirects?: number;
  userAgent?: string;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: UrlValidatorConfig = {
  timeout: 5000,
  maxRedirects: 5,
  userAgent: 'Etoile-Yachts-Media-Validator/1.0'
};

/**
 * Validate a URL by sending a HEAD request
 * 
 * @param url URL to validate
 * @param config Validator configuration (optional)
 * @returns Validation result
 */
export async function validateUrl(url: string, config: UrlValidatorConfig = DEFAULT_CONFIG): Promise<ValidationResult> {
  try {
    // Check for relative URLs or blob URLs
    if (url.startsWith('/') || url.startsWith('blob:')) {
      return {
        isValid: false,
        url,
        error: 'Invalid URL'
      };
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return {
        isValid: false,
        url,
        error: 'Invalid URL format'
      };
    }

    // Send HEAD request to check if URL is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': config.userAgent || DEFAULT_CONFIG.userAgent as string
      },
      redirect: 'follow',
      timeout: config.timeout || DEFAULT_CONFIG.timeout
    });

    // Get content type from response
    const contentType = response.headers.get('content-type') || '';

    // Return validation result
    if (response.ok) {
      return {
        isValid: true,
        url,
        status: response.status,
        statusText: response.statusText,
        contentType
      };
    } else {
      return {
        isValid: false,
        url,
        status: response.status,
        statusText: response.statusText,
        error: `HTTP error: ${response.status} ${response.statusText}`
      };
    }
  } catch (error) {
    // Handle network errors
    return {
      isValid: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validate an image URL
 * 
 * @param url URL to validate
 * @param config Validator configuration (optional)
 * @returns Validation result
 */
export async function validateImageUrl(url: string, config: UrlValidatorConfig = DEFAULT_CONFIG): Promise<ValidationResult> {
  // First validate the URL itself
  const result = await validateUrl(url, config);
  
  // If URL is already invalid, return the result
  if (!result.isValid) {
    return result;
  }
  
  // Check if content type indicates an image
  const contentType = result.contentType || '';
  const isImage = contentType.startsWith('image/');
  
  if (isImage) {
    return result;
  } else {
    // URL is valid but not an image
    return {
      ...result,
      isValid: false,
      error: `Expected image, got ${contentType}`,
      reason: 'Invalid content type'
    };
  }
}

/**
 * Validate a video URL
 * 
 * @param url URL to validate
 * @param config Validator configuration (optional)
 * @returns Validation result
 */
export async function validateVideoUrl(url: string, config: UrlValidatorConfig = DEFAULT_CONFIG): Promise<ValidationResult> {
  // First validate the URL itself
  const result = await validateUrl(url, config);
  
  // If URL is already invalid, return the result
  if (!result.isValid) {
    return result;
  }
  
  // Check if content type indicates a video
  const contentType = result.contentType || '';
  const isVideo = contentType.startsWith('video/');
  
  if (isVideo) {
    return result;
  } else {
    // URL is valid but not a video
    return {
      ...result,
      isValid: false,
      error: `Expected video, got ${contentType}`,
      reason: 'Invalid content type'
    };
  }
}

/**
 * Check if a URL points to an image
 * 
 * @param url URL to check
 * @returns True if URL likely points to an image
 */
export function isImageUrl(url: string): boolean {
  // Check if URL ends with a common image extension
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
  const lowercaseUrl = url.toLowerCase();
  
  return imageExtensions.some(ext => lowercaseUrl.endsWith(ext));
}

/**
 * Check if a URL points to a video
 * 
 * @param url URL to check
 * @returns True if URL likely points to a video
 */
export function isVideoUrl(url: string): boolean {
  // Check if URL ends with a common video extension
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.flv', '.mkv'];
  const lowercaseUrl = url.toLowerCase();
  
  return videoExtensions.some(ext => lowercaseUrl.endsWith(ext));
}

/**
 * Extract URLs from a document
 * 
 * @param document Document to extract URLs from
 * @param fieldNamePatterns Array of field name patterns to look for (case insensitive)
 * @returns Array of [fieldPath, url] tuples
 */
export function extractUrls(document: any, fieldNamePatterns: string[] = []): [string, string][] {
  const urls: [string, string][] = [];
  
  // Default patterns to look for if none provided
  const patterns = fieldNamePatterns.length > 0 
    ? fieldNamePatterns 
    : ['url', 'image', 'photo', 'media', 'thumbnail', 'avatar', 'cover', 'banner', 'logo', 'icon'];
  
  // Recursive function to extract URLs
  function extractUrlsFromObject(obj: any, path: string = '') {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'object') {
          extractUrlsFromObject(item, `${path}.[${index}]`);
        } else if (typeof item === 'string' && isUrl(item)) {
          urls.push([`${path}.[${index}]`, item]);
        }
      });
      return;
    }
    
    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      // If value is a string and looks like a URL
      if (typeof value === 'string' && isUrl(value)) {
        // Check if field name contains any of the patterns
        const fieldNameLower = key.toLowerCase();
        if (patterns.some(pattern => fieldNameLower.includes(pattern.toLowerCase()))) {
          urls.push([currentPath, value]);
        }
      } 
      // If value is an object with a type and url properties (common media pattern)
      else if (value && typeof value === 'object' && 
               'type' in value && 'url' in value && 
               typeof value.url === 'string' && isUrl(value.url)) {
        urls.push([`${currentPath}.url`, value.url]);
      }
      // Recursively process nested objects
      else if (value && typeof value === 'object') {
        extractUrlsFromObject(value, currentPath);
      }
    }
  }
  
  extractUrlsFromObject(document);
  return urls;
}

/**
 * Check if a string looks like a URL
 * 
 * @param str String to check
 * @returns True if string looks like a URL
 */
function isUrl(str: string): boolean {
  // Simple URL validation
  return (
    typeof str === 'string' &&
    (
      str.startsWith('http://') ||
      str.startsWith('https://') ||
      str.startsWith('/') ||
      str.startsWith('blob:')
    )
  );
}