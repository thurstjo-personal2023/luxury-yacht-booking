/**
 * Blob URL Resolver Test Exports
 * 
 * This file exports utility functions from the blob URL resolver module
 * in CommonJS format for use in Jest tests.
 */

/**
 * Default placeholder images to use when replacing blob URLs
 */
const DEFAULT_PLACEHOLDERS = {
  image: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  video: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/video-placeholder.mp4',
  avatar: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/avatar-placeholder.png',
  thumbnail: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/thumbnail-placeholder.jpg',
  yacht: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  addon: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/addon-placeholder.jpg',
};

/**
 * Get the appropriate placeholder for a blob URL based on context
 * 
 * @param {string} fieldPath - The path of the field containing the blob URL
 * @returns {string} - URL of the appropriate placeholder image
 */
function getPlaceholderForContext(fieldPath) {
  const lowerPath = fieldPath.toLowerCase();
  
  if (lowerPath.includes('profile') || lowerPath.includes('avatar')) {
    return DEFAULT_PLACEHOLDERS.avatar;
  } else if (lowerPath.includes('thumbnail')) {
    return DEFAULT_PLACEHOLDERS.thumbnail;
  } else if (lowerPath.includes('video')) {
    return DEFAULT_PLACEHOLDERS.video;
  } else if (lowerPath.includes('yacht')) {
    return DEFAULT_PLACEHOLDERS.yacht;
  } else if (lowerPath.includes('addon')) {
    return DEFAULT_PLACEHOLDERS.addon;
  }
  
  // Default to generic image placeholder
  return DEFAULT_PLACEHOLDERS.image;
}

/**
 * Scan a Firestore document for blob URLs
 * 
 * @param {Object} data - The document data
 * @param {string} path - Current path in the document (for recursion)
 * @param {Array} results - Array to store found blob URLs
 */
function scanForBlobUrls(data, path = '', results = []) {
  if (!data || typeof data !== 'object') {
    return results;
  }
  
  if (Array.isArray(data)) {
    // Handle arrays by recursively scanning each element with index
    data.forEach((item, index) => {
      if (typeof item === 'string' && item.startsWith('blob:')) {
        results.push({
          path: path ? `${path}.[${index}]` : `[${index}]`,
          value: item
        });
      } else if (typeof item === 'object' && item !== null) {
        scanForBlobUrls(item, path ? `${path}.[${index}]` : `[${index}]`, results);
      }
    });
  } else {
    // Handle objects by recursively scanning each property
    Object.entries(data).forEach(([key, value]) => {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && value.startsWith('blob:')) {
        results.push({
          path: currentPath,
          value: value
        });
      } else if (typeof value === 'object' && value !== null) {
        scanForBlobUrls(value, currentPath, results);
      }
    });
  }
  
  return results;
}

/**
 * Replace a value at a specific path in a nested object
 * 
 * @param {Object} obj - The object to modify
 * @param {string} path - The path to the property to replace
 * @param {any} value - The new value
 * @returns {Object} - The modified object
 */
function setNestedValue(obj, path, value) {
  if (!path) {
    return obj;
  }
  
  // Parse the path string into parts
  // Handle both regular properties and array indices
  let parts;
  
  if (path.includes('.')) {
    parts = path.split('.');
  } else {
    parts = [path];
  }
  
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    
    // Handle array indices
    if (part.startsWith('[') && part.endsWith(']')) {
      const index = parseInt(part.substring(1, part.length - 1), 10);
      if (!Array.isArray(current)) {
        return obj; // Cannot set property of non-array
      }
      if (!current[index] || typeof current[index] !== 'object') {
        current[index] = {};
      }
      current = current[index];
    } else {
      if (!current[part] || typeof current[part] !== 'object') {
        current[part] = {};
      }
      current = current[part];
    }
  }
  
  // Set the value on the final part
  const lastPart = parts[parts.length - 1];
  
  // Handle array indices in the last part
  if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
    const index = parseInt(lastPart.substring(1, lastPart.length - 1), 10);
    if (Array.isArray(current)) {
      current[index] = value;
    }
  } else {
    current[lastPart] = value;
  }
  
  return obj;
}

// Export functions for testing
module.exports = {
  scanForBlobUrls,
  setNestedValue,
  getPlaceholderForContext
};