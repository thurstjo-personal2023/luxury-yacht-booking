/**
 * URL Validator Module
 * 
 * This module provides utilities for validating URLs and checking their content types.
 */

import fetch from 'node-fetch';

/**
 * Validation result object
 */
export interface ValidationResult {
  isValid: boolean;
  url: string;
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
}

/**
 * Validates a URL by checking if it's properly formatted and accessible
 * 
 * @param url The URL to validate
 * @returns A promise that resolves to a ValidationResult
 */
export async function validateUrl(url: string): Promise<ValidationResult> {
  try {
    // Check if URL is properly formatted
    if (!isValidUrlFormat(url)) {
      return {
        isValid: false,
        url,
        error: 'Invalid URL format'
      };
    }

    // Skip relative URLs
    if (url.startsWith('/')) {
      return {
        isValid: false,
        url,
        error: 'Invalid URL'
      };
    }

    // Check if the URL is accessible
    const result = await fetchUrl(url);
    return result;
  } catch (error) {
    return {
      isValid: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates that a URL's content is an image
 * 
 * @param url The URL to validate
 * @returns A promise that resolves to a ValidationResult
 */
export async function validateImageUrl(url: string): Promise<ValidationResult> {
  try {
    const result = await validateUrl(url);
    
    if (!result.isValid) {
      return result;
    }
    
    // Check if content type is an image
    if (result.contentType && !result.contentType.startsWith('image/')) {
      return {
        isValid: false,
        url,
        status: result.status,
        statusText: result.statusText,
        contentType: result.contentType,
        error: `Expected image, got ${result.contentType}`
      };
    }
    
    return result;
  } catch (error) {
    return {
      isValid: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Validates that a URL's content is a video
 * 
 * @param url The URL to validate
 * @returns A promise that resolves to a ValidationResult
 */
export async function validateVideoUrl(url: string): Promise<ValidationResult> {
  try {
    const result = await validateUrl(url);
    
    if (!result.isValid) {
      return result;
    }
    
    // Check if content type is a video
    if (result.contentType && !result.contentType.startsWith('video/')) {
      return {
        isValid: false,
        url,
        status: result.status,
        statusText: result.statusText,
        contentType: result.contentType,
        error: `Expected video, got ${result.contentType}`
      };
    }
    
    return result;
  } catch (error) {
    return {
      isValid: false,
      url,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Checks if a URL has a valid format
 * 
 * @param url The URL to check
 * @returns True if the URL has a valid format, false otherwise
 */
export function isValidUrlFormat(url: string): boolean {
  try {
    // Check if it's a relative URL (which we consider invalid for external resources)
    if (url.startsWith('/')) {
      return false;
    }
    
    // Create URL object to validate format
    new URL(url);
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Fetches a URL and returns information about the response
 * 
 * @param url The URL to fetch
 * @returns A promise that resolves to a ValidationResult
 */
async function fetchUrl(url: string): Promise<ValidationResult> {
  try {
    // Attempt to fetch URL with HEAD request first (to avoid downloading full content)
    const headResponse = await fetch(url, { method: 'HEAD' });
    
    const result: ValidationResult = {
      isValid: headResponse.ok,
      url,
      status: headResponse.status,
      statusText: headResponse.statusText,
      contentType: headResponse.headers.get('content-type') || undefined
    };
    
    if (!headResponse.ok) {
      result.error = `HTTP error: ${headResponse.status} ${headResponse.statusText}`;
    }
    
    return result;
  } catch (error) {
    // If HEAD request fails, try a GET request with no-store cache
    try {
      const getResponse = await fetch(url, { 
        method: 'GET',
        headers: { 'Cache-Control': 'no-store' }
      });
      
      const result: ValidationResult = {
        isValid: getResponse.ok,
        url,
        status: getResponse.status,
        statusText: getResponse.statusText,
        contentType: getResponse.headers.get('content-type') || undefined
      };
      
      if (!getResponse.ok) {
        result.error = `HTTP error: ${getResponse.status} ${getResponse.statusText}`;
      }
      
      return result;
    } catch (getError) {
      return {
        isValid: false,
        url,
        error: getError instanceof Error ? getError.message : 'Request failed'
      };
    }
  }
}

/**
 * Replaces invalid URL with a placeholder
 * 
 * @param url The original URL
 * @param mediaType The media type ('image' or 'video')
 * @returns A placeholder URL
 */
export function getPlaceholderUrl(url: string, mediaType: 'image' | 'video'): string {
  // Return appropriate placeholder based on media type
  if (mediaType === 'image') {
    return '/yacht-placeholder.jpg';
  } else {
    return '/yacht-video-placeholder.mp4';
  }
}