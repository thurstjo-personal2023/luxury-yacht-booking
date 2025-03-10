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
  
  // Prepare the standardized document
  const standardized = {
    // Use either the existing id or the document ID
    id: data.id || docId,
    
    // Basic information - standardize on camelCase
    title: data.title || data.name || '',
    description: data.description || '',
    category: data.category || data.type || '',
    yachtType: data.yachtType || data.yacht_type || '',
    
    // Media handling - ensure media is always an array
    media: Array.isArray(data.media) ? data.media : [],
    
    // Add a mainImage field for simpler access
    mainImage: getMainImageURL(data),
    
    // Status fields - standardize on camelCase
    isAvailable: determineAvailabilityStatus(data),
    isFeatured: !!data.featured || !!data.isFeatured || false,
    isPublished: !!data.published_status || !!data.isPublished || true,
    
    // Location information - standardize structure
    location: standardizeLocation(data.location),
    
    // Capacity and pricing - standardize
    capacity: data.capacity || data.max_guests || 0,
    duration: data.duration || 0,
    pricing: data.pricing || data.price || 0,
    pricingModel: data.pricingModel || data.pricing_model || "Fixed",
    
    // Arrays - ensure they are always arrays
    customizationOptions: ensureArray(data.customizationOptions || data.customization_options),
    tags: ensureArray(data.tags || data.features),
    reviews: ensureArray(data.reviews),
    
    // Owner/provider info
    providerId: data.providerId || data.producerId || data.producer_id || null,
    
    // Virtual tour data
    virtualTour: standardizeVirtualTour(data.virtualTour || data.virtual_tour),
    
    // Timestamps - standardize to camelCase
    createdAt: data.createdAt || data.created_date || admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    
    // Special field for cache busting
    _lastUpdated: Date.now().toString(),
    
    // Legacy fields preserved for backward compatibility
    name: data.title || data.name || '',
    availability_status: determineAvailabilityStatus(data),
    available: determineAvailabilityStatus(data),
    features: ensureArray(data.tags || data.features),
    yacht_type: data.yachtType || data.yacht_type || '',
    price: data.pricing || data.price || 0,
    max_guests: data.capacity || data.max_guests || 0,
    created_date: data.createdAt || data.created_date || admin.firestore.FieldValue.serverTimestamp(),
    last_updated_date: admin.firestore.FieldValue.serverTimestamp(),
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
 */
function ensureArray(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  
  // Handle object with numeric keys that should be an array
  if (typeof value === 'object') {
    const keys = Object.keys(value);
    if (keys.some(k => !isNaN(parseInt(k)))) {
      return keys.map(k => value[k]).filter(Boolean);
    }
  }
  
  return [value]; // Wrap single value in array
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