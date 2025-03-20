/**
 * Run Media Repair Script
 * 
 * This script fixes media URL issues in the database, including:
 * 1. Converting relative URLs to absolute URLs
 * 2. Fixing blob:// URLs
 * 3. Correcting media types (images vs videos)
 * 
 * Usage: node scripts/run-media-repair.js [--collection=collection_name]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const { validateAndRepairMedia } = require('./media-validation-lib');

// Collection names to validate (add more as needed)
const COLLECTIONS_TO_REPAIR = [
  'unified_yacht_experiences',
  'products_add_ons',
  'yacht_profiles',
  'articles_and_guides',
  'event_announcements'
];

// Parse command line arguments
const args = process.argv.slice(2);
let specificCollection = null;
let dryRun = false;

args.forEach(arg => {
  if (arg.startsWith('--collection=')) {
    specificCollection = arg.split('=')[1];
  } else if (arg === '--dry-run') {
    dryRun = true;
  }
});

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require('../firebase-admin-key.json');
} catch (error) {
  console.error('Error loading service account key file:');
  console.error('Please make sure firebase-admin-key.json exists in the root directory');
  console.error('You can download this file from the Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Create the media validation library file if it doesn't exist
 */
function createMediaValidationLib() {
  const libPath = path.join(__dirname, 'media-validation-lib.js');
  
  // Check if the file already exists
  if (fs.existsSync(libPath)) {
    console.log('Media validation library already exists.');
    return;
  }
  
  console.log('Creating media validation library...');
  
  // The validateAndRepairMedia function and its helpers
  const libContent = `// Media validation library extracted from Firebase Functions

// Collection for storing validation reports
const REPORT_COLLECTION = "media_validation_reports";

// Media type patterns for identifying video content
const VIDEO_PATTERNS = [
  "-SBV-",
  "Dynamic motion",
  ".mp4",
  ".mov",
  ".avi",
  ".webm",
  "video/",
];

/**
 * Validate and repair media in a document
 *
 * @param {string} collection - The name of the Firestore collection.
 * @param {string} documentId - The ID of the document to validate and repair.
 * @param {Object} data - The data of the document to validate and repair.
 * @param {Object} admin - The Firebase Admin SDK instance.
 * @param {boolean} dryRun - If true, don't actually update the document.
 * @return {Promise<Object>} An object indicating whether the media was fixed.
 */
async function validateAndRepairMedia(collection, documentId, data, admin, dryRun = false) {
  let fixed = false;
  const updatedData = {...data};

  // Process top-level media array
  fixed = processTopLevelMedia(data, updatedData) || fixed;

  // Process common image URL fields
  fixed = processImageFields(data, updatedData) || fixed;

  // Process virtual tour scenes
  fixed = processVirtualTourScenes(data, updatedData) || fixed;

  // Update document if media was fixed
  if (fixed && !dryRun) {
    try {
      await admin
          .firestore()
          .collection(collection)
          .doc(documentId)
          .update(updatedData);
      console.log(\`Fixed media in \${collection}/\${documentId}\`);

      // Record this fix in the validation reports
      await recordMediaFix(collection, documentId, data, updatedData, admin);
    } catch (error) {
      console.error(
          \`Error updating document \${collection}/\${documentId}:\`, error,
      );
      fixed = false;
    }
  } else if (fixed && dryRun) {
    console.log(\`[DRY RUN] Would fix media in \${collection}/\${documentId}\`);
  }

  return {fixed, updatedData};
}

function processTopLevelMedia(data, updatedData) {
  if (data.media && Array.isArray(data.media)) {
    const {mediaArray, wasFixed} = processMediaArray(data.media);
    if (wasFixed) {
      updatedData.media = mediaArray;
      return true;
    }
  }
  return false;
}

function processImageFields(data, updatedData) {
  const imageFields = [
    "imageUrl",
    "coverImageUrl",
    "thumbnailUrl",
    "profilePhoto",
  ];
  let fixed = false;
  for (const field of imageFields) {
    if (data[field] && typeof data[field] === "string") {
      const {url, wasFixed} = processMediaUrl(data[field], "image");
      if (wasFixed) {
        updatedData[field] = url;
        fixed = true;
      }
    }
  }
  return fixed;
}

function processVirtualTourScenes(data, updatedData) {
  if (data.virtualTour &&
      data.virtualTour.scenes &&
      Array.isArray(data.virtualTour.scenes)) {
    let scenesFixed = false;
    const updatedScenes = data.virtualTour.scenes.map((scene) => {
      const updatedScene = {...scene};

      // Process scene image URL
      if (scene.imageUrl && typeof scene.imageUrl === "string") {
        const {url, wasFixed} = processMediaUrl(scene.imageUrl, "image");
        if (wasFixed) {
          updatedScene.imageUrl = url;
          scenesFixed = true;
        }
      }

      // Process scene thumbnail URL
      if (scene.thumbnailUrl && typeof scene.thumbnailUrl === "string") {
        const {url, wasFixed} = processMediaUrl(scene.thumbnailUrl, "image");
        if (wasFixed) {
          updatedScene.thumbnailUrl = url;
          scenesFixed = true;
        }
      }

      return updatedScene;
    });

    if (scenesFixed) {
      updatedData.virtualTour = {
        ...data.virtualTour,
        scenes: updatedScenes,
      };
      return true;
    }
  }
  return false;
}

/**
 * Process an array of media items.
 *
 * @param {Array<Object>} mediaArray - The array of media items to process.
 * @return {Object} An object containing the updated media array and a flag
 * indicating if any fixes were applied.
 */
function processMediaArray(mediaArray) {
  let wasFixed = false;

  const updatedMedia = mediaArray.map((item) => {
    // Skip items without URL
    if (!item.url) return item;

    // Process the URL
    const {url, wasFixed: urlFixed, detectedType} = processMediaUrl(
        item.url,
        item.type || "image",
    );

    // Return updated item if needed
    if (urlFixed || (detectedType && detectedType !== item.type)) {
      wasFixed = true;
      return {
        ...item,
        url: url,
        type: detectedType || item.type,
      };
    }

    return item;
  });

  return {mediaArray: updatedMedia, wasFixed};
}

/**
 * Process a media URL, fixing relative paths and detecting media types.
 *
 * @param {string} url - The media URL to process.
 * @param {string} declaredType - The declared type of the media
 * (e.g., "image" or "video").
 * @return {Object} An object containing the processed URL,
 * a flag indicating if it was fixed,
 * and the detected media type (if applicable).
 */
function processMediaUrl(url, declaredType) {
  // Skip empty URLs
  if (!url) {
    return {url, wasFixed: false};
  }

  let wasFixed = false;
  let detectedType;
  let processedUrl = url;

  // Fix relative URLs
  if (url.startsWith("/")) {
    // Convert to absolute URL with Replit domain base
    const baseUrl = "https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/";
    processedUrl = \`\${baseUrl}\${url.substring(1)}\`;
    wasFixed = true;
  }

  // Fix blob URLs
  if (url.startsWith("blob:")) {
    // Replace with placeholder
    processedUrl = "https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev/yacht-placeholder.jpg";
    wasFixed = true;
  }

  // Detect if this should be a video based on URL patterns
  if (declaredType === "image" && isLikelyVideo(url)) {
    detectedType = "video";
    wasFixed = true;
  }

  return {url: processedUrl, wasFixed, detectedType};
}

/**
 * Check if a URL is likely a video based on known patterns.
 *
 * @param {string} url - The URL to check.
 * @return {boolean} True if the URL is likely a video, false otherwise.
 */
function isLikelyVideo(url) {
  const lowerUrl = url.toLowerCase();
  return VIDEO_PATTERNS.some((pattern) =>
    lowerUrl.includes(pattern.toLowerCase()),
  );
}

/**
 * Record a media fix in the validation reports collection
 *
 * @param {string} collection - The name of the Firestore collection.
 * @param {string} documentId - The ID of the document being fixed.
 * @param {Object} originalData - The original data before the fix.
 * @param {Object} updatedData - The updated data after the fix.
 * @param {Object} admin - The Firebase Admin SDK instance.
 */
async function recordMediaFix(
    collection, documentId, originalData, updatedData, admin,
) {
  try {
    const timestamp = admin.firestore.Timestamp.now();
    const reportRef = admin.firestore().collection(REPORT_COLLECTION).doc();

    await reportRef.set({
      collection,
      documentId,
      timestamp,
      fixes: {
        relativeUrls: findFixedRelativeUrls(originalData, updatedData),
        mediaTypes: findFixedMediaTypes(originalData, updatedData),
      },
    });
  } catch (error) {
    console.error("Error recording media fix:", error);
  }
}


/**
 * Find URLs that were fixed from relative to absolute.
 *
 * @param {Object} original - The original data object before fixes.
 * @param {Object} updated - The updated data object after fixes.
 * @return {Array<Object>} An array of objects describing the fixed URLs.
 */
function findFixedRelativeUrls(original, updated) {
  const fixes = [];

  // Helper to compare and find fixed URLs
  function compareUrls(originalUrl, updatedUrl, path) {
    if (originalUrl && originalUrl.startsWith("/") &&
        updatedUrl && !updatedUrl.startsWith("/")) {
      fixes.push({
        path,
        original: originalUrl,
        updated: updatedUrl,
      });
    }
  }

  // Check media array
  if (original.media && updated.media &&
        Array.isArray(original.media) && Array.isArray(updated.media)) {
    for (let i = 0; i < original.media.length; i++) {
      if (original.media[i] && updated.media[i]) {
        compareUrls(
            original.media[i].url,
            updated.media[i].url,
            \`media[\${i}].url\`,
        );
      }
    }
  }

  // Check common image fields
  [
    "imageUrl",
    "coverImageUrl",
    "thumbnailUrl",
    "profilePhoto",
  ].forEach((field) => {
    if (original[field] && updated[field]) {
      compareUrls(original[field], updated[field], field);
    }
  });

  return fixes;
}


/**
 * Find media items that had their type fixed.
 *
 * @param {Object} original - The original data object before fixes.
 * @param {Object} updated - The updated data object after fixes.
 * @return {Array<Object>} An array of objects describing the fixed media types.
 */
function findFixedMediaTypes(original, updated) {
  const fixes = [];

  // Check media array
  if (original.media && updated.media &&
      Array.isArray(original.media) && Array.isArray(updated.media)) {
    for (let i = 0; i < original.media.length; i++) {
      if (original.media[i] && updated.media[i] &&
          original.media[i].type !== updated.media[i].type) {
        fixes.push({
          path: \`media[\${i}].type\`,
          original: original.media[i].type,
          updated: updated.media[i].type,
          url: updated.media[i].url,
        });
      }
    }
  }

  return fixes;
}

module.exports = {
  validateAndRepairMedia,
};`;

  fs.writeFileSync(libPath, libContent);
  console.log('Media validation library created successfully.');
}

/**
 * Get documents from a collection
 * 
 * @param {string} collectionName - The collection to get documents from
 * @returns {Promise<Array>} - Array of documents
 */
async function getDocumentsFromCollection(collectionName) {
  try {
    const snapshot = await admin.firestore().collection(collectionName).get();
    
    if (snapshot.empty) {
      console.log(`No documents found in ${collectionName}`);
      return [];
    }
    
    const documents = [];
    snapshot.forEach(doc => {
      documents.push({
        id: doc.id,
        data: doc.data()
      });
    });
    
    return documents;
  } catch (error) {
    console.error(`Error getting documents from ${collectionName}:`, error);
    return [];
  }
}

/**
 * Repair media URLs in a collection
 * 
 * @param {string} collectionName - The collection to repair
 * @param {boolean} dryRun - If true, don't actually update documents
 * @returns {Promise<{fixed: number, total: number}>} - Results of the repair
 */
async function repairCollectionMedia(collectionName, dryRun = false) {
  console.log(`\n=== Processing collection: ${collectionName} ===`);
  
  try {
    // Get all documents in the collection
    const documents = await getDocumentsFromCollection(collectionName);
    console.log(`Found ${documents.length} documents in ${collectionName}`);
    
    if (documents.length === 0) {
      return { fixed: 0, total: 0 };
    }
    
    // Process each document
    let fixedCount = 0;
    
    for (const doc of documents) {
      try {
        const result = await validateAndRepairMedia(
          collectionName,
          doc.id,
          doc.data,
          admin,
          dryRun
        );
        
        if (result.fixed) {
          fixedCount++;
          
          // Print what was fixed
          if (dryRun) {
            console.log(`[DRY RUN] Would fix document ${doc.id}:`);
            
            // Check for fixed relative URLs
            const relativeUrlFixes = findFixedRelativeUrls(doc.data, result.updatedData);
            if (relativeUrlFixes.length > 0) {
              console.log(`  - ${relativeUrlFixes.length} relative URL(s) would be fixed`);
            }
            
            // Check for fixed media types
            const mediaTypeFixes = findFixedMediaTypes(doc.data, result.updatedData);
            if (mediaTypeFixes.length > 0) {
              console.log(`  - ${mediaTypeFixes.length} media type(s) would be fixed`);
            }
          }
        }
      } catch (error) {
        console.error(`Error processing document ${doc.id}:`, error);
      }
    }
    
    console.log(`${dryRun ? '[DRY RUN] Would fix' : 'Fixed'} ${fixedCount} out of ${documents.length} documents in ${collectionName}`);
    return { fixed: fixedCount, total: documents.length };
  } catch (error) {
    console.error(`Error repairing collection ${collectionName}:`, error);
    return { fixed: 0, total: 0 };
  }
}

/**
 * Find fixed relative URLs between two objects
 * 
 * @param {Object} original - Original data
 * @param {Object} updated - Updated data
 * @returns {Array} - Array of fixes
 */
function findFixedRelativeUrls(original, updated) {
  const fixes = [];

  // Helper to compare URLs
  function compareUrls(originalUrl, updatedUrl, path) {
    if (originalUrl && originalUrl.startsWith("/") &&
        updatedUrl && !updatedUrl.startsWith("/")) {
      fixes.push({
        path,
        original: originalUrl,
        updated: updatedUrl,
      });
    }
  }

  // Check media array
  if (original.media && updated.media &&
      Array.isArray(original.media) && Array.isArray(updated.media)) {
    for (let i = 0; i < original.media.length; i++) {
      if (original.media[i] && updated.media[i]) {
        compareUrls(
            original.media[i].url,
            updated.media[i].url,
            `media[${i}].url`,
        );
      }
    }
  }

  // Check common image fields
  [
    "imageUrl",
    "coverImageUrl",
    "thumbnailUrl",
    "profilePhoto",
  ].forEach((field) => {
    if (original[field] && updated[field]) {
      compareUrls(original[field], updated[field], field);
    }
  });

  return fixes;
}

/**
 * Find fixed media types between two objects
 * 
 * @param {Object} original - Original data
 * @param {Object} updated - Updated data
 * @returns {Array} - Array of fixes
 */
function findFixedMediaTypes(original, updated) {
  const fixes = [];

  // Check media array
  if (original.media && updated.media &&
      Array.isArray(original.media) && Array.isArray(updated.media)) {
    for (let i = 0; i < original.media.length; i++) {
      if (original.media[i] && updated.media[i] &&
          original.media[i].type !== updated.media[i].type) {
        fixes.push({
          path: `media[${i}].type`,
          original: original.media[i].type,
          updated: updated.media[i].type,
          url: updated.media[i].url,
        });
      }
    }
  }

  return fixes;
}

/**
 * Main function
 */
async function main() {
  console.log('=== Media Repair Tool ===');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE RUN (changes will be applied)'}\n`);
  
  try {
    // Create media validation library if it doesn't exist
    createMediaValidationLib();
    
    // Determine which collections to repair
    const collectionsToProcess = specificCollection
      ? [specificCollection]
      : COLLECTIONS_TO_REPAIR;
    
    console.log(`Will repair media in the following collections: ${collectionsToProcess.join(', ')}`);
    
    // Repair each collection
    const results = {};
    let totalFixed = 0;
    let totalDocuments = 0;
    
    for (const collection of collectionsToProcess) {
      const result = await repairCollectionMedia(collection, dryRun);
      results[collection] = result;
      totalFixed += result.fixed;
      totalDocuments += result.total;
    }
    
    // Print summary
    console.log('\n=== Repair Summary ===');
    console.log(`Total documents processed: ${totalDocuments}`);
    console.log(`Total documents ${dryRun ? 'that would be fixed' : 'fixed'}: ${totalFixed}`);
    
    for (const [collection, result] of Object.entries(results)) {
      if (result.total > 0) {
        const percentage = ((result.fixed / result.total) * 100).toFixed(2);
        console.log(`${collection}: ${result.fixed}/${result.total} (${percentage}%)`);
      }
    }
    
    if (dryRun) {
      console.log('\nThis was a DRY RUN. No changes were made to the database.');
      console.log('To apply these changes, run the script without the --dry-run flag.');
    }
  } catch (error) {
    console.error('Error repairing media:', error);
    process.exit(1);
  } finally {
    // Clean up
    admin.app().delete();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });