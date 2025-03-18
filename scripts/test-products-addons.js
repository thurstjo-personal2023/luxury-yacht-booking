/**
 * Test Script for Blob URL Resolution in the products_add_ons Collection
 * 
 * This script specifically targets the products_add_ons collection where we've 
 * identified blob URLs in the logs.
 */

// Import Firebase Admin SDK components
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Default placeholder images
const DEFAULT_PLACEHOLDERS = {
  image: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  addon: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/addon-placeholder.jpg',
};

// Initialize Firebase Admin if not already initialized
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';
  console.log(`Initializing Firebase Admin with project ID: ${projectId}`);
  initializeApp({ projectId });
}

// Get Firestore instance
const db = getFirestore();

/**
 * Scan document data for blob URLs
 */
function findBlobUrls(data, path = '') {
  const blobUrls = [];
  
  function scan(obj, currentPath) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newPath = currentPath ? `${currentPath}.[${index}]` : `[${index}]`;
        
        if (typeof item === 'string' && item.startsWith('blob:')) {
          blobUrls.push({ path: newPath, value: item });
        } else if (typeof item === 'object' && item !== null) {
          scan(item, newPath);
        }
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.startsWith('blob:')) {
          blobUrls.push({ path: newPath, value });
        } else if (typeof value === 'object' && value !== null) {
          scan(value, newPath);
        }
      });
    }
  }
  
  scan(data, path);
  return blobUrls;
}

/**
 * Choose appropriate placeholder based on field path
 */
function getPlaceholder(path) {
  return path.includes('addon') ? DEFAULT_PLACEHOLDERS.addon : DEFAULT_PLACEHOLDERS.image;
}

/**
 * Test blob URL resolution in products_add_ons collection
 */
async function testProductsAddons() {
  console.log('=== Testing Blob URL Resolution in products_add_ons Collection ===\n');
  
  try {
    // Get all documents in the collection
    const snapshot = await db.collection('products_add_ons').get();
    console.log(`Found ${snapshot.size} documents in the products_add_ons collection\n`);
    
    let totalBlobUrls = 0;
    let documentsWithBlobs = 0;
    
    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const blobUrls = findBlobUrls(data);
      
      if (blobUrls.length > 0) {
        documentsWithBlobs++;
        totalBlobUrls += blobUrls.length;
        
        console.log(`Document ID: ${doc.id}`);
        console.log(`Found ${blobUrls.length} blob URLs:\n`);
        
        blobUrls.forEach((blobUrl, index) => {
          const placeholder = getPlaceholder(blobUrl.path);
          console.log(`  ${index + 1}. Path: ${blobUrl.path}`);
          console.log(`     Blob URL: ${blobUrl.value}`);
          console.log(`     Replacement: ${placeholder}\n`);
        });
      }
    }
    
    console.log('=== Summary ===');
    console.log(`Total documents: ${snapshot.size}`);
    console.log(`Documents with blob URLs: ${documentsWithBlobs}`);
    console.log(`Total blob URLs found: ${totalBlobUrls}`);
    
    if (totalBlobUrls === 0) {
      console.log('\nNo blob URLs found in the products_add_ons collection.');
      console.log('This may indicate that the blob URLs have already been resolved or that the test data has changed.');
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

// Run the test
testProductsAddons();