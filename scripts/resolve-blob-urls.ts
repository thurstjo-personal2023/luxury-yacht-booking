/**
 * Blob URL Resolution Script
 * 
 * This script scans collections for blob:// URLs and replaces them with appropriate placeholders.
 * Blob URLs are often created when users paste images directly into content editors.
 * These URLs are temporary and don't work outside the user's browser session.
 */

// Import the existing configured adminDb instance and firestore
import * as admin from 'firebase-admin';
import { adminDb } from '../server/firebase-admin';
import { FieldValue, WriteBatch, Timestamp } from 'firebase-admin/firestore';

// Media type specific placeholders
const IMAGE_PLACEHOLDER_URL = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/image-placeholder.jpg';
const VIDEO_PLACEHOLDER_URL = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4';

// Configuration
const MAX_BATCH_SIZE = 500; // Maximum number of operations in a batch
const BATCH_LOGGING_INTERVAL = 50; // Log progress every X documents

// Collections that may contain media URLs
const COLLECTIONS_TO_SCAN = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'experience_packages',
  'products_add_ons', // Fix: Changed hyphen to underscore to match actual collection name
  'articles_and_guides',
  'event_announcements',
  'promotions_and_offers',
  'user_profiles_service_provider',
  'user_profiles_tourist',
];

// Interface for resolved URL records
interface ResolvedUrl {
  docId: string;
  collection: string;
  field: string;
  arrayIndex?: number;
  oldUrl: string;
  newUrl: string;
  timestamp: string;
}

// Define report data interface
interface BlobResolutionReport {
  timestamp: string;
  createdAt: Timestamp;
  resolvedUrls: ResolvedUrl[];
  collectionStats: Record<string, number>;
  totalIdentified: number;
  totalResolved: number;
  stats: {
    imageCount: number;
    videoCount: number;
  };
  errors?: string[];
  id?: string; // Added after report is saved
}

/**
 * Check if a URL is a blob URL
 */
function isBlobUrl(url: unknown): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Check for blob protocol with more strict validation
  return url.startsWith('blob:') && (
    url.includes('://') || // Contains protocol separator
    url.length > 10 // At least some content after 'blob:'
  );
}

/**
 * Determines the replacement URL based on media type hints
 */
function getReplacementUrl(fieldPath: string): string {
  // Check field name for hints about media type
  const lowerFieldPath = fieldPath.toLowerCase();
  
  if (
    lowerFieldPath.includes('video') || 
    lowerFieldPath.includes('mp4') || 
    lowerFieldPath.includes('media.type.video') ||
    lowerFieldPath.endsWith('.mp4')
  ) {
    return VIDEO_PLACEHOLDER_URL;
  }
  
  // Default to image placeholder
  return IMAGE_PLACEHOLDER_URL;
}

/**
 * Scan and process a single document for blob URLs
 */
async function processDocument(
  collectionName: string,
  docId: string,
  data: Record<string, any>,
  reportData: {
    resolvedUrls: ResolvedUrl[];
    collectionStats: Record<string, number>;
  },
  batch?: WriteBatch
): Promise<{updated: boolean; updates: Record<string, any>}> {
  let hasChanges = false;
  const updates: Record<string, any> = {};
  const timestamp = new Date().toISOString();
  
  // Function to recursively scan object for blob URLs
  const scanObject = (obj: any, path: string[] = []): void => {
    if (!obj || typeof obj !== 'object') return;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'string' && isBlobUrl(item)) {
          const fullPath = [...path, index.toString()].join('.');
          const replacementUrl = getReplacementUrl(fullPath);
          
          // Record the replacement
          reportData.resolvedUrls.push({
            docId,
            collection: collectionName,
            field: path.join('.'),
            arrayIndex: index,
            oldUrl: item,
            newUrl: replacementUrl,
            timestamp
          });
          
          // Update the object
          obj[index] = replacementUrl;
          hasChanges = true;
          
          // Update collection stats
          reportData.collectionStats[collectionName] = (reportData.collectionStats[collectionName] || 0) + 1;
        } else if (typeof item === 'object' && item !== null) {
          scanObject(item, [...path, index.toString()]);
        }
      });
      return;
    }
    
    // Handle objects
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = [...path, key];
      
      if (typeof value === 'string' && isBlobUrl(value)) {
        const fullPath = currentPath.join('.');
        const replacementUrl = getReplacementUrl(fullPath);
        
        // Create dot notation path for Firestore update
        const updatePath = fullPath;
        updates[updatePath] = replacementUrl;
        
        // Record the replacement
        reportData.resolvedUrls.push({
          docId,
          collection: collectionName,
          field: currentPath.join('.'),
          oldUrl: value,
          newUrl: replacementUrl,
          timestamp
        });
        
        hasChanges = true;
        
        // Update collection stats
        reportData.collectionStats[collectionName] = (reportData.collectionStats[collectionName] || 0) + 1;
      } else if (typeof value === 'object' && value !== null) {
        scanObject(value, currentPath);
      }
    }
  };
  
  // Scan the document data
  scanObject(data);
  
  // If we found changes and have a batch, add to batch
  if (hasChanges && batch) {
    batch.update(adminDb.collection(collectionName).doc(docId), updates);
  }
  // If we found changes but no batch, update directly
  else if (hasChanges && !batch) {
    try {
      await adminDb.collection(collectionName).doc(docId).update(updates);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error updating document ${collectionName}/${docId}:`, error);
      hasChanges = false; // Mark as not updated due to error
    }
  }
  
  return { updated: hasChanges, updates };
}

/**
 * Scan a collection for blob URLs and fix them using batch operations
 */
async function processCollection(collectionName: string, reportData: BlobResolutionReport): Promise<number> {
  const errors: string[] = [];
  let resolvedCount = 0;
  
  console.log(`[${new Date().toISOString()}] Scanning ${collectionName} for blob URLs...`);
  
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
      
      // Initialize a new batch if needed
      if (!currentBatch) {
        currentBatch = adminDb.batch();
        batchCount++;
        batchOperations = 0;
      }
      
      const docId = doc.id;
      const docData = doc.data();
      
      // Process the document to identify and fix blob URLs
      const { updated, updates } = await processDocument(
        collectionName, 
        docId, 
        docData, 
        reportData, 
        currentBatch
      );
      
      // If modifications were made
      if (updated) {
        modifiedDocs++;
        batchOperations++;
        resolvedCount++;
        
        // If batch is full, commit it
        if (batchOperations >= MAX_BATCH_SIZE) {
          try {
            await currentBatch.commit();
            console.log(`[${new Date().toISOString()}] Committed batch #${batchCount} with ${batchOperations} operations for ${collectionName}`);
            currentBatch = null;
          } catch (batchError) {
            console.error(`[${new Date().toISOString()}] Error committing batch #${batchCount} for ${collectionName}:`, batchError);
            const errorMsg = `Batch #${batchCount} error: ${batchError.message || String(batchError)}`;
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
    
    console.log(`[${new Date().toISOString()}] ${collectionName} processing complete: ${modifiedDocs}/${totalDocs} documents modified`);
    
    if (errors.length > 0) {
      console.warn(`[${new Date().toISOString()}] ${collectionName} had ${errors.length} errors during processing`);
      
      // Add collection-specific errors to the report
      if (!reportData.errors) {
        reportData.errors = [];
      }
      
      reportData.errors.push(...errors.map(err => `${collectionName}: ${err}`));
    }
    
    return resolvedCount;
  } catch (error) {
    const errorMsg = `Error processing collection ${collectionName}: ${error.message || String(error)}`;
    console.error(`[${new Date().toISOString()}] ${errorMsg}`);
    
    if (!reportData.errors) {
      reportData.errors = [];
    }
    reportData.errors.push(errorMsg);
    
    return 0;
  }
}

/**
 * Scan all collections for blob URLs and replace them
 */
export async function resolveAllBlobUrls(): Promise<BlobResolutionReport> {
  const startTime = new Date();
  console.log(`[${startTime.toISOString()}] Starting blob URL resolution operation`);
  
  const reportData: BlobResolutionReport = {
    timestamp: new Date().toISOString(),
    createdAt: Timestamp.now(),
    resolvedUrls: [],
    collectionStats: {},
    totalIdentified: 0,
    totalResolved: 0,
    stats: {
      imageCount: 0,
      videoCount: 0,
    }
  };
  
  // Process each collection
  for (const collectionName of COLLECTIONS_TO_SCAN) {
    try {
      const resolvedCount = await processCollection(collectionName, reportData);
      reportData.totalResolved += resolvedCount;
    } catch (error) {
      const errorMsg = `Failed to process collection ${collectionName}: ${error.message || String(error)}`;
      console.error(`[${new Date().toISOString()}] ${errorMsg}`);
      
      if (!reportData.errors) {
        reportData.errors = [];
      }
      reportData.errors.push(errorMsg);
    }
  }
  
  // Calculate stats
  reportData.totalIdentified = reportData.resolvedUrls.length;
  
  // Count media types
  reportData.stats.imageCount = reportData.resolvedUrls.filter(item => item.newUrl === IMAGE_PLACEHOLDER_URL).length;
  reportData.stats.videoCount = reportData.resolvedUrls.filter(item => item.newUrl === VIDEO_PLACEHOLDER_URL).length;
  
  // Log summary statistics
  const endTime = new Date();
  const duration = (endTime.getTime() - startTime.getTime()) / 1000; // seconds
  console.log(`[${endTime.toISOString()}] Blob URL resolution operation completed in ${duration.toFixed(1)}s`);
  console.log(`- Total collections scanned: ${COLLECTIONS_TO_SCAN.length}`);
  console.log(`- Collections with blob URLs: ${Object.keys(reportData.collectionStats).length}`);
  console.log(`- Total blob URLs identified: ${reportData.totalIdentified}`);
  console.log(`- Total blob URLs resolved: ${reportData.totalResolved}`);
  console.log(`- Image placeholders used: ${reportData.stats.imageCount}`);
  console.log(`- Video placeholders used: ${reportData.stats.videoCount}`);
  
  if (reportData.errors && reportData.errors.length > 0) {
    console.warn(`- Encountered ${reportData.errors.length} errors during processing`);
  }
  
  // Save the report to Firestore
  try {
    const reportRef = await adminDb.collection('blob_url_resolution_reports').add({
      ...reportData,
      createdAt: FieldValue.serverTimestamp() // Use server timestamp for consistency
    });
    
    console.log(`[${new Date().toISOString()}] Blob URL resolution report created with ID: ${reportRef.id}`);
    reportData.id = reportRef.id;
    
    return reportData;
  } catch (error) {
    const errorMsg = `Error creating blob URL resolution report: ${error.message || String(error)}`;
    console.error(`[${new Date().toISOString()}] ${errorMsg}`);
    
    if (!reportData.errors) {
      reportData.errors = [];
    }
    reportData.errors.push(errorMsg);
    
    throw error;
  }
}

/**
 * Run the script if called directly
 */
if (require.main === module) {
  // Initialize Firebase Admin if not already initialized
  if (!admin.apps.length) {
    admin.initializeApp();
  }
  
  resolveAllBlobUrls()
    .then(() => {
      console.log(`[${new Date().toISOString()}] Blob URL resolution script completed successfully.`);
      process.exit(0);
    })
    .catch(error => {
      console.error(`[${new Date().toISOString()}] Error running blob URL resolution script:`, error);
      process.exit(1);
    });
}