/**
 * Media Type Detector
 * 
 * This module provides functionality to detect and validate media types
 * for files and URLs to ensure proper categorization as images or videos.
 */

const { MediaType, VideoFileExtensions, VideoUrlPatterns } = require('./media-type.cjs');

// Common image extensions and patterns
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff', '.ico'];
const IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/bmp', 'image/webp', 'image/svg+xml', 'image/tiff', 'image/x-icon'];

// Common video extensions and patterns - use the shared constants
const VIDEO_EXTENSIONS = VideoFileExtensions;
const VIDEO_MIME_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-ms-wmv', 'video/x-flv', 'video/x-matroska'];

// Use the shared video URL patterns to ensure consistency
const VIDEO_URL_PATTERNS = [
  ...VideoUrlPatterns,
  // Add any additional patterns specific to this detector
  'video/',
  'videos/',
  'media/video',
  'in-the-boka-bay',    // Common description in marina videos
  'vacation-holidays',  // Travel content indicator
  'night-town-tivat',
  'sailing-boats-in-the-boka-bay'
];

/**
 * Media Type Detector
 */
class MediaTypeDetector {
  /**
   * Detect the media type based on file extension, MIME type, or URL patterns
   * 
   * @param {Object} options - Detection options
   * @param {string} [options.url] - The URL of the media
   * @param {string} [options.fileName] - The filename of the media
   * @param {string} [options.mimeType] - The MIME type of the media
   * @param {string} [options.contentType] - Alternative to mimeType (for compatibility)
   * @returns {string} - The detected media type (MediaType.IMAGE or MediaType.VIDEO)
   */
  detectMediaType(options = {}) {
    const { url, fileName, mimeType, contentType } = options;
    const mime = mimeType || contentType;
    
    // First check MIME type as it's the most reliable
    if (mime) {
      if (IMAGE_MIME_TYPES.some(type => mime.toLowerCase().includes(type.toLowerCase()))) {
        return MediaType.IMAGE;
      }
      
      if (VIDEO_MIME_TYPES.some(type => mime.toLowerCase().includes(type.toLowerCase()))) {
        return MediaType.VIDEO;
      }
    }
    
    // Then check file name extension
    if (fileName) {
      const lowerFileName = fileName.toLowerCase();
      
      if (IMAGE_EXTENSIONS.some(ext => lowerFileName.endsWith(ext))) {
        return MediaType.IMAGE;
      }
      
      if (VIDEO_EXTENSIONS.some(ext => lowerFileName.endsWith(ext))) {
        return MediaType.VIDEO;
      }
    }
    
    // Finally, check URL patterns
    if (url) {
      const lowerUrl = url.toLowerCase();
      
      // Check for explicit extensions in URL
      if (IMAGE_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
        return MediaType.IMAGE;
      }
      
      if (VIDEO_EXTENSIONS.some(ext => lowerUrl.endsWith(ext))) {
        return MediaType.VIDEO;
      }
      
      // Check for video patterns in URL
      if (VIDEO_URL_PATTERNS.some(pattern => 
          lowerUrl.includes(pattern.toLowerCase()))) {
        return MediaType.VIDEO;
      }
      
      // Default to image if the URL contains 'image' but not 'video'
      if (lowerUrl.includes('image') && !lowerUrl.includes('video')) {
        return MediaType.IMAGE;
      }
    }
    
    // Default to image as the most common type
    return MediaType.IMAGE;
  }
  
  /**
   * Check if the content type matches the expected media type
   * 
   * @param {string} contentType - The content type of the media
   * @param {string} expectedMediaType - The expected media type
   * @param {Object} options - Additional validation options
   * @param {string} [options.url] - The URL of the media (for additional context)
   * @param {boolean} [options.allowVideoInImageFields=true] - Whether to allow videos in image fields (for backward compatibility)
   * @returns {boolean} - Whether the content type matches the expected media type
   */
  isValidContentTypeForMediaType(contentType, expectedMediaType, options = {}) {
    if (!contentType || !expectedMediaType) {
      return false;
    }
    
    const { url, allowVideoInImageFields = true } = options;
    const lowerContentType = contentType.toLowerCase();
    
    // Handle image validation
    if (expectedMediaType === MediaType.IMAGE) {
      // Check if it's a valid image content type
      const isImageContent = IMAGE_MIME_TYPES.some(
        type => lowerContentType.includes(type.toLowerCase())
      );
      
      // If it matches image content, all good
      if (isImageContent) {
        return true;
      }
      
      // Special case: If we're allowing videos in image fields (legacy compatibility)
      // and the content is a video, consider it valid
      if (allowVideoInImageFields) {
        const isVideoContent = VIDEO_MIME_TYPES.some(
          type => lowerContentType.includes(type.toLowerCase())
        );
        
        if (isVideoContent) {
          console.log(`Allowing video content type in image field: ${lowerContentType} ${url ? `for ${url}` : ''}`);
          return true;
        }
        
        // Also check for mp4 content type which may be reported differently
        if (lowerContentType.includes('mp4') || lowerContentType.includes('video')) {
          console.log(`Allowing alternative video format in image field: ${lowerContentType} ${url ? `for ${url}` : ''}`);
          return true;
        }
      }
      
      // URL-based override for cases where the server returns wrong content type
      if (url) {
        // For some URLs, we know they're definitely videos
        const hasVideoExtension = VIDEO_EXTENSIONS.some(ext => 
          url.toLowerCase().endsWith(ext) || 
          url.toLowerCase().includes(`${ext}?`) || 
          url.toLowerCase().includes(`${ext}&`)
        );
        
        const hasVideoPattern = VIDEO_URL_PATTERNS.some(pattern => 
          url.toLowerCase().includes(pattern.toLowerCase())
        );
        
        // If URL suggests this is definitely a video
        if (hasVideoExtension || hasVideoPattern) {
          console.log(`URL pattern indicates a video in image field: ${url}`);
          return allowVideoInImageFields;
        }
      }
      
      return false;
    }
    
    // Handle video validation
    if (expectedMediaType === MediaType.VIDEO) {
      return VIDEO_MIME_TYPES.some(type => lowerContentType.includes(type.toLowerCase()));
    }
    
    return false;
  }
  
  /**
   * Extract media type information from a file object
   * 
   * @param {File|Object} file - The file object (browser File or similar)
   * @returns {Object} - Media type information
   */
  getMediaInfoFromFile(file) {
    if (!file) {
      return { mediaType: MediaType.IMAGE };
    }
    
    const fileName = file.name || '';
    const mimeType = file.type || '';
    
    const mediaType = this.detectMediaType({
      fileName,
      mimeType
    });
    
    return {
      mediaType,
      fileName,
      mimeType,
      size: file.size || 0
    };
  }
  
  /**
   * Update a document with media type information
   * 
   * @param {Object} document - The document to update
   * @param {Array<string>} mediaFields - Array of field paths to media URLs
   * @returns {Object} - Updated document with media type information
   */
  processDocumentMediaTypes(document, mediaFields = []) {
    if (!document || typeof document !== 'object') {
      return document;
    }
    
    // Create a deep copy of the document
    const processedDoc = JSON.parse(JSON.stringify(document));
    
    // Process each media field
    for (const fieldPath of mediaFields) {
      const value = this._getNestedValue(processedDoc, fieldPath);
      
      if (value && typeof value === 'string') {
        // For simple URL strings, detect type and add mediaType field
        const mediaType = this.detectMediaType({ url: value });
        const mediaTypePath = fieldPath.replace(/\.url$/, '') + '.mediaType';
        
        this._setNestedValue(processedDoc, mediaTypePath, mediaType);
      } else if (Array.isArray(value)) {
        // For any array fields (not just 'media'), process each item
        const updatedArray = value.map(item => {
          if (typeof item === 'string') {
            return {
              url: item,
              mediaType: this.detectMediaType({ url: item })
            };
          } else if (item && typeof item === 'object' && item.url) {
            // Create a copy to avoid modifying the original
            const itemCopy = { ...item };
            // Only add mediaType if it doesn't already exist
            if (!itemCopy.mediaType) {
              itemCopy.mediaType = this.detectMediaType({ 
                url: itemCopy.url, 
                mimeType: itemCopy.contentType || itemCopy.mimeType 
              });
            }
            return itemCopy;
          }
          return item;
        });
        
        this._setNestedValue(processedDoc, fieldPath, updatedArray);
      }
    }
    
    return processedDoc;
  }
  
  /**
   * Get a nested value from an object using a dot-notation path
   */
  _getNestedValue(obj, path) {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      // Handle array notation like 'media.[0].url'
      if (part.startsWith('[') && part.endsWith(']')) {
        const index = parseInt(part.substring(1, part.length - 1), 10);
        if (Array.isArray(current) && !isNaN(index) && index < current.length) {
          current = current[index];
        } else {
          return undefined;
        }
      } else if (current && typeof current === 'object') {
        current = current[part];
      } else {
        return undefined;
      }
    }
    
    return current;
  }
  
  /**
   * Set a nested value in an object using a dot-notation path
   */
  _setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array notation like 'media.[0].url'
      if (part.startsWith('[') && part.endsWith(']')) {
        const index = parseInt(part.substring(1, part.length - 1), 10);
        if (Array.isArray(current) && !isNaN(index)) {
          if (!current[index]) {
            current[index] = {};
          }
          current = current[index];
        }
      } else {
        if (!current[part]) {
          // Create nested object if it doesn't exist
          current[part] = parts[i + 1].startsWith('[') ? [] : {};
        }
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
      const index = parseInt(lastPart.substring(1, lastPart.length - 1), 10);
      if (Array.isArray(current) && !isNaN(index)) {
        // Check if we need to convert a primitive to an object
        if (current[index] !== null && typeof current[index] === 'object') {
          current[index] = value;
        } else {
          // If trying to set a property on a primitive, convert it to an object
          // with both the original value as 'url' and the new property
          const originalValue = current[index];
          if (originalValue && typeof originalValue === 'string' && path.endsWith('.mediaType')) {
            // Special case for mediaType on URLs - convert the string URL to an object
            current[index] = { url: originalValue, mediaType: value };
          } else {
            current[index] = value;
          }
        }
      }
    } else {
      // Check if we need to convert a primitive to an object
      if (current[lastPart] !== null && typeof current[lastPart] === 'string' && path.endsWith('.mediaType')) {
        // Special case for mediaType on URLs - convert the string URL to an object
        const originalValue = current[lastPart];
        current[lastPart] = { url: originalValue, mediaType: value };
      } else {
        current[lastPart] = value;
      }
    }
    
    return obj;
  }
}

module.exports = {
  MediaTypeDetector
};