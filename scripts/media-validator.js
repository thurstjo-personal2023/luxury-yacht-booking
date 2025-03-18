/**
 * Media Validator Module
 * 
 * This module provides functions to validate media URLs (images and videos)
 * and ensure they have the correct content type.
 */

import { validateUrl, validateUrls, isRelativeUrl, resolveRelativeUrl } from './url-validator.js';

// Content type prefixes for different media types
const CONTENT_TYPES = {
  image: ['image/'],
  video: ['video/', 'application/x-mpegURL', 'application/vnd.apple.mpegurl'],
  audio: ['audio/'],
  document: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument']
};

/**
 * Validate a media URL to ensure it has the correct content type
 * 
 * @param {string} url The URL to validate
 * @param {string} expectedType The expected media type ('image', 'video', etc.)
 * @returns {Promise<Object>} Validation result with status, valid flag, and details
 */
export async function validateMediaUrl(url, expectedType = 'image') {
  // Get allowed content types for the expected media type
  const allowedContentTypes = CONTENT_TYPES[expectedType] || [];
  
  // Validate the URL with content type checking
  const result = await validateUrl(url, {
    resolveRelative: true,
    allowedContentTypes
  });
  
  // Add expected type to the result
  return {
    ...result,
    expectedType
  };
}

/**
 * Validate multiple media URLs in parallel
 * 
 * @param {Array<Object>} mediaUrls Array of URL objects with value and expectedType
 * @returns {Promise<Array<Object>>} Array of validation results
 */
export async function validateMediaUrls(mediaUrls) {
  if (!Array.isArray(mediaUrls)) {
    return [];
  }
  
  // Validate each media URL with its expected type
  const validationPromises = mediaUrls.map(({ value, type, path }) => 
    validateMediaUrl(value, type).then(result => ({
      ...result,
      path, // Include the document path for the URL
    }))
  );
  
  return Promise.all(validationPromises);
}

/**
 * Extract and validate media URLs from a Firestore document
 * 
 * @param {Object} doc The Firestore document
 * @param {Object} options Configuration options
 * @param {Object} options.imageFields Fields that should contain image URLs
 * @param {Object} options.videoFields Fields that should contain video URLs
 * @returns {Promise<Object>} Validation results with valid and invalid URLs
 */
export async function validateDocumentMedia(doc, options = {}) {
  const {
    imageFields = [
      'imageUrl', 
      'coverImage', 
      'thumbnail',
      'profilePhoto', 
      'media.[].url' // Special notation for array items
    ],
    videoFields = [
      'videoUrl',
      'promoVideo'
    ]
  } = options;
  
  // Process field patterns into explicit paths
  // For example, 'media.[].url' becomes ['media.0.url', 'media.1.url', ...] based on the document
  const expandedImageFields = expandFieldPatterns(doc.data(), imageFields, 'image');
  const expandedVideoFields = expandFieldPatterns(doc.data(), videoFields, 'video');
  
  // Combine all fields
  const allFields = [...expandedImageFields, ...expandedVideoFields];
  
  // Extract URLs from the document
  const mediaUrls = extractMediaUrls(doc.data(), allFields);
  
  // Validate all media URLs
  const results = await validateMediaUrls(mediaUrls);
  
  // Separate valid and invalid results
  const valid = results.filter(result => result.valid);
  const invalid = results.filter(result => !result.valid);
  
  return {
    docId: doc.id,
    valid,
    invalid,
    totalUrls: results.length,
    validCount: valid.length,
    invalidCount: invalid.length
  };
}

/**
 * Expand field patterns that include array wildcards
 * 
 * @param {Object} data The document data
 * @param {Array<string>} fieldPatterns Array of field patterns
 * @param {string} mediaType The media type for these fields
 * @returns {Array<Object>} Expanded field paths with type
 */
function expandFieldPatterns(data, fieldPatterns, mediaType) {
  const expandedFields = [];
  
  fieldPatterns.forEach(pattern => {
    if (pattern.includes('[]')) {
      // This is an array pattern, expand it
      const [arrayPath, fieldName] = pattern.split('[].');
      
      if (data[arrayPath] && Array.isArray(data[arrayPath])) {
        // Add a field for each array item
        data[arrayPath].forEach((_, index) => {
          expandedFields.push({
            path: `${arrayPath}.[${index}].${fieldName}`,
            type: mediaType
          });
        });
      }
    } else {
      // Regular field, add as is
      expandedFields.push({
        path: pattern,
        type: mediaType
      });
    }
  });
  
  return expandedFields;
}

/**
 * Extract media URLs from document data based on field paths
 * 
 * @param {Object} data The document data
 * @param {Array<Object>} fields Array of field path objects
 * @returns {Array<Object>} Array of media URL objects
 */
function extractMediaUrls(data, fields) {
  const mediaUrls = [];
  
  fields.forEach(({ path, type }) => {
    // Handle simple paths like 'imageUrl'
    if (!path.includes('.') && !path.includes('[')) {
      if (data[path]) {
        mediaUrls.push({
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
      mediaUrls.push({
        path,
        value: current[lastSegment],
        type
      });
    }
  });
  
  return mediaUrls;
}