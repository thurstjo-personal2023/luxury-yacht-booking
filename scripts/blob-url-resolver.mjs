/**
 * Blob URL Resolution Script (ES Module Version)
 * 
 * This script identifies and replaces blob:// URLs in Firestore documents with appropriate
 * placeholder images based on their usage context.
 * 
 * Issues with blob URLs:
 * - Blob URLs are only valid in the browser session where they were created
 * - They cannot be accessed by servers or other users
 * - They typically appear when users upload files but the upload doesn't complete properly
 */

// Initialize Firebase Admin first to prevent module compatibility issues
import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Initialize Firebase Admin if not already initialized
let firestore;
if (getApps().length === 0) {
  try {
    // Initialize with project ID if no service account provided
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';
    
    // Check for Firebase service account from environment variable
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      const app = initializeApp({
        credential: cert(serviceAccount),
        projectId
      });
      firestore = getFirestore(app);
    } else {
      // Use application default credentials
      const app = initializeApp({ projectId });
      firestore = getFirestore(app);
    }
  } catch (error) {
    console.error('Error initializing Firebase Admin:', error.message);
    throw error;
  }
} else {
  // Use existing app
  firestore = getFirestore();
}

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

/**
 * Resolve blob URLs in a specific Firestore collection
 * 
 * @param {string} collectionName - Name of the collection to process
 * @returns {Promise<Object>} - Results of the resolution process
 */
async function resolveCollectionBlobUrls(collectionName) {
  const results = {
    collection: collectionName,
    scanned: 0,
    resolved: 0,
    failed: 0,
    details: []
  };
  
  try {
    const snapshot = await firestore.collection(collectionName).get();
    results.scanned = snapshot.size;
    
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const blobUrls = scanForBlobUrls(data);
      
      if (blobUrls.length > 0) {
        // Create a copy of the data for updates
        let updatedData = { ...data };
        
        // Replace each blob URL with an appropriate placeholder
        blobUrls.forEach(({ path, value }) => {
          try {
            const placeholder = getPlaceholderForContext(path);
            updatedData = setNestedValue(updatedData, path, placeholder);
            
            results.details.push({
              documentId: doc.id,
              field: path,
              originalUrl: value,
              newUrl: placeholder,
              status: 'resolved'
            });
            
            results.resolved++;
          } catch (error) {
            console.error(`Error resolving blob URL in ${collectionName}/${doc.id} at ${path}:`, error);
            
            results.details.push({
              documentId: doc.id,
              field: path,
              originalUrl: value,
              error: error.message,
              status: 'failed'
            });
            
            results.failed++;
          }
        });
        
        // Update the document if blob URLs were found and resolved
        if (results.resolved > 0) {
          try {
            await doc.ref.update(updatedData);
          } catch (error) {
            console.error(`Error updating document ${collectionName}/${doc.id}:`, error);
            
            // Mark all resolutions for this document as failed
            results.details.forEach(detail => {
              if (detail.documentId === doc.id && detail.status === 'resolved') {
                detail.status = 'failed';
                detail.error = 'Document update failed: ' + error.message;
                results.resolved--;
                results.failed++;
              }
            });
          }
        }
      }
    }
  } catch (error) {
    console.error(`Error processing collection ${collectionName}:`, error);
    results.error = error.message;
  }
  
  return results;
}

/**
 * Get a list of all collections in Firestore
 * 
 * @returns {Promise<string[]>} - Array of collection names
 */
async function getAllCollections() {
  try {
    const collections = await firestore.listCollections();
    return collections.map(col => col.id);
  } catch (error) {
    console.error('Error getting collections:', error);
    return [];
  }
}

/**
 * Resolve all blob URLs in Firestore
 * 
 * @returns {Promise<Object>} - Results of the resolution process
 */
export async function resolveAllBlobUrls() {
  const startTime = Date.now();
  
  try {
    // Generate a unique ID for this operation
    const operationId = uuidv4();
    
    console.log(`[${new Date().toISOString()}] Starting blob URL resolution operation with ID ${operationId}`);
    
    // Get all collections
    const collections = await getAllCollections();
    console.log(`[${new Date().toISOString()}] Found ${collections.length} collections to scan`);
    
    // Track overall results
    const results = {
      totalDocs: 0,
      totalResolved: 0,
      totalFailed: 0,
      collections: []
    };
    
    // Process each collection
    for (const collection of collections) {
      console.log(`[${new Date().toISOString()}] Scanning collection ${collection}`);
      
      const collectionResults = await resolveCollectionBlobUrls(collection);
      results.totalDocs += collectionResults.scanned;
      results.totalResolved += collectionResults.resolved;
      results.totalFailed += collectionResults.failed;
      results.collections.push(collectionResults);
    }
    
    // Calculate execution time
    const endTime = Date.now();
    const executionTime = endTime - startTime;
    
    // Create a report document
    const report = {
      id: operationId,
      timestamp: new Date(),
      executionTime,
      totalDocs: results.totalDocs,
      totalResolved: results.totalResolved,
      totalFailed: results.totalFailed,
      collections: results.collections.map(c => ({
        name: c.collection,
        scanned: c.scanned,
        resolved: c.resolved,
        failed: c.failed
      })),
      details: results.collections.flatMap(c => c.details || [])
    };
    
    // Store the report in Firestore
    try {
      await firestore.collection('blob_url_reports').doc(operationId).set(report);
      console.log(`[${new Date().toISOString()}] Blob URL resolution report saved with ID ${operationId}`);
    } catch (error) {
      console.error('Error saving blob URL resolution report:', error);
    }
    
    console.log(`[${new Date().toISOString()}] Blob URL resolution completed: ${results.totalResolved} resolved, ${results.totalFailed} failed`);
    
    return {
      success: true,
      reportId: operationId,
      stats: {
        totalDocs: results.totalDocs,
        totalResolved: results.totalResolved,
        totalFailed: results.totalFailed,
        executionTime
      }
    };
  } catch (error) {
    console.error('Error resolving blob URLs:', error);
    
    return {
      success: false,
      error: error.message
    };
  }
}