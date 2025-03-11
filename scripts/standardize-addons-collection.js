/**
 * Standardize Product Add-ons Collection
 * 
 * This script standardizes all documents in the products_add_ons collection
 * to ensure consistent field naming and data structure, similar to the
 * standardization done for the yacht experiences.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-data-connect.json');

// Only initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://yacht-rentals-dev.firebaseio.com",
  });
}

const db = admin.firestore();
const ADDONS_COLLECTION = 'products_add_ons';

/**
 * Standardize the document fields for consistency
 * Ensures all documents have the same field names and structure
 */
async function standardizeDocument(doc) {
  const data = doc.data();
  const docId = doc.id;
  
  console.log(`Standardizing add-on document ${docId}`);
  
  // Helper to normalize timestamps consistently
  const normalizeTimestamp = (timestamp) => {
    if (!timestamp) return admin.firestore.FieldValue.serverTimestamp();
    
    // Handle Firestore Timestamp objects directly
    if (timestamp.toMillis && typeof timestamp.toMillis === 'function') {
      return timestamp;
    }
    
    // Handle serialized Firestore Timestamps
    if (typeof timestamp === 'object' && timestamp._seconds !== undefined) {
      return new admin.firestore.Timestamp(timestamp._seconds, timestamp._nanoseconds || 0);
    }
    
    // Handle ISO string dates
    if (typeof timestamp === 'string') {
      try {
        const date = new Date(timestamp);
        if (!isNaN(date.getTime())) {
          return admin.firestore.Timestamp.fromDate(date);
        }
      } catch (e) {
        console.warn('Failed to parse timestamp string:', timestamp);
      }
    }
    
    // Handle numeric timestamps (milliseconds)
    if (typeof timestamp === 'number') {
      return admin.firestore.Timestamp.fromMillis(timestamp);
    }
    
    return admin.firestore.FieldValue.serverTimestamp();
  };
  
  // Helper to normalize numeric fields
  const normalizeNumber = (value, defaultValue = 0) => {
    if (value === undefined || value === null) return defaultValue;
    if (typeof value === 'number') return value;
    
    // Try to convert string to number
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) return parsed;
    }
    
    return defaultValue;
  };
  
  // Prepare the standardized document
  const standardized = {
    // Primary identifier
    id: data.productId || data.id || docId,
    
    // Basic information - standardized to camelCase
    name: data.name || '',
    description: data.description || '',
    category: data.category || '',
    
    // Media handling - ensure media is always a properly structured array
    media: ensureArray(data.media).map(item => {
      // Standardize media item structure
      if (typeof item === 'string') {
        return { type: 'image', url: item };
      } else if (typeof item === 'object' && item !== null) {
        return {
          type: item.type || 'image',
          url: item.url || ''
        };
      }
      return { type: 'image', url: '' };
    }).filter(item => item.url), // Remove empty items
    
    // Add a mainImage field for simpler frontend access
    mainImage: getMainImageURL(data),
    
    // Status fields - standardize on camelCase and ensure boolean type
    isAvailable: determineAvailabilityStatus(data),
    
    // Pricing - standardize numeric fields
    pricing: normalizeNumber(data.pricing || data.price),
    
    // Arrays - ensure they are always properly structured arrays
    tags: ensureArray(data.tags),
    
    // Partner/Provider information
    partnerId: data.partnerId || data.provider_id || null,
    
    // Timestamps - standardize to camelCase
    createdAt: normalizeTimestamp(data.createdDate || data.created_date),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Special field for cache busting in UI
    _lastUpdated: Date.now().toString(),
    
    // Legacy fields preserved for backward compatibility
    productId: data.productId || data.id || docId,
    availability: determineAvailabilityStatus(data),
    createdDate: normalizeTimestamp(data.createdDate || data.created_date),
    lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp(),
    
    // Source tracking to identify which records have been standardized
    _standardized: true,
    _standardizedVersion: 1  // Increment this when making significant changes to the standardization logic
  };
  
  return standardized;
}

/**
 * Helper to determine availability status with consistent boolean values
 */
function determineAvailabilityStatus(data) {
  // Prioritize in this order: isAvailable, availability, available
  if (data.isAvailable !== undefined) return !!data.isAvailable; 
  if (data.availability !== undefined) return !!data.availability;
  if (data.available !== undefined) return !!data.available;
  return true; // Default to available
}

/**
 * Helper to ensure a value is an array
 * Handles various problematic array formats found in the data
 */
function ensureArray(value) {
  if (!value) return [];
  
  // Already an array - perfect!
  if (Array.isArray(value)) return value;
  
  // Handle object with numeric keys that should be an array
  // This happens when Firestore serializes arrays with empty slots
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.some(k => !isNaN(parseInt(k)))) {
      // Sort keys numerically to maintain array order
      const numericKeys = keys
        .filter(k => !isNaN(parseInt(k)))
        .sort((a, b) => parseInt(a) - parseInt(b));
      
      // Create properly ordered array
      return numericKeys.map(k => value[k]).filter(Boolean);
    }
  }
  
  // Handle string values that might be serialized JSON arrays
  if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        console.log('Successfully parsed JSON string into array');
        return parsed;
      }
    } catch (e) {
      console.log('Failed to parse potential JSON array string', e.message);
    }
  }
  
  // Default case: wrap single value in array
  return [value];
}

/**
 * Extract main image URL from media array or other fields
 */
function getMainImageURL(data) {
  // Check for existing mainImage field
  if (data.mainImage && typeof data.mainImage === 'string') {
    return data.mainImage;
  }
  
  // Check for imageUrl field
  if (data.imageUrl && typeof data.imageUrl === 'string') {
    return data.imageUrl;
  }
  
  // Check for coverImage field
  if (data.coverImage && typeof data.coverImage === 'string') {
    return data.coverImage;
  }
  
  // Check for media array
  if (Array.isArray(data.media) && data.media.length > 0) {
    const firstImage = data.media[0];
    // Handle standard media object format
    if (firstImage && typeof firstImage === 'object' && firstImage.url) {
      return firstImage.url;
    }
    
    // Handle case where media item is a string directly
    if (typeof firstImage === 'string') {
      return firstImage;
    }
  }
  
  // Handle case where media is a string directly
  if (typeof data.media === 'string' && data.media) {
    return data.media;
  }
  
  // Handle media as object with numeric keys
  if (data.media && typeof data.media === 'object') {
    // Check for '0' key first
    if (data.media['0'] && data.media['0'].url) {
      return data.media['0'].url;
    }
    
    // Try to get any media item
    const keys = Object.keys(data.media);
    for (const key of keys) {
      const mediaItem = data.media[key];
      if (mediaItem && mediaItem.url) {
        return mediaItem.url;
      }
    }
  }
  
  // Default to a standard add-on image
  return "https://images.unsplash.com/photo-1578592338145-e1844658b5c3?w=800";
}

/**
 * Main function to standardize all documents in the collection
 */
async function standardizeCollection() {
  try {
    console.log(`Starting standardization of ${ADDONS_COLLECTION} collection...`);
    
    // Get all documents from the collection
    const snapshot = await db.collection(ADDONS_COLLECTION).get();
    
    if (snapshot.empty) {
      console.log('No documents found in the collection.');
      return;
    }
    
    console.log(`Found ${snapshot.size} documents to standardize.`);
    
    // Create a batch for more efficient updates
    let batch = db.batch();
    let count = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    // Process each document
    for (const doc of snapshot.docs) {
      const standardized = await standardizeDocument(doc);
      
      // Add document update to batch
      batch.set(doc.ref, standardized, { merge: true });
      count++;
      
      // If batch size limit is reached, commit and create a new batch
      if (count % BATCH_SIZE === 0) {
        console.log(`Committing batch of ${BATCH_SIZE} documents...`);
        await batch.commit();
        batch = db.batch();
      }
    }
    
    // Commit any remaining updates
    if (count % BATCH_SIZE !== 0) {
      console.log(`Committing final batch of ${count % BATCH_SIZE} documents...`);
      await batch.commit();
    }
    
    console.log(`Successfully standardized ${count} documents in ${ADDONS_COLLECTION} collection.`);
  } catch (error) {
    console.error('Error standardizing collection:', error);
  }
}

// Run the standardization
standardizeCollection()
  .then(() => console.log('Add-on standardization completed successfully.'))
  .catch(error => console.error('Add-on standardization failed:', error));