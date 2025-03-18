/**
 * Media URL Validation Script
 * 
 * This script validates media URLs in Firestore collections to ensure they are:
 * 1. Accessible (return 200 OK)
 * 2. Match their declared content type (image/video)
 * 3. Not relative or blob URLs
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Collections to scan for media URLs
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

// URL patterns to identify probable blob URLs
const BLOB_URL_PATTERN = /^blob:/i;

// URL patterns to identify relative URLs
const RELATIVE_URL_PATTERN = /^\/[^\/]/;

// Helper function to determine if a URL points to an image
function isImageUrl(url) {
  // Check file extension
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.tiff'].includes(extension);
}

// Helper function to determine if a URL points to a video
function isVideoUrl(url) {
  // Check file extension
  const extension = path.extname(new URL(url).pathname).toLowerCase();
  return ['.mp4', '.mov', '.avi', '.wmv', '.flv', '.webm', '.mkv', '.m4v'].includes(extension);
}

/**
 * Validate a single media URL
 * 
 * @param {string} url The URL to validate
 * @param {string} expectedType The expected media type ('image' or 'video')
 * @returns {Promise<object>} Validation result with status and details
 */
async function validateUrl(url, expectedType = null) {
  try {
    // Validate URL format
    if (!url || typeof url !== 'string') {
      return {
        valid: false,
        status: 'invalid_format',
        message: 'URL is not a valid string'
      };
    }
    
    // Check for blob URLs
    if (BLOB_URL_PATTERN.test(url)) {
      return {
        valid: false,
        status: 'blob_url',
        message: 'URL is a blob URL which cannot be accessed server-side'
      };
    }
    
    // Check for relative URLs
    if (RELATIVE_URL_PATTERN.test(url)) {
      return {
        valid: false,
        status: 'relative_url',
        message: 'URL is a relative URL which needs a base URL'
      };
    }
    
    // Attempt to make URL valid for fetch
    let fetchUrl = url;
    try {
      // This will throw if URL is invalid
      new URL(fetchUrl); 
    } catch (error) {
      return {
        valid: false,
        status: 'malformed_url',
        message: `URL is malformed: ${error.message}`
      };
    }
    
    // Fetch the URL with a HEAD request first (more efficient)
    const headResponse = await fetch(fetchUrl, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'EtoileYachts-MediaValidator/1.0'
      },
      timeout: 10000, // 10 second timeout
      follow: 5 // Follow up to 5 redirects
    }).catch(error => {
      // Some servers don't support HEAD requests, continue with GET
      return null;
    });
    
    // If HEAD request worked, check the status
    if (headResponse && headResponse.ok) {
      const contentType = headResponse.headers.get('content-type') || '';
      
      // Check content type against expected type
      if (expectedType) {
        if (expectedType === 'image' && !contentType.includes('image/')) {
          return {
            valid: false,
            status: 'content_type_mismatch',
            message: `Expected image but got: ${contentType}`,
            actualType: contentType.includes('video/') ? 'video' : 'other'
          };
        }
        
        if (expectedType === 'video' && !contentType.includes('video/')) {
          return {
            valid: false,
            status: 'content_type_mismatch',
            message: `Expected video but got: ${contentType}`,
            actualType: contentType.includes('image/') ? 'image' : 'other'
          };
        }
      }
      
      return {
        valid: true,
        status: 'ok',
        contentType
      };
    }
    
    // If HEAD request failed or wasn't available, try a GET request
    const getResponse = await fetch(fetchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'EtoileYachts-MediaValidator/1.0'
      },
      timeout: 10000, // 10 second timeout
      follow: 5 // Follow up to 5 redirects
    });
    
    if (getResponse.ok) {
      const contentType = getResponse.headers.get('content-type') || '';
      
      // Check content type against expected type
      if (expectedType) {
        if (expectedType === 'image' && !contentType.includes('image/')) {
          if (isImageUrl(url)) {
            // If URL looks like an image but content type doesn't match, trust the URL
            return {
              valid: true,
              status: 'ok_extension_override',
              message: `URL has image extension but server returned: ${contentType}`,
              contentType: 'image/*'
            };
          }
          
          return {
            valid: false,
            status: 'content_type_mismatch',
            message: `Expected image but got: ${contentType}`,
            actualType: contentType.includes('video/') ? 'video' : 'other'
          };
        }
        
        if (expectedType === 'video' && !contentType.includes('video/')) {
          if (isVideoUrl(url)) {
            // If URL looks like a video but content type doesn't match, trust the URL
            return {
              valid: true,
              status: 'ok_extension_override',
              message: `URL has video extension but server returned: ${contentType}`,
              contentType: 'video/*'
            };
          }
          
          return {
            valid: false,
            status: 'content_type_mismatch',
            message: `Expected video but got: ${contentType}`,
            actualType: contentType.includes('image/') ? 'image' : 'other'
          };
        }
      }
      
      return {
        valid: true,
        status: 'ok',
        contentType
      };
    } else {
      return {
        valid: false,
        status: `http_error_${getResponse.status}`,
        message: `HTTP error: ${getResponse.status} ${getResponse.statusText}`
      };
    }
  } catch (error) {
    return {
      valid: false,
      status: 'request_failed',
      message: `Request failed: ${error.message}`
    };
  }
}

/**
 * Extract media URLs from a document
 * 
 * @param {Object} doc The Firestore document data
 * @returns {Array} Array of media objects with URLs and types
 */
function extractMediaUrls(doc) {
  const mediaUrls = [];
  
  function extractFromObject(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if the object is a media object with URL and type
    if (obj.url && typeof obj.url === 'string' && (obj.type === 'image' || obj.type === 'video')) {
      mediaUrls.push({
        url: obj.url,
        type: obj.type,
        path: path ? `${path}.url` : 'url'
      });
      return;
    }
    
    // If object is an array, check each item
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        extractFromObject(item, path ? `${path}[${index}]` : `[${index}]`);
      });
      return;
    }
    
    // Check each property of the object
    for (const key in obj) {
      if (MEDIA_FIELDS.includes(key) || key === 'scenes') {
        extractFromObject(obj[key], path ? `${path}.${key}` : key);
      } else if (typeof obj[key] === 'object') {
        // For other objects, only go one level deep to avoid excessive recursion
        if (!path.includes('.')) {
          extractFromObject(obj[key], path ? `${path}.${key}` : key);
        }
      }
    }
  }
  
  extractFromObject(doc);
  return mediaUrls;
}

/**
 * Validate all media URLs in the specified collections
 * 
 * @returns {Promise<Object>} Validation results
 */
async function validateMediaUrls() {
  const startTime = Date.now();
  
  const results = {
    valid: [],
    invalid: [],
    missing: [],
    blob: [],
    relative: [],
    stats: {
      totalDocs: 0,
      totalUrls: 0,
      validUrls: 0,
      invalidUrls: 0,
      missingUrls: 0,
      blobUrls: 0,
      relativeUrls: 0,
      collections: {}
    }
  };
  
  try {
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      console.log(`Scanning collection: ${collectionName}...`);
      
      // Initialize collection stats
      results.stats.collections[collectionName] = {
        docs: 0,
        urls: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0,
        blobUrls: 0,
        relativeUrls: 0
      };
      
      const querySnapshot = await db.collection(collectionName).get();
      results.stats.collections[collectionName].docs = querySnapshot.size;
      results.stats.totalDocs += querySnapshot.size;
      
      for (const doc of querySnapshot.docs) {
        const docData = doc.data();
        const mediaUrls = extractMediaUrls(docData);
        
        results.stats.collections[collectionName].urls += mediaUrls.length;
        results.stats.totalUrls += mediaUrls.length;
        
        for (const media of mediaUrls) {
          const { url, type, path } = media;
          
          // Skip empty URLs
          if (!url || url.trim() === '') {
            results.missing.push({
              collectionName,
              docId: doc.id,
              path,
              expectedType: type
            });
            
            results.stats.collections[collectionName].missingUrls++;
            results.stats.missingUrls++;
            continue;
          }
          
          // Check for blob URLs
          if (BLOB_URL_PATTERN.test(url)) {
            results.blob.push({
              collectionName,
              docId: doc.id,
              url,
              path,
              expectedType: type
            });
            
            results.stats.collections[collectionName].blobUrls++;
            results.stats.blobUrls++;
            continue;
          }
          
          // Check for relative URLs
          if (RELATIVE_URL_PATTERN.test(url)) {
            results.relative.push({
              collectionName,
              docId: doc.id,
              url,
              path,
              expectedType: type
            });
            
            results.stats.collections[collectionName].relativeUrls++;
            results.stats.relativeUrls++;
            continue;
          }
          
          // Validate URL
          try {
            const validationResult = await validateUrl(url, type);
            
            if (validationResult.valid) {
              results.valid.push({
                collectionName,
                docId: doc.id,
                url,
                path,
                expectedType: type,
                contentType: validationResult.contentType
              });
              
              results.stats.collections[collectionName].validUrls++;
              results.stats.validUrls++;
            } else {
              results.invalid.push({
                collectionName,
                docId: doc.id,
                url,
                path,
                expectedType: type,
                error: validationResult.status,
                message: validationResult.message,
                actualType: validationResult.actualType
              });
              
              results.stats.collections[collectionName].invalidUrls++;
              results.stats.invalidUrls++;
            }
          } catch (error) {
            results.invalid.push({
              collectionName,
              docId: doc.id,
              url,
              path,
              expectedType: type,
              error: 'validation_error',
              message: error.message
            });
            
            results.stats.collections[collectionName].invalidUrls++;
            results.stats.invalidUrls++;
          }
        }
      }
    }
    
    // Add execution time
    results.executionTime = Date.now() - startTime;
    
    return results;
  } catch (error) {
    console.error('Error validating media URLs:', error);
    throw error;
  }
}

/**
 * Print a report of the validation results
 * 
 * @param {Object} results Validation results from validateMediaUrls()
 */
function printMediaValidationReport(results) {
  console.log('\n==== MEDIA URL VALIDATION REPORT ====\n');
  
  console.log('Summary:');
  console.log(`- Total documents scanned: ${results.stats.totalDocs}`);
  console.log(`- Total URLs found: ${results.stats.totalUrls}`);
  console.log(`- Valid URLs: ${results.stats.validUrls} (${Math.round(results.stats.validUrls / results.stats.totalUrls * 100)}%)`);
  console.log(`- Invalid URLs: ${results.stats.invalidUrls} (${Math.round(results.stats.invalidUrls / results.stats.totalUrls * 100)}%)`);
  console.log(`- Missing URLs: ${results.stats.missingUrls} (${Math.round(results.stats.missingUrls / results.stats.totalUrls * 100)}%)`);
  console.log(`- Blob URLs: ${results.stats.blobUrls} (${Math.round(results.stats.blobUrls / results.stats.totalUrls * 100)}%)`);
  console.log(`- Relative URLs: ${results.stats.relativeUrls} (${Math.round(results.stats.relativeUrls / results.stats.totalUrls * 100)}%)`);
  console.log(`- Execution time: ${results.executionTime / 1000} seconds\n`);
  
  console.log('Collection Details:');
  for (const [collection, stats] of Object.entries(results.stats.collections)) {
    if (stats.docs === 0) continue;
    
    console.log(`\n${collection}:`);
    console.log(`- Documents: ${stats.docs}`);
    console.log(`- URLs: ${stats.urls}`);
    console.log(`- Valid: ${stats.validUrls} (${Math.round(stats.validUrls / (stats.urls || 1) * 100)}%)`);
    console.log(`- Invalid: ${stats.invalidUrls} (${Math.round(stats.invalidUrls / (stats.urls || 1) * 100)}%)`);
    console.log(`- Missing: ${stats.missingUrls} (${Math.round(stats.missingUrls / (stats.urls || 1) * 100)}%)`);
    console.log(`- Blob: ${stats.blobUrls} (${Math.round(stats.blobUrls / (stats.urls || 1) * 100)}%)`);
    console.log(`- Relative: ${stats.relativeUrls} (${Math.round(stats.relativeUrls / (stats.urls || 1) * 100)}%)`);
  }
  
  // Print examples of issues if they exist
  if (results.invalid.length > 0) {
    console.log('\nExample Invalid URLs:');
    results.invalid.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.url} (${item.collectionName}/${item.docId}) - ${item.message}`);
    });
  }
  
  if (results.blob.length > 0) {
    console.log('\nExample Blob URLs:');
    results.blob.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.url} (${item.collectionName}/${item.docId})`);
    });
  }
  
  if (results.relative.length > 0) {
    console.log('\nExample Relative URLs:');
    results.relative.slice(0, 5).forEach((item, index) => {
      console.log(`${index + 1}. ${item.url} (${item.collectionName}/${item.docId})`);
    });
  }
  
  console.log('\n==== END OF REPORT ====\n');
}

/**
 * Save the validation results to Firestore
 * 
 * @param {Object} results Validation results from validateMediaUrls()
 * @returns {Promise<string>} The ID of the saved report
 */
async function saveMediaValidationResults(results) {
  try {
    const reportId = uuidv4();
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Create a summary of the results
    const summary = {
      id: reportId,
      timestamp,
      totalDocs: results.stats.totalDocs,
      totalUrls: results.stats.totalUrls,
      validUrls: results.stats.validUrls,
      invalidUrls: results.stats.invalidUrls,
      missingUrls: results.stats.missingUrls,
      blobUrls: results.stats.blobUrls,
      relativeUrls: results.stats.relativeUrls,
      executionTime: results.executionTime,
      collections: results.stats.collections
    };
    
    // Save the summary in a reports collection
    await db.collection('media_validation_reports').doc(reportId).set(summary);
    
    // Save the detailed results in separate collections to avoid large documents
    const invalidBatch = db.batch();
    results.invalid.forEach((item, index) => {
      const docRef = db.collection('media_validation_invalid').doc(`${reportId}_${index}`);
      invalidBatch.set(docRef, {
        ...item,
        reportId,
        timestamp
      });
    });
    
    const blobBatch = db.batch();
    results.blob.forEach((item, index) => {
      const docRef = db.collection('media_validation_blob').doc(`${reportId}_${index}`);
      blobBatch.set(docRef, {
        ...item,
        reportId,
        timestamp
      });
    });
    
    const relativeBatch = db.batch();
    results.relative.forEach((item, index) => {
      const docRef = db.collection('media_validation_relative').doc(`${reportId}_${index}`);
      relativeBatch.set(docRef, {
        ...item,
        reportId,
        timestamp
      });
    });
    
    // Only commit if there are items to save
    if (results.invalid.length > 0) await invalidBatch.commit();
    if (results.blob.length > 0) await blobBatch.commit();
    if (results.relative.length > 0) await relativeBatch.commit();
    
    console.log(`Validation report saved with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('Error saving validation results:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const results = await validateMediaUrls();
    printMediaValidationReport(results);
    await saveMediaValidationResults(results);
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
  validateUrl,
  validateMediaUrls,
  printMediaValidationReport,
  saveMediaValidationResults,
  COLLECTIONS_TO_SCAN
};