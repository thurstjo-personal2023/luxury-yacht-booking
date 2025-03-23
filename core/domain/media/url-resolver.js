/**
 * URL Resolver Service
 * 
 * This service ensures all media URLs are absolute by resolving relative URLs
 * with the appropriate domain based on the current environment.
 */

const CONFIG = {
  // URL prefixes for different environments
  DEVELOPMENT: 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev',
  PRODUCTION: 'https://www.etoileyachts.com',
};

/**
 * URL Resolver Service
 */
class UrlResolverService {
  constructor(environment = process.env.NODE_ENV || 'development') {
    this.environment = environment.toLowerCase();
    this.baseUrl = this._getBaseUrl();
  }

  /**
   * Get the base URL for the current environment
   */
  _getBaseUrl() {
    return this.environment === 'production'
      ? CONFIG.PRODUCTION
      : CONFIG.DEVELOPMENT;
  }

  /**
   * Check if a URL is relative
   */
  isRelativeUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Check if the URL starts with a slash or is a relative path
    return url.startsWith('/') || 
           (!url.startsWith('http://') && !url.startsWith('https://'));
  }

  /**
   * Resolve a URL to ensure it's absolute
   */
  resolveUrl(url) {
    if (!url || typeof url !== 'string') return url;
    
    // Return the URL as is if it's already absolute
    if (!this.isRelativeUrl(url)) {
      return url;
    }
    
    // Ensure we have a single slash between base URL and path
    const baseUrl = this.baseUrl.endsWith('/') ? this.baseUrl.slice(0, -1) : this.baseUrl;
    const path = url.startsWith('/') ? url : `/${url}`;
    
    return `${baseUrl}${path}`;
  }

  /**
   * Process a document's media fields to ensure all URLs are absolute
   * 
   * @param {Object} document - The document containing media URLs
   * @param {Array<string>} mediaFields - Array of field paths to media URLs
   * @returns {Object} - A new document with resolved URLs
   */
  processDocument(document, mediaFields = []) {
    if (!document || typeof document !== 'object') {
      return document;
    }
    
    // If no specific media fields are provided, attempt to find common media fields
    if (!mediaFields || mediaFields.length === 0) {
      mediaFields = this._detectMediaFields(document);
    }
    
    // Create a deep copy of the document to avoid mutations
    const processedDoc = JSON.parse(JSON.stringify(document));
    
    // Process each media field
    for (const fieldPath of mediaFields) {
      const value = this._getNestedValue(processedDoc, fieldPath);
      
      if (value && typeof value === 'string') {
        this._setNestedValue(processedDoc, fieldPath, this.resolveUrl(value));
      } else if (Array.isArray(value)) {
        // Handle array of media URLs
        const updatedArray = value.map(item => {
          if (typeof item === 'string') {
            return this.resolveUrl(item);
          } else if (item && typeof item === 'object' && item.url) {
            return { ...item, url: this.resolveUrl(item.url) };
          }
          return item;
        });
        
        this._setNestedValue(processedDoc, fieldPath, updatedArray);
      }
    }
    
    return processedDoc;
  }
  
  /**
   * Detect common media fields in a document
   */
  _detectMediaFields(document) {
    const commonMediaFields = [
      'media',
      'images',
      'coverImage',
      'profileImage',
      'thumbnailUrl',
      'imageUrl',
      'videoUrl',
      'mediaUrl',
      'bannerImage'
    ];
    
    const fields = [];
    
    // Check for common media field patterns
    for (const [key, value] of Object.entries(document)) {
      // Check for direct URL fields
      if ((key.toLowerCase().includes('url') || 
           key.toLowerCase().includes('image') || 
           key.toLowerCase().includes('media') ||
           key.toLowerCase().includes('video')) && 
          typeof value === 'string') {
        fields.push(key);
      }
      
      // Check for common media field names
      if (commonMediaFields.includes(key)) {
        fields.push(key);
      }
      
      // Check for nested media arrays
      if (Array.isArray(value) && key === 'media') {
        fields.push(key);
        
        // Check each item in the array for URL fields
        value.forEach((item, index) => {
          if (item && typeof item === 'object' && item.url) {
            fields.push(`${key}.[${index}].url`);
          }
        });
      }
      
      // Check for nested objects
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        // For nested objects like coverImage: { url: '...' }
        if (value.url && typeof value.url === 'string') {
          fields.push(`${key}.url`);
        }
      }
    }
    
    return fields;
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
        current[index] = value;
      }
    } else {
      current[lastPart] = value;
    }
    
    return obj;
  }
}

module.exports = {
  UrlResolverService
};