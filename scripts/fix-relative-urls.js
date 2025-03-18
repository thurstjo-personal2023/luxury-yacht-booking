/**
 * Fix Relative URLs Script
 * 
 * This script finds and fixes relative URLs in the database by converting them
 * to absolute URLs with the proper base URL.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections to scan for relative URLs
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

// URL pattern to identify relative URLs
const RELATIVE_URL_PATTERN = /^\/[^\/]/;

// Base URL for the application
const BASE_URL = 'https://etoile-yachts.replit.app';

// Special file paths that should use static asset URLs
const STATIC_ASSET_PATHS = {
  '/yacht-placeholder.jpg': `${BASE_URL}/images/yacht-placeholder.jpg`,
  '/service-placeholder.jpg': `${BASE_URL}/images/service-placeholder.jpg`,
  '/product-placeholder.jpg': `${BASE_URL}/images/product-placeholder.jpg`,
  '/user-placeholder.jpg': `${BASE_URL}/images/user-placeholder.jpg`,
  '/partner-placeholder.jpg': `${BASE_URL}/images/partner-placeholder.jpg`,
};

/**
 * Find relative URLs in a document and return paths to update
 * 
 * @param {Object} docData The document data
 * @returns {Array} Array of objects with path and currentUrl
 */
function findRelativeUrls(docData) {
  const relativePaths = [];
  
  function searchInObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if object is a media object with a relative URL
    if (obj.url && typeof obj.url === 'string' && RELATIVE_URL_PATTERN.test(obj.url)) {
      relativePaths.push({
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
  return relativePaths;
}

/**
 * Convert a relative URL to absolute
 * 
 * @param {string} relativeUrl The relative URL
 * @param {string} expectedType The expected media type ('image' or 'video')
 * @returns {string} The absolute URL
 */
function toAbsoluteUrl(relativeUrl, expectedType) {
  // Check if the URL is in our special paths map
  if (STATIC_ASSET_PATHS[relativeUrl]) {
    return STATIC_ASSET_PATHS[relativeUrl];
  }
  
  // Check if it's a special placeholder path like "/images/placeholder.jpg"
  if (relativeUrl.includes('placeholder')) {
    if (expectedType === 'video') {
      return `${BASE_URL}/videos/placeholder.mp4`;
    } else {
      return `${BASE_URL}/images/placeholder.jpg`;
    }
  }
  
  // Check if it's a path to a static asset directory
  if (relativeUrl.startsWith('/images/') || 
      relativeUrl.startsWith('/img/') ||
      relativeUrl.startsWith('/assets/images/')) {
    return `${BASE_URL}${relativeUrl}`;
  }
  
  if (relativeUrl.startsWith('/videos/') || 
      relativeUrl.startsWith('/video/') ||
      relativeUrl.startsWith('/assets/videos/')) {
    return `${BASE_URL}${relativeUrl}`;
  }
  
  // For all other paths, join with the base URL
  return `${BASE_URL}${relativeUrl}`;
}

/**
 * Update a document to fix relative URLs
 * 
 * @param {string} collectionName Collection name
 * @param {string} docId Document ID
 * @param {Array} relativePaths Array of paths with relative URLs to fix
 * @returns {Promise<Object>} Update result
 */
async function updateRelativeUrls(collectionName, docId, relativePaths) {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const batch = db.batch();
    
    const updates = {};
    const fixes = [];
    
    for (const { path, expectedType, currentUrl } of relativePaths) {
      // Convert to absolute URL
      const absoluteUrl = toAbsoluteUrl(currentUrl, expectedType);
      
      // Set the new URL in the updates object
      updates[path] = absoluteUrl;
      
      // Add to fixes for reporting
      fixes.push({
        path,
        original: currentUrl,
        fixed: absoluteUrl,
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
      fixes
    };
  } catch (error) {
    console.error(`Error fixing relative URLs for ${collectionName}/${docId}:`, error);
    return {
      success: false,
      docId,
      collectionName,
      error: error.message
    };
  }
}

/**
 * Fix all relative URLs in the database
 * 
 * @returns {Promise<Object>} Fix results
 */
async function fixRelativeUrls() {
  const startTime = Date.now();
  
  const results = {
    successful: [],
    failed: [],
    stats: {
      totalDocs: 0,
      docsWithRelatives: 0,
      totalRelatives: 0,
      totalFixed: 0,
      totalFailed: 0,
      collections: {}
    },
    executionTime: 0
  };
  
  try {
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      console.log(`Scanning collection ${collectionName} for relative URLs...`);
      
      // Initialize collection stats
      results.stats.collections[collectionName] = {
        docs: 0,
        docsWithRelatives: 0,
        relativesFound: 0,
        relativesFixed: 0,
        relativesFailed: 0
      };
      
      const querySnapshot = await db.collection(collectionName).get();
      results.stats.collections[collectionName].docs = querySnapshot.size;
      results.stats.totalDocs += querySnapshot.size;
      
      for (const doc of querySnapshot.docs) {
        const docData = doc.data();
        const relativePaths = findRelativeUrls(docData);
        
        if (relativePaths.length > 0) {
          results.stats.collections[collectionName].docsWithRelatives++;
          results.stats.collections[collectionName].relativesFound += relativePaths.length;
          results.stats.docsWithRelatives++;
          results.stats.totalRelatives += relativePaths.length;
          
          // Update the document with absolute URLs
          const updateResult = await updateRelativeUrls(collectionName, doc.id, relativePaths);
          
          if (updateResult.success) {
            results.successful.push(updateResult);
            results.stats.collections[collectionName].relativesFixed += relativePaths.length;
            results.stats.totalFixed += relativePaths.length;
          } else {
            results.failed.push(updateResult);
            results.stats.collections[collectionName].relativesFailed += relativePaths.length;
            results.stats.totalFailed += relativePaths.length;
          }
        }
      }
    }
    
    results.executionTime = Date.now() - startTime;
    
    // Save the results to Firestore for reference
    await saveFixResults(results);
    
    return results;
  } catch (error) {
    console.error('Error fixing relative URLs:', error);
    throw error;
  }
}

/**
 * Save relative URL fix results to Firestore
 * 
 * @param {Object} results Fix results
 * @returns {Promise<string>} ID of the saved report
 */
async function saveFixResults(results) {
  try {
    const reportId = uuidv4();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Create a summary of the results
    const summary = {
      id: reportId,
      timestamp,
      totalDocs: results.stats.totalDocs,
      docsWithRelatives: results.stats.docsWithRelatives,
      totalRelatives: results.stats.totalRelatives,
      totalFixed: results.stats.totalFixed,
      totalFailed: results.stats.totalFailed,
      executionTime: results.executionTime,
      collections: results.stats.collections
    };
    
    // Save the summary to Firestore
    await db.collection('relative_url_reports').doc(reportId).set(summary);
    
    // Save successful fixes
    if (results.successful.length > 0) {
      const batch = db.batch();
      
      results.successful.forEach((fix, index) => {
        const docRef = db.collection('relative_url_fixes').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...fix,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    // Save failed fixes
    if (results.failed.length > 0) {
      const batch = db.batch();
      
      results.failed.forEach((failure, index) => {
        const docRef = db.collection('relative_url_failures').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...failure,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    console.log(`Relative URL fix report saved with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('Error saving fix results:', error);
    throw error;
  }
}

/**
 * Print a summary of the relative URL fix results
 * 
 * @param {Object} results Fix results
 */
function printFixReport(results) {
  console.log('\n==== RELATIVE URL FIX REPORT ====\n');
  
  console.log('Summary:');
  console.log(`- Total documents scanned: ${results.stats.totalDocs}`);
  console.log(`- Documents with relative URLs: ${results.stats.docsWithRelatives}`);
  console.log(`- Total relative URLs found: ${results.stats.totalRelatives}`);
  console.log(`- Relative URLs fixed: ${results.stats.totalFixed}`);
  console.log(`- Relative URLs failed to fix: ${results.stats.totalFailed}`);
  console.log(`- Execution time: ${results.executionTime / 1000} seconds\n`);
  
  console.log('Collection Details:');
  for (const [collection, stats] of Object.entries(results.stats.collections)) {
    if (stats.relativesFound === 0) continue;
    
    console.log(`\n${collection}:`);
    console.log(`- Documents: ${stats.docs}`);
    console.log(`- Documents with relative URLs: ${stats.docsWithRelatives}`);
    console.log(`- Relative URLs found: ${stats.relativesFound}`);
    console.log(`- Relative URLs fixed: ${stats.relativesFixed}`);
    console.log(`- Relative URLs failed to fix: ${stats.relativesFailed}`);
  }
  
  console.log('\n==== END OF REPORT ====\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const results = await fixRelativeUrls();
    printFixReport(results);
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
  findRelativeUrls,
  fixRelativeUrls,
  COLLECTIONS_TO_SCAN
};