/**
 * Blob URL Resolver Module
 * 
 * This module resolves blob:// URLs in Firestore documents by replacing them
 * with appropriate placeholder URLs. It's designed to handle large collections
 * efficiently and provide detailed reporting.
 * 
 * Using .mjs extension for explicit ES Module support.
 */

// Import Firebase Admin SDK using ES Module syntax
import { initializeApp, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { v4 as uuidv4 } from 'uuid';

// Default placeholder images to use when replacing blob URLs
const DEFAULT_PLACEHOLDERS = {
  image: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  video: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/video-placeholder.mp4',
  avatar: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/avatar-placeholder.png',
  thumbnail: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/thumbnail-placeholder.jpg',
  yacht: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  addon: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/addon-placeholder.jpg',
};

// Collection to store blob URL resolution reports
const REPORTS_COLLECTION = 'blob_url_reports';

/**
 * Initialize Firebase Admin app if not already initialized
 * This is designed to work when imported as an ES module
 */
function initializeFirebase() {
  if (getApps().length === 0) {
    try {
      // Initialize with project ID only
      const projectId = process.env.VITE_FIREBASE_PROJECT_ID || 'etoile-yachts';
      console.log(`[${new Date().toISOString()}] Initializing Firebase Admin with project ID: ${projectId}`);
      
      const app = initializeApp({ projectId });
      return getFirestore(app);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error initializing Firebase Admin:`, error);
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
function scanDocumentForBlobUrls(data, path = '') {
  const blobUrls = [];
  
  function scan(obj, currentPath) {
    if (!obj || typeof obj !== 'object') {
      return;
    }
    
    if (Array.isArray(obj)) {
      // Handle arrays
      obj.forEach((item, index) => {
        const newPath = currentPath ? `${currentPath}.[${index}]` : `[${index}]`;
        
        if (typeof item === 'string' && item.startsWith('blob:')) {
          blobUrls.push({
            path: newPath,
            value: item
          });
        } else if (typeof item === 'object' && item !== null) {
          scan(item, newPath);
        }
      });
    } else {
      // Handle objects
      Object.entries(obj).forEach(([key, value]) => {
        const newPath = currentPath ? `${currentPath}.${key}` : key;
        
        if (typeof value === 'string' && value.startsWith('blob:')) {
          blobUrls.push({
            path: newPath,
            value: value
          });
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
 * Update a document to replace blob URLs with placeholders
 */
async function replaceDocumentBlobUrls(docRef, blobUrls) {
  if (blobUrls.length === 0) {
    return { success: true, replacedUrls: 0 };
  }
  
  try {
    // Create update object for each blob URL
    const updates = {};
    
    blobUrls.forEach(({ path, value }) => {
      // Get appropriate placeholder based on field context
      const placeholder = getPlaceholderForContext(path);
      
      // Handle nested paths correctly
      // Convert array notation from path.[0] to path.0 for Firestore updates
      const firestorePath = path.replace(/\.\[(\d+)\]/g, '.$1');
      updates[firestorePath] = placeholder;
    });
    
    // Update the document with all replacements
    await docRef.update(updates);
    
    return {
      success: true,
      replacedUrls: blobUrls.length,
      replacements: blobUrls.map(({ path, value }) => ({
        path,
        from: value,
        to: getPlaceholderForContext(path)
      }))
    };
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error replacing blob URLs:`, error);
    return {
      success: false,
      error: error.message,
      replacedUrls: 0
    };
  }
}

/**
 * Process a collection to resolve blob URLs
 */
async function processCollection(db, collectionName, operationId) {
  console.log(`[${new Date().toISOString()}] Scanning collection ${collectionName}`);
  
  const results = {
    collectionName,
    documentsScanned: 0,
    documentsWithBlobUrls: 0,
    blobUrlsFound: 0,
    blobUrlsReplaced: 0,
    errors: [],
    replacements: []
  };
  
  try {
    // Get all documents in the collection
    const snapshot = await db.collection(collectionName).get();
    results.documentsScanned = snapshot.size;
    
    // Process each document
    for (const doc of snapshot.docs) {
      const data = doc.data();
      const docId = doc.id;
      
      // Find blob URLs in the document
      const blobUrls = scanDocumentForBlobUrls(data);
      
      if (blobUrls.length > 0) {
        results.documentsWithBlobUrls++;
        results.blobUrlsFound += blobUrls.length;
        
        // Replace blob URLs with placeholders
        const updateResult = await replaceDocumentBlobUrls(doc.ref, blobUrls);
        
        if (updateResult.success) {
          results.blobUrlsReplaced += updateResult.replacedUrls;
          results.replacements.push({
            documentId: docId,
            replacements: updateResult.replacements
          });
        } else {
          results.errors.push({
            documentId: docId,
            error: updateResult.error
          });
        }
      }
    }
    
    return results;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error processing collection ${collectionName}:`, error);
    results.errors.push({
      collectionName,
      error: error.message
    });
    return results;
  }
}

/**
 * Save blob URL resolution report to Firestore
 */
async function saveReport(db, report) {
  try {
    const reportId = uuidv4();
    await db.collection(REPORTS_COLLECTION).doc(reportId).set({
      ...report,
      timestamp: Timestamp.now()
    });
    console.log(`[${new Date().toISOString()}] Saved blob URL resolution report with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error saving blob URL resolution report:`, error);
    return null;
  }
}

/**
 * Main function to resolve all blob URLs in the database
 */
export async function resolveAllBlobUrls() {
  const operationId = uuidv4();
  console.log(`[${new Date().toISOString()}] Starting blob URL resolution operation with ID ${operationId}`);
  
  const db = initializeFirebase();
  
  const report = {
    operationId,
    startTime: new Date().toISOString(),
    collectionsScanned: 0,
    totalDocumentsScanned: 0,
    totalDocumentsWithBlobUrls: 0,
    totalBlobUrlsFound: 0,
    totalBlobUrlsReplaced: 0,
    collectionResults: [],
    errors: []
  };
  
  try {
    // Get all collections in the database
    const collections = await db.listCollections();
    const collectionNames = collections.map(collection => collection.id);
    
    console.log(`[${new Date().toISOString()}] Found ${collectionNames.length} collections to scan`);
    report.collectionsScanned = collectionNames.length;
    
    // Process each collection
    for (const collectionName of collectionNames) {
      const collectionResults = await processCollection(db, collectionName, operationId);
      report.collectionResults.push(collectionResults);
      
      // Update aggregated statistics
      report.totalDocumentsScanned += collectionResults.documentsScanned;
      report.totalDocumentsWithBlobUrls += collectionResults.documentsWithBlobUrls;
      report.totalBlobUrlsFound += collectionResults.blobUrlsFound;
      report.totalBlobUrlsReplaced += collectionResults.blobUrlsReplaced;
      
      if (collectionResults.errors.length > 0) {
        report.errors.push(...collectionResults.errors);
      }
    }
    
    // Finalize report
    report.endTime = new Date().toISOString();
    report.durationMs = new Date(report.endTime).getTime() - new Date(report.startTime).getTime();
    report.success = true;
    
    // Save the report
    const reportId = await saveReport(db, report);
    report.reportId = reportId;
    
    console.log(`[${new Date().toISOString()}] Blob URL resolution completed. Found ${report.totalBlobUrlsFound} blob URLs in ${report.totalDocumentsWithBlobUrls} documents and replaced ${report.totalBlobUrlsReplaced}.`);
    
    return report;
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error resolving blob URLs:`, error);
    
    report.endTime = new Date().toISOString();
    report.durationMs = new Date(report.endTime).getTime() - new Date(report.startTime).getTime();
    report.success = false;
    report.error = error.message;
    
    // Save the error report
    const reportId = await saveReport(db, report);
    report.reportId = reportId;
    
    return report;
  }
}