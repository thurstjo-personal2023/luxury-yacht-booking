/**
 * URL Validator Module
 * 
 * This module provides functionality for validating URLs and checking their content types.
 * It supports validation of both absolute and relative URLs, and detection of media types.
 */

import fetch from 'node-fetch';
import * as path from 'path';

/**
 * Media type constants
 */
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  UNKNOWN: 'unknown'
};

/**
 * URL validation response interface
 */
export interface URLValidationResult {
  url: string;
  isValid: boolean;
  isAbsolute: boolean;
  mediaType: string;
  error?: string;
  statusCode?: number;
  statusText?: string;
  contentType?: string;
}

/**
 * Validation options
 */
export interface ValidationOptions {
  validateContent?: boolean;
  expectedType?: string;
  timeout?: number;
  headers?: Record<string, string>;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: ValidationOptions = {
  validateContent: true,
  timeout: 10000,
  headers: {
    'User-Agent': 'EtoileYachts-MediaValidator/1.0'
  }
};

/**
 * Validates if a string is a valid URL
 */
export function isValidURL(url: string): boolean {
  // Check for null or empty URLs
  if (!url || url.trim() === '') {
    return false;
  }
  
  // Handle relative URLs (starting with /)
  if (url.startsWith('/')) {
    // Basic check for relative URLs - must not have invalid characters
    return !/[\s<>"]/.test(url);
  }
  
  // Check if URL is valid using URL constructor
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Checks if a URL is absolute (has protocol and domain)
 */
export function isAbsoluteURL(url: string): boolean {
  if (!url) return false;
  
  // URL is absolute if it starts with http:// or https://
  return /^https?:\/\//i.test(url);
}

/**
 * Determine media type based on URL extension or content type
 */
export function getMediaTypeFromURL(url: string, contentType?: string): string {
  // If content type is available, use it to determine media type
  if (contentType) {
    if (contentType.startsWith('image/')) {
      return MEDIA_TYPES.IMAGE;
    } else if (contentType.startsWith('video/')) {
      return MEDIA_TYPES.VIDEO;
    }
  }
  
  // Otherwise, try to determine from file extension
  const extension = path.extname(url).toLowerCase();
  
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'];
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.wmv', '.m4v', '.mpg', '.mpeg'];
  
  if (imageExtensions.includes(extension)) {
    return MEDIA_TYPES.IMAGE;
  } else if (videoExtensions.includes(extension)) {
    return MEDIA_TYPES.VIDEO;
  }
  
  return MEDIA_TYPES.UNKNOWN;
}

/**
 * Validate if a URL points to a valid resource with expected media type
 */
export async function validateURL(
  url: string, 
  options: ValidationOptions = DEFAULT_OPTIONS
): Promise<URLValidationResult> {
  const result: URLValidationResult = {
    url,
    isValid: false,
    isAbsolute: isAbsoluteURL(url),
    mediaType: MEDIA_TYPES.UNKNOWN
  };
  
  // Combine default options with provided options
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  
  // Check if URL is formally valid
  if (!isValidURL(url)) {
    result.error = 'Invalid URL format';
    return result;
  }
  
  // For relative URLs, we can't validate content
  if (!result.isAbsolute) {
    result.error = 'Relative URL cannot be validated for content';
    return result;
  }
  
  // For blob URLs, mark as invalid
  if (url.startsWith('blob:')) {
    result.error = 'Blob URLs are not persistent and cannot be validated';
    return result;
  }
  
  // Skip content validation if not requested
  if (!mergedOptions.validateContent) {
    result.isValid = true;
    result.mediaType = getMediaTypeFromURL(url);
    return result;
  }
  
  // Make HEAD request to validate URL
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), mergedOptions.timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      headers: mergedOptions.headers || {},
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    result.statusCode = response.status;
    result.statusText = response.statusText;
    
    // Check if status is in 200-299 range
    result.isValid = response.status >= 200 && response.status < 300;
    
    if (!result.isValid) {
      result.error = `Request failed with status: ${response.status} ${response.statusText}`;
      return result;
    }
    
    // Get content type
    const contentType = response.headers.get('content-type');
    result.contentType = contentType || undefined;
    
    // Determine media type
    result.mediaType = getMediaTypeFromURL(url, contentType || undefined);
    
    // If expected type is provided, validate against it
    if (mergedOptions.expectedType && result.mediaType !== mergedOptions.expectedType) {
      result.isValid = false;
      result.error = `Expected ${mergedOptions.expectedType}, got ${result.mediaType}`;
    }
    
    return result;
  } catch (error) {
    result.isValid = false;
    result.error = error instanceof Error ? error.message : String(error);
    
    if (error.name === 'AbortError') {
      result.error = `Request timed out after ${mergedOptions.timeout}ms`;
    }
    
    return result;
  }
}

/**
 * Convert a relative URL to an absolute URL using a base URL
 */
export function convertRelativeToAbsoluteURL(relativeURL: string, baseURL: string): string {
  // If already absolute, return as is
  if (isAbsoluteURL(relativeURL)) {
    return relativeURL;
  }
  
  // Ensure baseURL ends with /
  const normalizedBase = baseURL.endsWith('/') ? baseURL : `${baseURL}/`;
  
  // Remove leading / from relativeURL if present
  const normalizedRelative = relativeURL.startsWith('/') ? relativeURL.substring(1) : relativeURL;
  
  return `${normalizedBase}${normalizedRelative}`;
}

/**
 * Replace a relative URL with an absolute URL or placeholder
 */
export function fixRelativeURL(
  relativeURL: string, 
  baseURL: string, 
  placeholder?: string
): string {
  // If already absolute, return as is
  if (isAbsoluteURL(relativeURL)) {
    return relativeURL;
  }
  
  // If placeholder is provided and URL doesn't look like a valid path, use placeholder
  if (placeholder && !relativeURL.startsWith('/')) {
    return placeholder;
  }
  
  return convertRelativeToAbsoluteURL(relativeURL, baseURL);
}

/**
 * Get media type from content type header
 */
export function getMediaTypeFromContentType(contentType: string): string {
  if (!contentType) return MEDIA_TYPES.UNKNOWN;
  
  if (contentType.startsWith('image/')) {
    return MEDIA_TYPES.IMAGE;
  }
  
  if (contentType.startsWith('video/')) {
    return MEDIA_TYPES.VIDEO;
  }
  
  return MEDIA_TYPES.UNKNOWN;
}

/**
 * Batch validate an array of URLs
 */
export async function batchValidateURLs(
  urls: string[],
  options: ValidationOptions = DEFAULT_OPTIONS
): Promise<URLValidationResult[]> {
  const results: URLValidationResult[] = [];
  
  // Process URLs in batches to avoid overwhelming network
  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const batchPromises = batch.map(url => validateURL(url, options));
    
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }
  
  return results;
}