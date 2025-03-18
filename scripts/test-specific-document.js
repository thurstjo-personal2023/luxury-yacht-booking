/**
 * Test Blob URL Resolution for a Specific Document
 * 
 * This script tests blob URL resolution for a specific document
 * that we know contains a blob URL.
 */

import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
if (getApps().length === 0) {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';
  console.log(`Initializing Firebase Admin with project ID: ${projectId}`);
  initializeApp({ projectId });
}

const db = getFirestore();

// Document ID that has the blob URL (from logs)
const DOCUMENT_ID = 'addon-p3wafU2xFnNZugiepyC6OOgw3fE2-1742214487996';
const COLLECTION_NAME = 'products_add_ons';

// Placeholder URL
const PLACEHOLDER_URL = 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/addon-placeholder.jpg';

/**
 * Find blob URLs in a document
 */
function findBlobUrls(data, path = '') {
  const results = [];
  
  function scan(obj, currentPath) {
    if (!obj || typeof obj !== 'object') return;
    
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const newPath = currentPath ? `${currentPath}.[${index}]` : `[${index}]`;
        
        if (typeof item === 'string' && item.startsWith('blob:')) {
          results.push({ path: newPath, value: item });
        } else if (typeof item === 'object' && item !== null) {
          scan(item, newPath);
        }
      });
    } else {
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.startsWith('blob:')) {
          results.push({ path: newPath, value });
        } else if (typeof value === 'object' && value !== null) {
          scan(value, newPath);
        }
      });
    }
  }
  
  scan(data, path);
  return results;
}

/**
 * Resolve blob URLs in a specific document
 */
async function testSpecificDocument() {
  try {
    console.log(`Fetching document ${DOCUMENT_ID} from ${COLLECTION_NAME}...`);
    
    // Get the document
    const docRef = db.collection(COLLECTION_NAME).doc(DOCUMENT_ID);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log(`Document ${DOCUMENT_ID} not found in ${COLLECTION_NAME}`);
      return;
    }
    
    // Find blob URLs
    const data = doc.data();
    const blobUrls = findBlobUrls(data);
    
    console.log(`\nDocument exists. Found ${blobUrls.length} blob URLs:`);
    
    if (blobUrls.length === 0) {
      console.log('No blob URLs found in this document.');
      console.log('This may indicate that the blob URLs have already been resolved or the document has changed.');
      return;
    }
    
    // Display blob URLs
    blobUrls.forEach((blobUrl, index) => {
      console.log(`\n${index + 1}. Path: ${blobUrl.path}`);
      console.log(`   Blob URL: ${blobUrl.value}`);
      console.log(`   Replacement: ${PLACEHOLDER_URL}`);
    });
    
    // Perform the replacement (test only - doesn't actually save)
    console.log('\nSimulating replacement (not actually saving changes):');
    
    const updateData = {};
    blobUrls.forEach(({ path, value }) => {
      console.log(`Replacing ${path}: ${value} → ${PLACEHOLDER_URL}`);
      
      // Build nested path for update
      const pathParts = path.replace(/\.\[(\d+)\]/g, '.$1').split('.');
      let currentObj = updateData;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        const part = pathParts[i];
        if (!currentObj[part]) {
          currentObj[part] = {};
        }
        currentObj = currentObj[part];
      }
      
      currentObj[pathParts[pathParts.length - 1]] = PLACEHOLDER_URL;
    });
    
    console.log('\nUpdate data structure:');
    console.log(JSON.stringify(updateData, null, 2));
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the test
testSpecificDocument();