/**
 * Media Repair Service
 * 
 * This service repairs media issues in documents by:
 * 1. Resolving relative URLs to absolute URLs
 * 2. Detecting and properly labeling media types
 */

const { UrlResolverService } = require('./url-resolver');
const { MediaTypeDetector } = require('./media-type-detector');

/**
 * Media Repair Service
 */
class MediaRepairService {
  constructor(options = {}) {
    this.urlResolver = options.urlResolver || new UrlResolverService();
    this.mediaTypeDetector = options.mediaTypeDetector || new MediaTypeDetector();
  }
  
  /**
   * Repair media issues in a document
   * 
   * @param {Object} document - The document to repair
   * @param {Array<string>} mediaFields - Optional array of field paths to media URLs
   * @returns {Object} - The repaired document
   */
  repairDocument(document, mediaFields = []) {
    if (!document || typeof document !== 'object') {
      return document;
    }
    
    // If no specific media fields are provided, detect them
    if (!mediaFields || mediaFields.length === 0) {
      mediaFields = this._detectMediaFields(document);
    }
    
    // First, resolve all URLs to ensure they're absolute
    let processedDoc = this.urlResolver.processDocument(document, mediaFields);
    
    // Then, detect and add media type information
    processedDoc = this.mediaTypeDetector.processDocumentMediaTypes(processedDoc, mediaFields);
    
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
   * Repair an array of documents
   * 
   * @param {Array<Object>} documents - Array of documents to repair
   * @param {Array<string>} mediaFields - Optional array of field paths to media URLs
   * @returns {Array<Object>} - Array of repaired documents
   */
  repairDocuments(documents, mediaFields = []) {
    if (!Array.isArray(documents)) {
      return [];
    }
    
    return documents.map(doc => this.repairDocument(doc, mediaFields));
  }
  
  /**
   * Repair a single media URL
   * 
   * @param {string} url - The URL to repair
   * @returns {Object} - Object with repaired URL and detected media type
   */
  repairMediaUrl(url) {
    if (!url || typeof url !== 'string') {
      return { url, mediaType: 'unknown' };
    }
    
    // Resolve the URL
    const resolvedUrl = this.urlResolver.resolveUrl(url);
    
    // Detect the media type
    const mediaType = this.mediaTypeDetector.detectMediaType({ url: resolvedUrl });
    
    return {
      url: resolvedUrl,
      mediaType
    };
  }
}

module.exports = {
  MediaRepairService
};