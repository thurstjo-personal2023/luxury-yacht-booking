/**
 * Fix Relative URLs Script
 * 
 * This script scans all collections in Firestore for relative URLs (starting with "/") 
 * in media-related fields and converts them to absolute URLs using the base domain.
 * It tracks all changes and creates a detailed report in the 'relative_url_fix_reports' collection.
 */

import * as admin from 'firebase-admin';
import { Timestamp, WriteBatch } from 'firebase-admin/firestore';
import { adminDb } from '../server/firebase-admin';

// Base URL for converting relative URLs to absolute
const BASE_URL = 'https://etoile-yachts.app'; // Default production URL

// Configuration
const MAX_BATCH_SIZE = 500; // Maximum number of operations in a batch
const BATCH_LOGGING_INTERVAL = 50; // Log progress every X documents

// List of collections to scan for relative URLs
const COLLECTIONS_TO_SCAN = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'promotions_and_offers',
  'articles_and_guides',
  'event_announcements',
  'user_profiles_service_provider',
  'user_profiles_tourist'
];

// Fields that commonly contain media URLs
const MEDIA_FIELDS = [
  'media',
  'mediaUrl',
  'profilePhoto',
  'imageUrl',
  'thumbnailUrl',
  'photos',
  'url'
];

interface FixedUrl {
  docId: string;
  collection: string;
  field: string;
  fieldPath: string;
  oldUrl: string;
  newUrl: string;
}

interface FixReport {
  timestamp: string;
  createdAt: Timestamp;
  fixedUrls: FixedUrl[];
  collectionStats: Record<string, number>;
  totalRelativeUrls: number;
  totalFixed: number;
  errors?: string[];
}

/**
 * Check if a URL is relative (starts with /)
 */
function isRelativeUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Check if a URL is absolute (starts with http:// or https://)
 */
function isAbsoluteUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  try {
    new URL(url); // Will throw if not a valid absolute URL
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Convert a relative URL to an absolute URL
 */
function toAbsoluteUrl(relativeUrl: string): string {
  if (typeof relativeUrl !== 'string' || !relativeUrl.trim() || isAbsoluteUrl(relativeUrl)) {
    return relativeUrl; // Don't modify if already absolute or empty
  }
  
  // Handle paths with or without leading slash
  return `${BASE_URL}${relativeUrl.startsWith('/') ? relativeUrl : '/' + relativeUrl}`;
}

/**
 * Process an object to fix relative URLs
 * This function recursively traverses the object and fixes any relative URLs
 */
function processObject(
  obj: any, 
  docId: string, 
  collection: string,
  basePath: string = '',
  fixedUrls: FixedUrl[] = []
): { modified: boolean; fixedUrls: FixedUrl[] } {
  if (!obj || typeof obj !== 'object') return { modified: false, fixedUrls };
  
  let modified = false;
  
  // Handle arrays
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) {
      const item = obj[i];
      const currentPath = basePath ? `${basePath}[${i}]` : `[${i}]`;
      
      // If this is a simple string in the array
      if (typeof item === 'string') {
        // Check if it's a relative URL
        if (isRelativeUrl(item)) {
          const absoluteUrl = toAbsoluteUrl(item);
          fixedUrls.push({
            docId,
            collection,
            field: basePath,
            fieldPath: currentPath,
            oldUrl: item,
            newUrl: absoluteUrl
          });
          obj[i] = absoluteUrl;
          modified = true;
        }
      } 
      // If it's a media object with 'url' property
      else if (item && typeof item === 'object') {
        // Special case for the media array which contains objects with url property
        if (item.url && typeof item.url === 'string' && isRelativeUrl(item.url)) {
          const absoluteUrl = toAbsoluteUrl(item.url);
          fixedUrls.push({
            docId,
            collection,
            field: `${basePath}.url`,
            fieldPath: `${currentPath}.url`,
            oldUrl: item.url,
            newUrl: absoluteUrl
          });
          item.url = absoluteUrl;
          modified = true;
        }
        
        // Recursively process nested objects/arrays
        const processResult = processObject(item, docId, collection, currentPath, fixedUrls);
        if (processResult.modified) {
          modified = true;
        }
      }
    }
  } 
  // Handle objects
  else {
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        const value = obj[key];
        const currentPath = basePath ? `${basePath}.${key}` : key;
        
        // If value is a string and is a relative URL
        if (typeof value === 'string') {
          if (isRelativeUrl(value)) {
            const absoluteUrl = toAbsoluteUrl(value);
            fixedUrls.push({
              docId,
              collection,
              field: key,
              fieldPath: currentPath,
              oldUrl: value,
              newUrl: absoluteUrl
            });
            obj[key] = absoluteUrl;
            modified = true;
          }
        } 
        // If value is an object or array, process recursively
        else if (value && typeof value === 'object') {
          const processResult = processObject(value, docId, collection, currentPath, fixedUrls);
          if (processResult.modified) {
            modified = true;
          }
        }
      }
    }
  }
  
  return { modified, fixedUrls };
}

/**
 * Scan a collection for relative URLs and fix them using batch operations
 */
async function processCollection(collectionName: string): Promise<FixedUrl[]> {
  const fixedUrls: FixedUrl[] = [];
  const errors: string[] = [];
  
  console.log(`[${new Date().toISOString()}] Scanning ${collectionName} for relative URLs...`);
  
  try {
    const snapshot = await adminDb.collection(collectionName).get();
    console.log(`[${new Date().toISOString()}] Retrieved ${snapshot.size} documents from ${collectionName}`);
    
    // Use batches to reduce write operations
    const totalDocs = snapshot.size;
    let docsProcessed = 0;
    let currentBatch: WriteBatch | null = null;
    let batchCount = 0;
    let batchOperations = 0;
    let modifiedDocs = 0;
    
    for (const doc of snapshot.docs) {
      docsProcessed++;
      
      // Log progress periodically
      if (docsProcessed % BATCH_LOGGING_INTERVAL === 0 || docsProcessed === totalDocs) {
        console.log(`[${new Date().toISOString()}] Processing ${collectionName}: ${docsProcessed}/${totalDocs} documents (${Math.round(docsProcessed/totalDocs*100)}%)`);
      }
      
      const docId = doc.id;
      const data = doc.data();
      
      // Process the document to identify and fix relative URLs
      const { modified, fixedUrls: docFixedUrls } = processObject(data, docId, collectionName, '', []);
      
      // If modifications were made, add to batch update
      if (modified) {
        modifiedDocs++;
        
        // Initialize a new batch if needed
        if (!currentBatch) {
          currentBatch = adminDb.batch();
          batchCount++;
          batchOperations = 0;
        }
        
        // Add update operation to current batch
        currentBatch.update(adminDb.collection(collectionName).doc(docId), data);
        batchOperations++;
        fixedUrls.push(...docFixedUrls);
        
        // If batch is full, commit it
        if (batchOperations >= MAX_BATCH_SIZE) {
          try {
            await currentBatch.commit();
            console.log(`[${new Date().toISOString()}] Committed batch #${batchCount} with ${batchOperations} operations for ${collectionName}`);
            currentBatch = null;
          } catch (error: any) {
            console.error(`[${new Date().toISOString()}] Error committing batch #${batchCount} for ${collectionName}:`, error);
            const errorMsg = `Batch #${batchCount} error: ${error.message || String(error)}`;
            errors.push(errorMsg);
            currentBatch = null; // Reset the batch after error
          }
        }
      }
    }
    
    // Commit any remaining operations in the final batch
    if (currentBatch && batchOperations > 0) {
      try {
        await currentBatch.commit();
        console.log(`[${new Date().toISOString()}] Committed final batch #${batchCount} with ${batchOperations} operations for ${collectionName}`);
      } catch (batchError) {
        console.error(`[${new Date().toISOString()}] Error committing final batch #${batchCount} for ${collectionName}:`, batchError);
        const errorMsg = `Final batch #${batchCount} error: ${batchError.message || String(batchError)}`;
        errors.push(errorMsg);
      }
    }
    
    console.log(`[${new Date().toISOString()}] ${collectionName} processing complete: ${modifiedDocs}/${totalDocs} documents modified with ${fixedUrls.length} URL changes`);
    
    if (errors.length > 0) {
      console.warn(`[${new Date().toISOString()}] ${collectionName} had ${errors.length} errors during processing`);
    }
    
    return fixedUrls;
  } catch (error) {
    const errorMsg = `Error processing collection ${collectionName}: ${error.message || String(error)}`;
    console.error(`[${new Date().toISOString()}] ${errorMsg}`);
    errors.push(errorMsg);
    return [];
  }
}

/**
 * Main function to fix all relative URLs in the database
 */
export async function fixRelativeUrls(): Promise<FixReport> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting relative URL fix operation`);
  
  let allFixedUrls: FixedUrl[] = [];
  const collectionStats: Record<string, number> = {};
  const errors: string[] = [];
  
  // Process each collection
  for (const collection of COLLECTIONS_TO_SCAN) {
    try {
      const fixedUrls = await processCollection(collection);
      
      if (fixedUrls.length > 0) {
        allFixedUrls = allFixedUrls.concat(fixedUrls);
        collectionStats[collection] = fixedUrls.length;
      }
    } catch (error) {
      const errorMsg = `Failed to process collection ${collection}: ${error.message || String(error)}`;
      console.error(`[${new Date().toISOString()}] ${errorMsg}`);
      errors.push(errorMsg);
    }
  }
  
  // Create the report
  const report: FixReport = {
    timestamp: new Date().toISOString(),
    createdAt: Timestamp.now(),
    fixedUrls: allFixedUrls,
    collectionStats,
    totalRelativeUrls: allFixedUrls.length,
    totalFixed: allFixedUrls.length,
    errors: errors.length > 0 ? errors : undefined
  };
  
  // Log summary statistics
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds
  console.log(`[${endTime.toISOString()}] Relative URL fix operation completed in ${duration.toFixed(1)}s`);
  console.log(`- Total collections scanned: ${COLLECTIONS_TO_SCAN.length}`);
  console.log(`- Collections with relative URLs: ${Object.keys(collectionStats).length}`);
  console.log(`- Total relative URLs found and fixed: ${allFixedUrls.length}`);
  
  if (errors.length > 0) {
    console.warn(`- Encountered ${errors.length} errors during processing`);
  }
  
  // Save the report to Firestore
  try {
    const reportRef = await adminDb.collection('relative_url_fix_reports').add(report);
    console.log(`[${new Date().toISOString()}] Relative URL fix report created with ID: ${reportRef.id}`);
  } catch (error) {
    const errorMsg = `Error creating relative URL fix report: ${error.message || String(error)}`;
    console.error(`[${new Date().toISOString()}] ${errorMsg}`);
    errors.push(errorMsg);
  }
  
  return report;
}

// Allow direct execution of script
if (require.main === module) {
  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  // Run the script
  fixRelativeUrls()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Relative URL fix script completed successfully.`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`[${new Date().toISOString()}] Error running relative URL fix script:`, error);
      process.exit(1);
    });
}