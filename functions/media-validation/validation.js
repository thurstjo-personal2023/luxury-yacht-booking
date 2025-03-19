/**
 * Media Validation Module
 * 
 * This module provides functionality for validating and repairing media URLs
 * in Firestore documents. It handles:
 * 
 * 1. Converting relative URLs to absolute URLs
 * 2. Replacing blob:// URLs with placeholder images
 * 3. Detecting and fixing media type mismatches (e.g., videos marked as images)
 * 4. Validating image URLs by checking content type
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');

// Constants for URL processing
const FIREBASE_STORAGE_BASE_URL = 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app';
const PLACEHOLDER_IMAGE_URL = `${FIREBASE_STORAGE_BASE_URL}/yacht-placeholder.jpg`;
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.avi', '.webm', '.mkv'];
const VIDEO_PATTERNS = ['-SBV-', 'Dynamic motion']; // Patterns specific to video content

/**
 * Process a single media URL
 * 
 * @param {string} url - The URL to process
 * @param {string} currentType - The current media type ('image' or 'video')
 * @param {Object} options - Additional options for processing
 * @returns {Object} - Result object with processed URL and status flags
 */
function processMediaUrl(url, currentType, options = {}) {
  const { validateContent = false } = options;
  let wasFixed = false;
  let detectedType = undefined;
  let processedUrl = url;
  
  // Handle relative URLs
  if (url.startsWith('/')) {
    processedUrl = `${FIREBASE_STORAGE_BASE_URL}${url}`;
    wasFixed = true;
  }
  
  // Handle blob URLs
  if (url.startsWith('blob:')) {
    processedUrl = PLACEHOLDER_IMAGE_URL;
    wasFixed = true;
  }
  
  // Check for video extensions in URL
  const isVideoExtension = VIDEO_EXTENSIONS.some(ext => 
    url.toLowerCase().endsWith(ext)
  );
  
  // Check for other video patterns
  const containsVideoPattern = VIDEO_PATTERNS.some(pattern => 
    url.toLowerCase().includes(pattern.toLowerCase())
  );
  
  // Detect video content from URL patterns
  if (isVideoExtension || containsVideoPattern) {
    detectedType = 'video';
    // Fix mismatched media type
    if (currentType === 'image') {
      wasFixed = true;
    }
  }
  
  return { url: processedUrl, wasFixed, detectedType };
}

/**
 * Process an array of media items
 * 
 * @param {Array} mediaArray - Array of media objects with 'url' and 'type' properties
 * @param {Object} options - Additional options for processing
 * @returns {Object} - Result object with processed media array and status flag
 */
function processMediaArray(mediaArray, options = {}) {
  let wasFixed = false;
  
  const processedArray = mediaArray.map(item => {
    // Skip items without URL
    if (!item || !item.url) return item;
    
    const { url, wasFixed: itemWasFixed, detectedType } = processMediaUrl(
      item.url, 
      item.type,
      options
    );
    
    // Update the overall fixed status
    if (itemWasFixed) {
      wasFixed = true;
    }
    
    // Update the item with processed URL
    const updatedItem = { ...item, url };
    
    // Update media type if a mismatch is detected
    if (detectedType && item.type !== detectedType) {
      updatedItem.type = detectedType;
      wasFixed = true;
    }
    
    return updatedItem;
  });
  
  return {
    mediaArray: processedArray,
    wasFixed
  };
}

/**
 * Validate and repair media URLs in a document
 * 
 * @param {string} collectionName - The Firestore collection name
 * @param {string} docId - The document ID
 * @param {Object} docData - The document data containing media fields
 * @returns {Promise<Object>} - Result of the validation and repair
 */
async function validateAndRepairMedia(collectionName, docId, docData) {
  // Check if document has media field
  if (!docData || !docData.media || !Array.isArray(docData.media)) {
    return { fixed: false, message: 'No media array found' };
  }
  
  // Process the media array
  const { mediaArray, wasFixed } = processMediaArray(docData.media);
  
  // If no fixes were needed, return early
  if (!wasFixed) {
    return { fixed: false, message: 'No media URLs needed fixing' };
  }
  
  try {
    // Update the document with fixed media
    const db = admin.firestore();
    await db.collection(collectionName).doc(docId).update({
      media: mediaArray,
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      fixed: true, 
      message: 'Successfully fixed media URLs',
      mediaArray
    };
  } catch (error) {
    console.error(`Error updating document ${collectionName}/${docId}: ${error.message}`);
    return { 
      fixed: false, 
      message: `Error updating document: ${error.message}`,
      error
    };
  }
}

/**
 * Validate a specific image URL by checking its content type
 * 
 * @param {string} url - The URL to validate
 * @returns {Promise<Object>} - Validation result
 */
async function validateImageUrl(url) {
  // Basic URL validation
  if (!url || typeof url !== 'string') {
    return { valid: false, error: 'Invalid URL' };
  }
  
  try {
    // Check if it's a properly formatted URL
    new URL(url);
    
    // For blob URLs, always return invalid
    if (url.startsWith('blob:')) {
      return { valid: false, error: 'Blob URL not resolvable' };
    }
    
    // For relative URLs, always return invalid
    if (url.startsWith('/')) {
      return { valid: false, error: 'Relative URL not resolvable' };
    }
    
    // Attempt to fetch headers only to check content type
    const response = await fetch(url, { method: 'HEAD' });
    
    if (!response.ok) {
      return { 
        valid: false, 
        error: `Request failed with status ${response.status}`,
        status: `${response.status} ${response.statusText}`
      };
    }
    
    const contentType = response.headers.get('content-type');
    
    // Check if content type is image
    if (contentType && contentType.startsWith('image/')) {
      return { valid: true, contentType };
    } 
    
    // Check if content type is video but expected image
    if (contentType && contentType.startsWith('video/')) {
      return { 
        valid: false, 
        error: 'Expected image, got video',
        contentType,
        status: `${response.status} ${response.statusText}`
      };
    }
    
    // Invalid content type
    return { 
      valid: false, 
      error: `Invalid content type: ${contentType}`,
      contentType,
      status: `${response.status} ${response.statusText}`
    };
  } catch (error) {
    return { valid: false, error: error.message };
  }
}

/**
 * Check if a string is a valid URL
 * 
 * @param {string} url - URL to validate
 * @returns {boolean} - Whether the URL is valid
 */
function isValidUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  try {
    new URL(url);
    return url.startsWith('http://') || url.startsWith('https://');
  } catch {
    return false;
  }
}

/**
 * Check if a URL points to video content
 * 
 * @param {string} url - URL to check
 * @returns {boolean} - Whether the URL likely points to video content
 */
function isVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  
  const lowerUrl = url.toLowerCase();
  
  // Check for video file extensions
  const hasVideoExtension = VIDEO_EXTENSIONS.some(ext => lowerUrl.endsWith(ext));
  
  // Check for other patterns that indicate video content
  const hasVideoPattern = VIDEO_PATTERNS.some(pattern => 
    lowerUrl.includes(pattern.toLowerCase())
  );
  
  return hasVideoExtension || hasVideoPattern;
}

module.exports = {
  processMediaUrl,
  processMediaArray,
  validateAndRepairMedia,
  validateImageUrl,
  isValidUrl,
  isVideoUrl
};