/**
 * Manual Test Script for Blob URL Resolver (Single Collection)
 * 
 * This script tests the blob URL resolver functionality for a single collection.
 */

// Import functions from Firebase Admin
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Default placeholder images
const DEFAULT_PLACEHOLDERS = {
  image: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  video: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/video-placeholder.mp4',
  avatar: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/avatar-placeholder.png',
  thumbnail: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/thumbnail-placeholder.jpg',
  yacht: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  addon: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/addon-placeholder.jpg',
};

/**
 * Initialize Firebase Admin
 */
function initializeFirebase() {
  if (getApps().length === 0) {
    try {
      // Initialize with project ID only
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';
      console.log(`Initializing Firebase Admin with project ID: ${projectId}`);
      
      const app = initializeApp({ projectId });
      return getFirestore(app);
    } catch (error) {
      console.error('Error initializing Firebase Admin:', error);
      throw error;
    }
  } else {
    return getFirestore();
  }
}

/**
 * Get the appropriate placeholder for a blob URL based on context
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
 */
function scanForBlobUrls(data, path = '', results = []) {
  if (!data || typeof data !== 'object') {
    return results;
  }
  
  if (Array.isArray(data)) {
    // Handle arrays
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
    // Handle objects
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
 * Test resolving blob URLs in a single collection
 */
async function testSingleCollection(collectionName) {
  console.log(`=== Testing Blob URL Resolution for Collection: ${collectionName} ===`);
  
  const firestore = initializeFirebase();
  
  try {
    const snapshot = await firestore.collection(collectionName).get();
    console.log(`Retrieved ${snapshot.size} documents from collection ${collectionName}`);
    
    // Count of found blob URLs
    let foundCount = 0;
    
    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const blobUrls = scanForBlobUrls(data);
      
      if (blobUrls.length > 0) {
        foundCount += blobUrls.length;
        console.log(`\nFound ${blobUrls.length} blob URLs in document ${doc.id}:`);
        
        blobUrls.forEach(({ path, value }) => {
          const placeholder = getPlaceholderForContext(path);
          console.log(`  - Path: ${path}`);
          console.log(`    URL: ${value}`);
          console.log(`    Replacement: ${placeholder}`);
        });
      }
    }
    
    if (foundCount === 0) {
      console.log(`\nNo blob URLs found in collection ${collectionName}`);
    } else {
      console.log(`\nFound ${foundCount} total blob URLs in collection ${collectionName}`);
    }
    
    console.log('=== Test Complete ===');
  } catch (error) {
    console.error(`Error testing collection ${collectionName}:`, error);
  }
}

// Run the test
const targetCollection = process.argv[2] || 'products_add_ons';
testSingleCollection(targetCollection);