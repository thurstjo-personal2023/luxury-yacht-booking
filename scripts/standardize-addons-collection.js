/**
 * Standardize Product Add-ons Collection
 * 
 * This script standardizes all documents in the products_add_ons collection
 * to ensure consistent field naming and data structure, similar to the
 * standardization done for the yacht experiences.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-data-connect.json');

// Constants
const ADDONS_COLLECTION = 'products_add_ons';
const STD_VERSION = 1; // Increment this when making changes to standardization logic

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

/**
 * Standardize the document fields for consistency
 * Ensures all documents have the same field names and structure
 */
async function standardizeDocument(doc) {
  const data = doc.data();
  const id = doc.id;
  
  console.log(`Standardizing add-on: ${data.name || id}`);
  
  // Create standardized object with consistent field naming
  const standardized = {
    // Add standardization metadata
    _standardized: true,
    _standardizedVersion: STD_VERSION,
    _lastUpdated: new Date().toISOString(),
    
    // Ensure ID is set
    productId: data.productId || id,
    
    // Basic information
    name: data.name || "Unnamed Add-on",
    description: data.description || "",
    category: data.category || "Other",
    
    // Pricing
    pricing: typeof data.pricing === 'number' ? data.pricing : 0,
    
    // Status flags - ensure boolean type
    availability: typeof data.availability === 'boolean' ? data.availability : true,
    isAvailable: typeof data.availability === 'boolean' ? data.availability : true,  // Alias for unified schema
    
    // Extract and standardize main image
    mainImage: getMainImageURL(data),
    
    // Media array - ensure proper format
    media: ensureArray(data.media).map(item => ({
      type: item.type || 'image',
      url: item.url || ''
    })),
    
    // Tags - ensure array
    tags: ensureArray(data.tags),
    
    // Service provider
    partnerId: data.partnerId || "",
    
    // Timestamps - keep original values
    createdDate: data.createdDate || admin.firestore.FieldValue.serverTimestamp(),
    lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp(),
    
    // Keep original data for reference (non-destructive approach)
    ...data
  };
  
  return standardized;
}

/**
 * Helper to ensure a value is an array
 * Handles various problematic array formats found in the data
 */
function ensureArray(value) {
  if (!value) return [];
  
  // Handle if value is already an array
  if (Array.isArray(value)) return value;
  
  // Handle case where it's an object with numeric keys (like a pseudo-array)
  if (typeof value === 'object') {
    // Check if it has numeric keys like {0: item1, 1: item2}
    const keys = Object.keys(value);
    if (keys.length > 0 && keys.every(key => !isNaN(parseInt(key)))) {
      return Object.values(value);
    }
  }
  
  // Last resort: wrap in array
  return [value];
}

/**
 * Extract main image URL from media array
 */
function getMainImageURL(data) {
  // Check for media array
  if (Array.isArray(data.media) && data.media.length > 0) {
    // Find first image
    const firstImage = data.media.find(item => item.type === 'image' && item.url);
    if (firstImage && firstImage.url) return firstImage.url;
  }
  
  // Check for existing mainImage field
  if (data.mainImage) return data.mainImage;
  
  // Return default image if nothing found
  return '/placeholder-addon.png';
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
      if (count >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        count = 0;
        console.log(`Committed batch of ${BATCH_SIZE} documents.`);
      }
    }
    
    // Commit any remaining documents in the batch
    if (count > 0) {
      await batch.commit();
      console.log(`Committed remaining ${count} documents.`);
    }
    
    console.log(`Successfully standardized ${snapshot.size} documents in the ${ADDONS_COLLECTION} collection.`);
  } catch (error) {
    console.error('Error standardizing collection:', error);
  }
}

// Execute the standardization function
standardizeCollection()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });