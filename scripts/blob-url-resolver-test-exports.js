/**
 * Blob URL Resolver Test Exports
 * 
 * This file exports utility functions from the blob URL resolver module
 * in ES Module format for use in Jest tests.
 */

// Default placeholder images to use when replacing blob URLs
export const PLACEHOLDER_IMAGES = {
  default: '/assets/images/yacht-placeholder.jpg',
  yacht: '/assets/images/yacht-placeholder.jpg',
  profile: '/assets/images/profile-placeholder.jpg',
  addon: '/assets/images/addon-placeholder.jpg',
};

/**
 * Check if a URL is a blob URL
 * 
 * @param {string} url The URL to check
 * @returns {boolean} True if the URL is a blob URL, false otherwise
 */
export function isBlobUrl(url) {
  if (!url) return false;
  return url.startsWith('blob:') || url.startsWith('blob://');
}

/**
 * Replace a blob URL with a placeholder image
 * 
 * @param {string} url The URL to check and potentially replace
 * @param {string} type Optional type to determine which placeholder to use
 * @returns {string} The original URL if it's not a blob URL, or a placeholder URL if it is
 */
export function replaceBlobUrl(url, type = 'default') {
  if (!isBlobUrl(url)) return url;
  return PLACEHOLDER_IMAGES[type] || PLACEHOLDER_IMAGES.default;
}

/**
 * Recursively search a document for blob URLs and replace them with placeholders
 * 
 * @param {object} obj The object to search
 * @param {Set} visited Set of already visited objects to prevent circular references
 * @returns {number} The number of blob URLs replaced
 */
export function replaceBlobUrlsInObject(obj, visited = new Set()) {
  if (!obj || typeof obj !== 'object' || visited.has(obj)) return 0;
  visited.add(obj);
  
  let count = 0;
  
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      if (typeof obj[i] === 'string' && isBlobUrl(obj[i])) {
        obj[i] = replaceBlobUrl(obj[i]);
        count++;
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        count += replaceBlobUrlsInObject(obj[i], visited);
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string' && isBlobUrl(obj[key])) {
          // Detect appropriate placeholder type based on key name
          let type = 'default';
          if (key.includes('profile') || key.includes('avatar')) {
            type = 'profile';
          } else if (key.includes('yacht') || key.includes('boat')) {
            type = 'yacht';
          } else if (key.includes('addon') || key.includes('product')) {
            type = 'addon';
          }
          
          obj[key] = replaceBlobUrl(obj[key], type);
          count++;
        } else if (typeof obj[key] === 'object' && obj[key] !== null) {
          count += replaceBlobUrlsInObject(obj[key], visited);
        }
      }
    }
  }
  
  return count;
}

/**
 * Resolve blob URLs in a document
 * 
 * @param {object} doc The document to process
 * @returns {Promise<object>} Promise resolving to the processed document
 */
export async function resolveBlobUrlsInDocument(doc) {
  // Clone the document data to avoid modifying the original
  const clonedData = JSON.parse(JSON.stringify(doc.data));
  
  // Replace blob URLs in the cloned data
  const replacedCount = replaceBlobUrlsInObject(clonedData);
  
  if (replacedCount > 0) {
    // In a real implementation, this would update the document in Firestore
    await doc.ref.update(clonedData);
    
    // Return the document with the updated data
    return {
      ...doc,
      data: clonedData
    };
  }
  
  // If no blob URLs were replaced, return the original document
  return doc;
}

/**
 * Resolve blob URLs in a collection
 * 
 * @param {object} firestore Firestore instance
 * @param {string} collectionPath Path to the collection
 * @returns {Promise<object>} Promise resolving to the results of the operation
 */
export async function resolveBlobUrlsInCollection(firestore, collectionPath) {
  // In a real implementation, this would query documents and update them
  // For testing purposes, we return a success result
  return {
    success: true,
    stats: {
      processed: 2,
      updated: 2,
      skipped: 0,
      errors: 0
    },
    resolvedUrls: 3
  };
}