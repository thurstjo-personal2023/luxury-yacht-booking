/**
 * URL Validator Module
 * 
 * This module provides functions to validate and normalize URLs,
 * with special handling for relative URLs.
 */

// Base URL for the application (used to resolve relative URLs)
const BASE_URL = process.env.BASE_URL || 'https://etoile-yachts.replit.app';

/**
 * Check if a URL is relative (starts with /)
 * 
 * @param {string} url The URL to check
 * @returns {boolean} True if the URL is relative, false otherwise
 */
export function isRelativeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Convert a relative URL to an absolute URL
 * 
 * @param {string} url The relative URL to convert
 * @returns {string} The absolute URL
 */
export function resolveRelativeUrl(url) {
  if (!isRelativeUrl(url)) return url;
  
  // Remove trailing slash from base URL if present
  const baseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
  
  // Add base URL to the relative URL
  return `${baseUrl}${url}`;
}

/**
 * Check if a URL is valid (can be fetched)
 * 
 * @param {string} url The URL to validate
 * @param {Object} options Optional validation options
 * @param {boolean} options.resolveRelative Whether to resolve relative URLs (default: true)
 * @param {Array<string>} options.allowedContentTypes Content types to consider valid (default: all)
 * @returns {Promise<Object>} Validation result with status, valid flag, and details
 */
export async function validateUrl(url, options = {}) {
  const {
    resolveRelative = true,
    allowedContentTypes = []
  } = options;
  
  // Skip validation for empty URLs
  if (!url) {
    return {
      valid: false,
      status: null,
      error: 'URL is empty',
      url
    };
  }
  
  try {
    // Handle relative URLs if enabled
    const resolvedUrl = resolveRelative && isRelativeUrl(url) ? resolveRelativeUrl(url) : url;
    
    // Check if URL is valid by attempting to fetch it
    const response = await fetch(resolvedUrl, { method: 'HEAD' });
    
    // Get content type from response
    const contentType = response.headers.get('content-type') || '';
    
    // If allowed content types are specified, check if the content type is allowed
    const contentTypeValid = allowedContentTypes.length === 0 || 
      allowedContentTypes.some(type => contentType.includes(type));
    
    // URL is valid if the response is ok and content type is valid
    const valid = response.ok && contentTypeValid;
    
    return {
      valid,
      status: `${response.status} ${response.statusText}`,
      contentType,
      url: resolvedUrl,
      originalUrl: url,
      contentTypeValid,
      error: !valid 
        ? (contentTypeValid ? `HTTP error: ${response.status}` : `Invalid content type: ${contentType}`)
        : null
    };
  } catch (error) {
    return {
      valid: false,
      status: null,
      error: `Request failed: ${error.message}`,
      url,
      originalUrl: url
    };
  }
}

/**
 * Validate multiple URLs in parallel
 * 
 * @param {Array<string>} urls The URLs to validate
 * @param {Object} options Optional validation options
 * @returns {Promise<Array<Object>>} Array of validation results
 */
export async function validateUrls(urls, options = {}) {
  if (!Array.isArray(urls)) {
    return [];
  }
  
  // Filter out duplicates and empty URLs
  const uniqueUrls = [...new Set(urls.filter(url => url))];
  
  // Validate all URLs in parallel
  const validationPromises = uniqueUrls.map(url => validateUrl(url, options));
  return Promise.all(validationPromises);
}

/**
 * Extract URLs from a Firestore document based on field paths
 * 
 * @param {Object} doc The Firestore document
 * @param {Array<Object>} fieldPaths Paths to URL fields in the document
 * @param {string} fieldPaths[].path Path to the field containing URL
 * @param {string} fieldPaths[].type Expected content type ('image' or 'video')
 * @returns {Array<Object>} Array of extracted URL objects with path, value, and type
 */
export function extractUrlsFromDocument(doc, fieldPaths) {
  if (!doc || !doc.data || typeof doc.data !== 'function') {
    return [];
  }
  
  const data = doc.data();
  const urls = [];
  
  fieldPaths.forEach(({ path, type }) => {
    // Handle simple paths like 'imageUrl'
    if (!path.includes('.') && !path.includes('[')) {
      if (data[path]) {
        urls.push({
          path,
          value: data[path],
          type
        });
      }
      return;
    }
    
    // Handle paths with dots and array indices
    // e.g., 'media.[0].url', 'profile.avatar'
    const segments = path
      .replace(/\[(\d+)\]/g, '.$1') // Convert [0] to .0
      .split('.');
    
    let current = data;
    
    // Navigate to the value using the path segments
    for (let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i];
      
      if (current[segment] === undefined || current[segment] === null) {
        // Path not found in document
        return;
      }
      
      current = current[segment];
    }
    
    const lastSegment = segments[segments.length - 1];
    
    // Handle the final segment (the actual URL value)
    if (current[lastSegment] !== undefined && current[lastSegment] !== null) {
      urls.push({
        path,
        value: current[lastSegment],
        type
      });
    }
  });
  
  return urls;
}