/**
 * Repair Broken URLs Script
 * 
 * This script finds and fixes broken URLs in the database, replacing them with
 * appropriate placeholders based on their expected type.
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections to scan for broken URLs
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

// Placeholder URLs by type
const PLACEHOLDER_URLS = {
  image: 'https://via.placeholder.com/800x600?text=Image+Unavailable',
  video: 'https://static.videezy.com/system/resources/previews/000/005/529/original/Reaviling_Sjusj%C3%B8en_Ski_Senter.mp4',
  yacht: 'https://etoile-yachts.replit.app/images/yacht-placeholder.jpg',
  service: 'https://etoile-yachts.replit.app/images/service-placeholder.jpg',
  profile: 'https://etoile-yachts.replit.app/images/user-placeholder.jpg'
};

// Default category placeholders
const DEFAULT_PLACEHOLDER = PLACEHOLDER_URLS.image;

/**
 * Check if a URL is accessible
 * 
 * @param {string} url The URL to check
 * @returns {Promise<boolean>} Whether the URL is accessible
 */
async function isUrlAccessible(url) {
  try {
    // Skip relative URLs and blob URLs (handled by other scripts)
    if (url.startsWith('/') || url.startsWith('blob:')) {
      return false;
    }
    
    // Try to make a HEAD request to check if the URL is accessible
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'EtoileYachts-MediaValidator/1.0'
      },
      timeout: 10000,
      follow: 5 // Follow up to 5 redirects
    }).catch(() => null);
    
    if (response && response.ok) {
      return true;
    }
    
    // If HEAD request fails, try a GET request
    const getResponse = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'EtoileYachts-MediaValidator/1.0'
      },
      timeout: 10000,
      follow: 5
    }).catch(() => null);
    
    return getResponse && getResponse.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Check if a URL's content type matches the expected type
 * 
 * @param {string} url The URL to check
 * @param {string} expectedType The expected media type ('image' or 'video')
 * @returns {Promise<Object>} Result with match and actual type
 */
async function checkContentTypeMatch(url, expectedType) {
  try {
    // Skip relative URLs and blob URLs (handled by other scripts)
    if (url.startsWith('/') || url.startsWith('blob:')) {
      return { 
        match: false, 
        actualType: null, 
        error: 'URL format not supported for content type check'
      };
    }
    
    // Try to get the content type from a HEAD request
    const response = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'EtoileYachts-MediaValidator/1.0'
      },
      timeout: 10000,
      follow: 5
    }).catch(() => null);
    
    if (response && response.ok) {
      const contentType = response.headers.get('content-type') || '';
      
      if (expectedType === 'image' && contentType.includes('image/')) {
        return { match: true, actualType: 'image' };
      }
      
      if (expectedType === 'video' && contentType.includes('video/')) {
        return { match: true, actualType: 'video' };
      }
      
      return { 
        match: false, 
        actualType: contentType.includes('image/') ? 'image' : 
                    contentType.includes('video/') ? 'video' : 'other',
        contentType
      };
    }
    
    // Fall back to checking the file extension
    const extension = url.split('.').pop().toLowerCase();
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
    const videoExtensions = ['mp4', 'mov', 'avi', 'webm', 'mkv', 'm4v'];
    
    if (expectedType === 'image' && imageExtensions.includes(extension)) {
      return { match: true, actualType: 'image' };
    }
    
    if (expectedType === 'video' && videoExtensions.includes(extension)) {
      return { match: true, actualType: 'video' };
    }
    
    return { 
      match: false, 
      actualType: imageExtensions.includes(extension) ? 'image' : 
                  videoExtensions.includes(extension) ? 'video' : 'unknown',
      fromExtension: true
    };
  } catch (error) {
    return { match: false, actualType: null, error: error.message };
  }
}

/**
 * Get appropriate placeholder URL based on context
 * 
 * @param {string} expectedType The expected media type ('image' or 'video')
 * @param {string} collectionName The collection name for context
 * @param {string} path The path in the document
 * @returns {string} The placeholder URL
 */
function getPlaceholderUrl(expectedType, collectionName, path) {
  // If type is explicitly video, use video placeholder
  if (expectedType === 'video') {
    return PLACEHOLDER_URLS.video;
  }
  
  // For yacht-related collections, use yacht placeholder
  if (collectionName.includes('yacht') || path.includes('yacht')) {
    return PLACEHOLDER_URLS.yacht;
  }
  
  // For service-related collections, use service placeholder
  if (collectionName.includes('service') || 
      collectionName.includes('add-on') || 
      collectionName.includes('addon') || 
      path.includes('service')) {
    return PLACEHOLDER_URLS.service;
  }
  
  // For user/profile-related collections, use profile placeholder
  if (collectionName.includes('user') || 
      collectionName.includes('profile') || 
      path.includes('profile') || 
      path.includes('avatar')) {
    return PLACEHOLDER_URLS.profile;
  }
  
  // Default to image placeholder
  return PLACEHOLDER_URLS.image;
}

/**
 * Find media URLs in a document and check if they're broken
 * 
 * @param {Object} docData The document data
 * @param {string} collectionName The collection name
 * @returns {Promise<Array>} Array of objects with broken URLs and paths
 */
async function findBrokenUrls(docData, collectionName) {
  const brokenUrls = [];
  
  async function processMediaObject(obj, path) {
    if (!obj || !obj.url || typeof obj.url !== 'string') return false;
    
    const url = obj.url;
    const type = obj.type || 'image';
    
    // Skip URLs that are already handled by other scripts
    if (url.startsWith('/') || url.startsWith('blob:')) {
      return false;
    }
    
    // Check if URL is accessible
    const isAccessible = await isUrlAccessible(url);
    
    if (!isAccessible) {
      brokenUrls.push({
        path: `${path}.url`,
        expectedType: type,
        currentUrl: url,
        reason: 'inaccessible'
      });
      return true;
    }
    
    // Check if content type matches expected type
    const typeCheckResult = await checkContentTypeMatch(url, type);
    
    if (!typeCheckResult.match) {
      brokenUrls.push({
        path: `${path}.url`,
        expectedType: type,
        currentUrl: url,
        reason: 'content_type_mismatch',
        actualType: typeCheckResult.actualType,
        contentType: typeCheckResult.contentType
      });
      return true;
    }
    
    return false;
  }
  
  async function searchInObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if object is a media object with URL
    if (obj.url && typeof obj.url === 'string') {
      await processMediaObject(obj, path);
      return;
    }
    
    // If object is an array, check each item
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        await searchInObject(obj[i], path ? `${path}[${i}]` : `[${i}]`);
      }
      return;
    }
    
    // Check each property of the object
    for (const key in obj) {
      if (MEDIA_FIELDS.includes(key) || key === 'scenes') {
        await searchInObject(obj[key], path ? `${path}.${key}` : key);
      } else if (typeof obj[key] === 'object') {
        // For other objects, only go one level deep to avoid excessive recursion
        if (!path.includes('.')) {
          await searchInObject(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }
  }
  
  await searchInObject(docData);
  return brokenUrls;
}

/**
 * Update a document to fix broken URLs
 * 
 * @param {string} collectionName Collection name
 * @param {string} docId Document ID
 * @param {Array} brokenUrlPaths Array of broken URL paths to fix
 * @returns {Promise<Object>} Update result
 */
async function updateBrokenUrls(collectionName, docId, brokenUrlPaths) {
  try {
    const docRef = db.collection(collectionName).doc(docId);
    const batch = db.batch();
    
    const updates = {};
    const repairs = [];
    
    for (const { path, expectedType, currentUrl, reason, actualType } of brokenUrlPaths) {
      let replacementUrl;
      
      if (reason === 'content_type_mismatch' && actualType) {
        // If we know the actual type, we can fix it by updating the type field
        // Get the parent path (remove .url suffix)
        const parentPath = path.substring(0, path.length - 4);
        updates[`${parentPath}.type`] = actualType;
        
        // Add to repairs for reporting
        repairs.push({
          path,
          original: currentUrl,
          replacement: currentUrl, // URL stays the same
          expectedType,
          actualType,
          fix: 'type_correction'
        });
      } else {
        // Get appropriate placeholder
        replacementUrl = getPlaceholderUrl(expectedType, collectionName, path);
        
        // Set the new URL in the updates object
        updates[path] = replacementUrl;
        
        // Add to repairs for reporting
        repairs.push({
          path,
          original: currentUrl,
          replacement: replacementUrl,
          expectedType,
          reason
        });
      }
    }
    
    // Update the document if there are updates
    if (Object.keys(updates).length > 0) {
      batch.update(docRef, updates);
      await batch.commit();
    }
    
    return {
      success: true,
      docId,
      collectionName,
      repairs
    };
  } catch (error) {
    console.error(`Error updating broken URLs for ${collectionName}/${docId}:`, error);
    return {
      success: false,
      docId,
      collectionName,
      error: error.message
    };
  }
}

/**
 * Repair all broken URLs in the database
 * 
 * @returns {Promise<Object>} Repair results
 */
async function repairAllBrokenUrls() {
  const startTime = Date.now();
  
  const results = {
    successful: [],
    failed: [],
    stats: {
      totalDocs: 0,
      docsWithBrokenUrls: 0,
      totalBrokenUrls: 0,
      totalRepaired: 0,
      totalFailed: 0,
      collections: {}
    },
    executionTime: 0
  };
  
  try {
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      console.log(`Scanning collection ${collectionName} for broken URLs...`);
      
      // Initialize collection stats
      results.stats.collections[collectionName] = {
        docs: 0,
        docsWithBrokenUrls: 0,
        brokenUrlsFound: 0,
        brokenUrlsRepaired: 0,
        brokenUrlsFailed: 0
      };
      
      const querySnapshot = await db.collection(collectionName).get();
      results.stats.collections[collectionName].docs = querySnapshot.size;
      results.stats.totalDocs += querySnapshot.size;
      
      for (const doc of querySnapshot.docs) {
        const docData = doc.data();
        const brokenUrlPaths = await findBrokenUrls(docData, collectionName);
        
        if (brokenUrlPaths.length > 0) {
          results.stats.collections[collectionName].docsWithBrokenUrls++;
          results.stats.collections[collectionName].brokenUrlsFound += brokenUrlPaths.length;
          results.stats.docsWithBrokenUrls++;
          results.stats.totalBrokenUrls += brokenUrlPaths.length;
          
          // Update the document with fixed URLs
          const updateResult = await updateBrokenUrls(collectionName, doc.id, brokenUrlPaths);
          
          if (updateResult.success) {
            results.successful.push(updateResult);
            results.stats.collections[collectionName].brokenUrlsRepaired += brokenUrlPaths.length;
            results.stats.totalRepaired += brokenUrlPaths.length;
          } else {
            results.failed.push(updateResult);
            results.stats.collections[collectionName].brokenUrlsFailed += brokenUrlPaths.length;
            results.stats.totalFailed += brokenUrlPaths.length;
          }
        }
      }
    }
    
    results.executionTime = Date.now() - startTime;
    
    // Save the results to Firestore for reference
    await saveRepairResults(results);
    
    return results;
  } catch (error) {
    console.error('Error repairing broken URLs:', error);
    throw error;
  }
}

/**
 * Save broken URL repair results to Firestore
 * 
 * @param {Object} results Repair results
 * @returns {Promise<string>} ID of the saved report
 */
async function saveRepairResults(results) {
  try {
    const reportId = uuidv4();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Create a summary of the results
    const summary = {
      id: reportId,
      timestamp,
      totalDocs: results.stats.totalDocs,
      docsWithBrokenUrls: results.stats.docsWithBrokenUrls,
      totalBrokenUrls: results.stats.totalBrokenUrls,
      totalRepaired: results.stats.totalRepaired,
      totalFailed: results.stats.totalFailed,
      executionTime: results.executionTime,
      collections: results.stats.collections
    };
    
    // Save the summary to Firestore
    await db.collection('url_repair_reports').doc(reportId).set(summary);
    
    // Save successful repairs
    if (results.successful.length > 0) {
      const batch = db.batch();
      
      results.successful.forEach((repair, index) => {
        const docRef = db.collection('url_repairs').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...repair,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    // Save failed repairs
    if (results.failed.length > 0) {
      const batch = db.batch();
      
      results.failed.forEach((failure, index) => {
        const docRef = db.collection('url_repair_failures').doc(`${reportId}_${index}`);
        batch.set(docRef, {
          ...failure,
          reportId,
          timestamp
        });
      });
      
      await batch.commit();
    }
    
    console.log(`Broken URL repair report saved with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('Error saving repair results:', error);
    throw error;
  }
}

/**
 * Print a summary of the broken URL repair results
 * 
 * @param {Object} results Repair results
 */
function printRepairReport(results) {
  console.log('\n==== BROKEN URL REPAIR REPORT ====\n');
  
  console.log('Summary:');
  console.log(`- Total documents scanned: ${results.stats.totalDocs}`);
  console.log(`- Documents with broken URLs: ${results.stats.docsWithBrokenUrls}`);
  console.log(`- Total broken URLs found: ${results.stats.totalBrokenUrls}`);
  console.log(`- Broken URLs repaired: ${results.stats.totalRepaired}`);
  console.log(`- Broken URLs failed to repair: ${results.stats.totalFailed}`);
  console.log(`- Execution time: ${results.executionTime / 1000} seconds\n`);
  
  console.log('Collection Details:');
  for (const [collection, stats] of Object.entries(results.stats.collections)) {
    if (stats.brokenUrlsFound === 0) continue;
    
    console.log(`\n${collection}:`);
    console.log(`- Documents: ${stats.docs}`);
    console.log(`- Documents with broken URLs: ${stats.docsWithBrokenUrls}`);
    console.log(`- Broken URLs found: ${stats.brokenUrlsFound}`);
    console.log(`- Broken URLs repaired: ${stats.brokenUrlsRepaired}`);
    console.log(`- Broken URLs failed to repair: ${stats.brokenUrlsFailed}`);
  }
  
  console.log('\n==== END OF REPORT ====\n');
}

/**
 * Main function
 */
async function main() {
  try {
    const results = await repairAllBrokenUrls();
    printRepairReport(results);
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
  isUrlAccessible,
  checkContentTypeMatch,
  repairAllBrokenUrls,
  COLLECTIONS_TO_SCAN
};