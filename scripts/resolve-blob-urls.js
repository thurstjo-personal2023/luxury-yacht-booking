/**
 * Resolve Blob URLs Script
 * 
 * This script finds and replaces blob:// URLs in the database with placeholders,
 * as blob URLs are client-side only and cannot be accessed server-side.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections to scan for blob URLs
const COLLECTIONS_TO_SCAN = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add-ons',
  'articles_and_guides',
  'event_announcements',
  'test_media_validation' // Our test collection
];

// Fields that might contain media URLs (direct or nested)
const MEDIA_FIELDS = [
  'media',
  'thumbnail',
  'images',
  'videos',
  'coverImage',
  'gallery',
  'virtualTour.scenes',
  'photos'
];

// URL pattern to identify blob URLs
const BLOB_URL_PATTERN = /^blob:/i;

// Placeholder image URL by type
const PLACEHOLDER_URLS = {
  image: 'https://via.placeholder.com/800x600?text=Image+Unavailable',
  video: 'https://static.videezy.com/system/resources/previews/000/005/529/original/Reaviling_Sjusj%C3%B8en_Ski_Senter.mp4'
};

/**
 * Find blob URLs in a document and return paths to update
 * 
 * @param {Object} docData The document data
 * @returns {Array} Array of objects with path and expectedType
 */
function findBlobUrls(docData) {
  const blobPaths = [];
  
  function searchInObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if object is a media object with a blob URL
    if (obj.url && typeof obj.url === 'string' && BLOB_URL_PATTERN.test(obj.url)) {
      blobPaths.push({
        path: path ? `${path}.url` : 'url',
        expectedType: obj.type || 'image', // Default to image if type not specified
        currentUrl: obj.url
      });
      return;
    }
    
    // If object is an array, check each item
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        searchInObject(item, path ? `${path}[${index}]` : `[${index}]`);
      });
      return;
    }
    
    // Check each property of the object
    for (const key in obj) {
      if (MEDIA_FIELDS.includes(key) || key === 'scenes') {
        searchInObject(obj[key], path ? `${path}.${key}` : key);
      } else if (typeof obj[key] === 'object') {
        // For other objects, only go one level deep to avoid excessive recursion
        if (!path.includes('.')) {
          searchInObject(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }
  }
  
  searchInObject(docData);
  return blobPaths;
}

/**
 * Update a document to replace blob URLs with placeholders
 * 
 * @param {string} collectionName Collection name
 * @param {string} docId Document ID
 * @param {Array} blobPaths Array of paths with blob URLs to replace
 * @returns {Promise<Object>} Update result
 */
async function updateBlobUrls(collectionName, docId, blobPaths) {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const batch = db.batch();
    
    const updates = {};
    const resolutions = [];
    
    for (const { path, expectedType, currentUrl } of blobPaths) {
      // Get placeholder URL based on expected type
      const placeholderUrl = PLACEHOLDER_URLS[expectedType] || PLACEHOLDER_URLS.image;
      
      // Set the new URL in the updates object
      updates[path] = placeholderUrl;
      
      // Add to resolutions for reporting
      resolutions.push({
        path,
        original: currentUrl,
        replacement: placeholderUrl,
        expectedType
      });
    }
    
    // Update the document
    batch.update(docRef, updates);
    await batch.commit();
    
    return {
      success: true,
      docId,
      collectionName,
      resolutions
    };
  } catch (error) {
    console.error(`Error updating blob URLs for ${collectionName}/${docId}:`, error);
    return {
      success: false,
      docId,
      collectionName,
      error: error.message
    };
  }
}

/**
 * Resolve all blob URLs in the database
 * 
 * @returns {Promise<Object>} Resolution results
 */
async function resolveAllBlobUrls() {
  const startTime = Date.now();
  
  const results = {
    successful: [],
    failed: [],
    stats: {
      totalDocs: 0,
      docsWithBlobs: 0,
      totalBlobs: 0,
      totalResolved: 0,
      totalFailed: 0,
      collections: {}
    },
    executionTime: 0
  };
  
  try {
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      console.log(`Scanning collection ${collectionName} for blob URLs...`);
      
      // Initialize collection stats
      results.stats.collections[collectionName] = {
        docs: 0,
        docsWithBlobs: 0,
        blobsFound: 0,
        blobsResolved: 0,
        blobsFailed: 0
      };
      
      const querySnapshot = await db.collection(collectionName).get();
      results.stats.collections[collectionName].docs = querySnapshot.size;
      results.stats.totalDocs += querySnapshot.size;
      
      for (const doc of querySnapshot.docs) {
        const docData = doc.data();
        const blobPaths = findBlobUrls(docData);
        
        if (blobPaths.length > 0) {
          results.stats.collections[collectionName].docsWithBlobs++;
          results.stats.collections[collectionName].blobsFound += blobPaths.length;
          results.stats.docsWithBlobs++;
          results.stats.totalBlobs += blobPaths.length;
          
          // Update the document with placeholder URLs
          const updateResult = await updateBlobUrls(collectionName, doc.id, blobPaths);
          
          if (updateResult.success) {
            results.successful.push(updateResult);
            results.stats.collections[collectionName].blobsResolved += blobPaths.length;
            results.stats.totalResolved += blobPaths.length;
          } else {
            results.failed.push(updateResult);
            results.stats.collections[collectionName].blobsFailed += blobPaths.length;
            results.stats.totalFailed += blobPaths.length;
          }
        }
      }
    }
    
    results.executionTime = Date.now() - startTime;
    
    // Save the results to Firestore for reference
    await saveResolutionResults(results);
    
    return results;
  } catch (error) {
    console.error('Error resolving blob URLs:', error);
    throw error;
  }
}

/**
 * Save blob URL resolution results to Firestore
 * 
 * @param {Object} results Resolution results
 * @returns {Promise<string>} ID of the saved report
 */
async function saveResolutionResults(results) {
  try {
    const reportId = uuidv4();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Create a summary of the results
    const summary = {
      id: reportId,
      timestamp,
      totalDocs: results.stats.totalDocs,
      docsWithBlobs: results.stats.docsWithBlobs,
      totalBlobs: results.stats.totalBlobs,
      totalResolved: results.stats.totalResolved,
      totalFailed: results.stats.totalFailed,
      executionTime: results.executionTime,
      collections: results.stats.collections
    };
    
    // Save the summary to Firestore
    await db.collection('blob_url_reports').doc(reportId).set(summary);
    
    // Save successful resolutions
    if (results.successful.length > 0) {
      const batch = db.batch();
      
      results.successful.forEach((resolution, index) => {
        const docRef = db.collection('blob_url_resolutions').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...resolution,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    // Save failed resolutions
    if (results.failed.length > 0) {
      const batch = db.batch();
      
      results.failed.forEach((failure, index) => {
        const docRef = db.collection('blob_url_failures').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...failure,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    console.log(`Blob URL resolution report saved with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('Error saving resolution results:', error);
    throw error;
  }
}

/**
 * Print a summary of the blob URL resolution results
 * 
 * @param {Object} results Resolution results
 */
function printResolutionReport(results) {
  console.log('\n==== BLOB URL RESOLUTION REPORT ====\n');
  
  console.log('Summary:');
  console.log(`- Total documents scanned: ${results.stats.totalDocs}`);
  console.log(`- Documents with blob URLs: ${results.stats.docsWithBlobs}`);
  console.log(`- Total blob URLs found: ${results.stats.totalBlobs}`);
  console.log(`- Blob URLs resolved: ${results.stats.totalResolved}`);
  console.log(`- Blob URLs failed to resolve: ${results.stats.totalFailed}`);
  console.log(`- Execution time: ${results.executionTime / 1000} seconds\n`);
  
  console.log('Collection Details:');
  for (const [collection, stats] of Object.entries(results.stats.collections)) {
    if (stats.blobsFound === 0) continue;
    
    console.log(`\n${collection}:`);
    console.log(`- Documents: ${stats.docs}`);
    console.log(`- Documents with blob URLs: ${stats.docsWithBlobs}`);
    console.log(`- Blob URLs found: ${stats.blobsFound}`);
    console.log(`- Blob URLs resolved: ${stats.blobsResolved}`);
    console.log(`- Blob URLs failed to resolve: ${stats.blobsFailed}`);
  }
  
  console.log('\n==== END OF REPORT ====\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const results = await resolveAllBlobUrls();
    printResolutionReport(results);
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  findBlobUrls,
  resolveAllBlobUrls,
  COLLECTIONS_TO_SCAN
};