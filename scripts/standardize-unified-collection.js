/**
 * Standardize Unified Yacht Experiences Collection
 * 
 * This script standardizes all documents in the unified_yacht_experiences collection
 * to ensure consistent field naming and data structure.
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
const UNIFIED_COLLECTION = 'unified_yacht_experiences';

/**
 * Standardize the document fields for consistency
 * Ensures all documents have the same field names and structure
 */
async function standardizeDocument(doc) {
  const data = doc.data();
  const docId = doc.id;
  
  console.log(`Standardizing document ${docId}`);
  
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
    // Primary identifier - use either existing id or document ID
    id: data.id || docId,
    
    // Basic information - standardize on camelCase
    title: data.title || data.name || '',
    description: data.description || '',
    category: data.category || data.type || '',
    yachtType: data.yachtType || data.yacht_type || '',
    
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
    
    // Status fields - standardize on camelCase
    isAvailable: determineAvailabilityStatus(data),
    isFeatured: !!data.isFeatured || !!data.featured || false,
    isPublished: !!data.isPublished || !!data.published_status || true,
    
    // Location information - standardize structure
    location: standardizeLocation(data.location),
    
    // Capacity and pricing - standardize numeric fields
    capacity: normalizeNumber(data.capacity || data.max_guests),
    duration: normalizeNumber(data.duration),
    pricing: normalizeNumber(data.pricing || data.price),
    pricingModel: data.pricingModel || data.pricing_model || "Fixed",
    
    // Arrays - ensure they are always properly structured arrays
    customizationOptions: ensureArray(data.customizationOptions || data.customization_options).map(option => {
      if (typeof option === 'object' && option !== null) {
        return {
          id: option.id || option.product_id || Math.random().toString(36).substring(2, 15),
          name: option.name || '',
          price: normalizeNumber(option.price)
        };
      }
      return null;
    }).filter(Boolean), // Remove null items
    
    tags: ensureArray(data.tags || data.features),
    
    // Reviews - ensure consistent structure
    reviews: ensureArray(data.reviews).map(review => {
      if (typeof review === 'object' && review !== null) {
        return {
          rating: normalizeNumber(review.rating),
          text: review.text || review.reviewText || '',
          userId: review.userId || '',
          createdAt: normalizeTimestamp(review.createdAt || review.date)
        };
      }
      return null;
    }).filter(Boolean),
    
    // Owner/provider info
    providerId: data.providerId || data.producerId || data.producer_id || null,
    
    // Virtual tour data
    virtualTour: standardizeVirtualTour(data.virtualTour || data.virtual_tour),
    
    // Timestamps - standardize to camelCase
    createdAt: normalizeTimestamp(data.createdAt || data.created_date),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Special field for cache busting
    _lastUpdated: Date.now().toString(),
    
    // Legacy fields preserved for backward compatibility
    name: data.title || data.name || '',
    availability_status: determineAvailabilityStatus(data),
    available: determineAvailabilityStatus(data),
    features: ensureArray(data.tags || data.features),
    yacht_type: data.yachtType || data.yacht_type || '',
    price: normalizeNumber(data.pricing || data.price),
    max_guests: normalizeNumber(data.capacity || data.max_guests),
    created_date: normalizeTimestamp(data.createdAt || data.created_date),
    last_updated_date: admin.firestore.FieldValue.serverTimestamp(),
    
    // Source tracking to identify which records have been standardized
    _standardized: true,
    _standardizedVersion: 2  // Increment this when making significant changes to the standardization logic
  };
  
  return standardized;
}

/**
 * Helper to determine availability status with consistent boolean values
 */
function determineAvailabilityStatus(data) {
  // Prioritize in this order: isAvailable, availability_status, available
  if (data.isAvailable !== undefined) return !!data.isAvailable; 
  if (data.availability_status !== undefined) return !!data.availability_status;
  if (data.available !== undefined) return !!data.available;
  return true; // Default to available
}

/**
 * Helper to standardize location structure
 */
function standardizeLocation(location) {
  if (!location) {
    return {
      address: "",
      latitude: 0,
      longitude: 0,
      region: "dubai",
      portMarina: ""
    };
  }
  
  return {
    address: location.address || "",
    latitude: location.latitude || 0,
    longitude: location.longitude || 0,
    region: location.region || "dubai",
    portMarina: location.portMarina || location.port_marina || ""
  };
}

/**
 * Helper to standardize virtual tour data
 */
function standardizeVirtualTour(tourData) {
  if (!tourData) {
    return {
      isEnabled: false,
      scenes: []
    };
  }
  
  return {
    isEnabled: tourData.isEnabled || tourData.enabled || false,
    scenes: ensureArray(tourData.scenes).map(scene => ({
      id: scene.id || "",
      title: scene.title || "",
      imageUrl: scene.imageUrl || "",
      thumbnailUrl: scene.thumbnailUrl || "",
      hotspots: ensureArray(scene.hotspots),
      initialViewParameters: scene.initialViewParameters || {}
    }))
  };
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
 * Extract main image URL from various possible fields and formats
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
  
  // Default to a standard yacht image
  return "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800";
}

/**
 * Main function to standardize all documents in the collection
 */
async function standardizeCollection() {
  try {
    console.log(`Starting standardization of ${UNIFIED_COLLECTION} collection...`);
    
    // Get all documents from the collection
    const snapshot = await db.collection(UNIFIED_COLLECTION).get();
    
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
    
    console.log(`Successfully standardized ${count} documents in ${UNIFIED_COLLECTION} collection.`);
  } catch (error) {
    console.error('Error standardizing collection:', error);
  }
}

// Run the standardization
standardizeCollection()
  .then(() => console.log('Standardization completed successfully.'))
  .catch(error => console.error('Standardization failed:', error));