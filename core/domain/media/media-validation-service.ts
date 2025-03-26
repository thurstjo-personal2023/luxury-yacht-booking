/**
 * Media Validation Service
 * 
 * Core service that validates media URLs in documents.
 * It handles all types of media validation and can be used by various front-end components.
 */

import { MediaType, getMediaTypeFromUrl, getMediaTypeFromMime, isMediaTypeMatch } from './media-type';
import { isPlaceholderUrl, getPlaceholderMediaType, formatPlaceholderUrl } from './placeholder-handler';

/**
 * Media validation result interface
 */
export interface MediaValidationResult {
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  contentLength?: number;
  expectedType: MediaType;
  actualType: MediaType;
  error?: string;
}

/**
 * Validate a media URL
 * 
 * This function will check if the URL is accessible and matches the expected media type.
 * It handles special cases like placeholders and blob URLs.
 * 
 * @param url The URL to validate
 * @param expectedType The expected media type (image, video, etc.)
 * @returns The validation result
 */
export async function validateMediaUrl(
  url: string, 
  expectedType: MediaType = MediaType.UNKNOWN
): Promise<MediaValidationResult> {
  // Initialize the result object
  const result: MediaValidationResult = {
    url,
    isValid: false,
    expectedType,
    actualType: MediaType.UNKNOWN
  };
  
  // Handle empty or invalid URLs
  if (!url || typeof url !== 'string') {
    result.error = 'Empty or invalid URL';
    return result;
  }
  
  // Handle placeholder URLs - also fix any production URLs to use development URLs
  if (isPlaceholderUrl(url)) {
    // Format the URL to ensure it's using the correct development URL
    const formattedUrl = formatPlaceholderUrl(url);
    
    // If the URL was changed, log it and update the result URL
    if (formattedUrl !== url) {
      console.log(`Fixing placeholder URL: ${url} → ${formattedUrl}`);
      result.url = formattedUrl;
    }
    
    result.isValid = true;
    result.actualType = getPlaceholderMediaType(formattedUrl);
    result.contentType = result.actualType === MediaType.VIDEO ? 'video/mp4' : 'image/jpeg';
    result.status = 200;
    result.statusText = 'OK';
    return result;
  }
  
  // Handle blob URLs
  if (url.startsWith('blob:')) {
    result.error = 'Blob URLs are temporary and not accessible from server';
    return result;
  }
  
  // Try to determine media type from URL if not provided
  if (expectedType === MediaType.UNKNOWN) {
    expectedType = getMediaTypeFromUrl(url);
    result.expectedType = expectedType;
  }
  
  // Handle URL detection for video files that might be in image fields
  const detectedType = getMediaTypeFromUrl(url);
  
  // Auto-validate videos that are clearly videos based on URL patterns
  if (detectedType === MediaType.VIDEO && 
      (url.includes('.mp4') || url.includes('-SBV-') || url.includes('preview.mp4'))) {
    result.isValid = true;
    result.actualType = MediaType.VIDEO;
    result.contentType = 'video/mp4';
    return result;
  }
  
  // For all other URLs, make a HEAD request
  try {
    // Process relative URLs
    let resolvedUrl = url;
    if (url.startsWith('/') && !url.startsWith('//')) {
      // Use the Replit URL for development
      const BASE_URL = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';
      resolvedUrl = `${BASE_URL}${url}`;
      console.log(`Resolving relative URL: ${url} → ${resolvedUrl}`);
    }
    
    // Make the request
    const response = await fetch(resolvedUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Set content info
      result.status = response.status;
      result.statusText = response.statusText;
      result.contentType = contentType;
      result.contentLength = contentLength;
      
      // Determine actual media type from content-type
      result.actualType = getMediaTypeFromMime(contentType);
      
      // Handle special case for videos in image fields
      if (expectedType === MediaType.IMAGE && result.actualType === MediaType.VIDEO) {
        // Many videos are stored in image fields due to legacy data
        console.log(`Allowing video in image field: ${url}`);
        result.isValid = true;
        return result;
      }
      
      // Check if the actual type matches the expected type
      result.isValid = isMediaTypeMatch(result.actualType, result.expectedType);
      
      if (!result.isValid) {
        result.error = `Expected ${result.expectedType}, got ${result.actualType}`;
      }
    } else {
      result.status = response.status;
      result.statusText = response.statusText;
      result.error = `HTTP error: ${response.status} ${response.statusText}`;
    }
  } catch (error: any) {
    result.error = `Request failed: ${error.message}`;
  }
  
  return result;
}

/**
 * Validate multiple media URLs in bulk
 * 
 * @param urls Array of URLs to validate with expected types
 * @returns Array of validation results
 */
export async function validateMediaUrls(
  urls: Array<{ url: string; expectedType?: MediaType }>
): Promise<MediaValidationResult[]> {
  const results: MediaValidationResult[] = [];
  
  // Validate each URL sequentially to avoid overwhelming the server
  for (const { url, expectedType = MediaType.UNKNOWN } of urls) {
    const result = await validateMediaUrl(url, expectedType);
    results.push(result);
  }
  
  return results;
}