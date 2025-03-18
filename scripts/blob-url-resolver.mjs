/**
 * Blob URL Resolver
 * 
 * This module provides functions to detect and replace blob:// URLs in Firestore documents.
 * It also handles relative URLs by resolving them to absolute URLs.
 */

import { isRelativeUrl, resolveRelativeUrl } from './url-validator.js';

// Default placeholder images to use when replacing blob URLs
export const PLACEHOLDER_IMAGES = {
  default: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/yacht-placeholder.jpg',
  yacht: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/yacht-placeholder.jpg',
  profile: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/profile-placeholder.jpg',
  addon: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/addon-placeholder.jpg',
  image: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/image-placeholder.jpg',
  video: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4',
};

/**
 * Check if a URL is a blob URL
 * 
 * @param {string} url The URL to check
 * @returns {boolean} True if the URL is a blob URL, false otherwise
 */
export function isBlobUrl(url) {
  if (!url || typeof url !== 'string') return false;
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
      if (typeof obj[i] === 'string') {
        // Handle both blob URLs and relative URLs
        if (isBlobUrl(obj[i])) {
          obj[i] = replaceBlobUrl(obj[i]);
          count++;
        } else if (isRelativeUrl(obj[i])) {
          // Only convert relative URLs if they point to assets or placeholders
          if (obj[i].includes('/assets/') || obj[i].includes('placeholder')) {
            obj[i] = resolveRelativeUrl(obj[i]);
            count++;
          }
        }
      } else if (typeof obj[i] === 'object' && obj[i] !== null) {
        count += replaceBlobUrlsInObject(obj[i], visited);
      }
    }
  } else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        if (typeof obj[key] === 'string') {
          // Detect appropriate placeholder type based on key name and context
          let type = 'default';
          
          // Determine placeholder type based on key name
          if (key.includes('profile') || key.includes('avatar')) {
            type = 'profile';
          } else if (key.includes('yacht') || key.includes('boat')) {
            type = 'yacht';
          } else if (key.includes('addon') || key.includes('product')) {
            type = 'addon';
          } else if (key === 'type' && obj.url) {
            // This is likely a media item with type and url properties
            type = obj.type || 'image';
          }
          
          // Handle both blob URLs and relative URLs
          if (isBlobUrl(obj[key])) {
            obj[key] = replaceBlobUrl(obj[key], type);
            count++;
          } else if (isRelativeUrl(obj[key])) {
            // Only convert relative URLs if they point to assets or placeholders
            if (obj[key].includes('/assets/') || obj[key].includes('placeholder')) {
              obj[key] = resolveRelativeUrl(obj[key]);
              count++;
            }
          }
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
  // Get the document data using the data() method if available, otherwise use the data property
  const docData = typeof doc.data === 'function' ? doc.data() : doc.data;
  
  if (!docData) {
    console.warn(`No data found for document ${doc.id}`);
    return doc;
  }
  
  // Clone the document data to avoid modifying the original
  const clonedData = JSON.parse(JSON.stringify(docData));
  
  // Replace blob URLs in the cloned data
  const replacedCount = replaceBlobUrlsInObject(clonedData);
  
  if (replacedCount > 0) {
    try {
      // In a real implementation, this would update the document in Firestore
      await doc.ref.update(clonedData);
      
      // Return the document with the updated data
      return {
        ...doc,
        data: clonedData
      };
    } catch (error) {
      console.error(`Error updating document ${doc.id}:`, error);
      throw error;
    }
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
  const stats = {
    processed: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };
  
  const errors = [];
  const details = [];
  let resolvedUrls = 0;
  
  try {
    // Get all documents in the collection
    const snapshot = await firestore.collection(collectionPath).get();
    
    // Check if the collection exists
    if (snapshot.empty) {
      details.push(`Collection ${collectionPath} is empty or does not exist`);
      return {
        success: true,
        stats,
        resolvedUrls,
        errors,
        details
      };
    }
    
    // Process each document
    for (const doc of snapshot.docs) {
      stats.processed++;
      
      try {
        // Resolve blob URLs in the document
        const processedDoc = await resolveBlobUrlsInDocument(doc);
        
        // Check if the document was updated
        if (processedDoc !== doc) {
          stats.updated++;
          details.push(`Updated document ${doc.id} in collection ${collectionPath}`);
          
          // Count resolved URLs by comparing the original and processed documents
          const originalData = JSON.stringify(doc.data());
          const processedData = JSON.stringify(processedDoc.data);
          const originalBlobCount = (originalData.match(/blob:/g) || []).length;
          const processedBlobCount = (processedData.match(/blob:/g) || []).length;
          const resolved = originalBlobCount - processedBlobCount;
          
          if (resolved > 0) {
            resolvedUrls += resolved;
            details.push(`Resolved ${resolved} blob URLs in document ${doc.id}`);
          }
        } else {
          stats.skipped++;
          details.push(`Skipped document ${doc.id} in collection ${collectionPath} (no blob URLs)`);
        }
      } catch (error) {
        stats.errors++;
        errors.push({
          docId: doc.id,
          error: error.message
        });
        details.push(`Error processing document ${doc.id}: ${error.message}`);
      }
    }
    
    return {
      success: stats.errors === 0,
      stats,
      resolvedUrls,
      errors,
      details
    };
  } catch (error) {
    return {
      success: false,
      stats,
      resolvedUrls,
      errors: [{ error: error.message }],
      details: [`Error processing collection ${collectionPath}: ${error.message}`]
    };
  }
}

/**
 * Resolve blob URLs across multiple collections
 * 
 * @param {object} firestore Firestore instance
 * @param {Array<string>} collections Array of collection paths
 * @returns {Promise<object>} Promise resolving to the results of the operation
 */
export async function resolveBlobUrlsInCollections(firestore, collections) {
  const results = {
    success: true,
    collections: {},
    stats: {
      totalProcessed: 0,
      totalUpdated: 0,
      totalSkipped: 0,
      totalErrors: 0,
      totalResolved: 0
    }
  };
  
  // Process each collection
  for (const collection of collections) {
    try {
      const result = await resolveBlobUrlsInCollection(firestore, collection);
      
      // Store the result for this collection
      results.collections[collection] = result;
      
      // Update overall statistics
      results.stats.totalProcessed += result.stats.processed;
      results.stats.totalUpdated += result.stats.updated;
      results.stats.totalSkipped += result.stats.skipped;
      results.stats.totalErrors += result.stats.errors;
      results.stats.totalResolved += result.resolvedUrls;
      
      // Update success flag
      results.success = results.success && result.success;
    } catch (error) {
      results.collections[collection] = {
        success: false,
        error: error.message
      };
      results.success = false;
    }
  }
  
  return results;
}

// Export functions for use in other modules
export default {
  isBlobUrl,
  replaceBlobUrl,
  replaceBlobUrlsInObject,
  resolveBlobUrlsInDocument,
  resolveBlobUrlsInCollection,
  resolveBlobUrlsInCollections
};