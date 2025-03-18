/**
 * Blob URL Resolution Script
 * 
 * This script scans collections for blob:// URLs and replaces them with appropriate placeholders.
 * Blob URLs are often created when users paste images directly into content editors.
 * These URLs are temporary and don't work outside the user's browser session.
 */

import * as admin from 'firebase-admin';
import { USE_FIREBASE_EMULATORS } from '../server/env-config';

// Initialize Firebase Admin if it's not already initialized
let adminDb: admin.firestore.Firestore;
if (!admin.apps.length) {
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY
    ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
    : undefined;

  admin.initializeApp({
    credential: serviceAccount
      ? admin.credential.cert(serviceAccount)
      : admin.credential.applicationDefault(),
  });
}

adminDb = admin.firestore();

// Media type specific placeholders
const IMAGE_PLACEHOLDER_URL = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/image-placeholder.jpg';
const VIDEO_PLACEHOLDER_URL = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4';

// Collections that may contain media URLs
const COLLECTIONS_TO_SCAN = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'experience_packages',
  'products_add-ons',
  'articles_and_guides',
  'event_announcements',
  'promotions_and_offers',
  'user_profiles_service_provider',
  'user_profiles_tourist',
];

/**
 * Check if a URL is a blob URL
 */
function isBlobUrl(url: unknown): boolean {
  return !!url && typeof url === 'string' && url.startsWith('blob:');
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
    resolvedUrls: any[];
    collectionStats: Record<string, number>;
  }
): Promise<boolean> {
  let hasChanges = false;
  const updates: Record<string, any> = {};
  
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
            newUrl: replacementUrl
          });
          
          // Update the object
          obj[index] = replacementUrl;
          hasChanges = true;
          
          // Update collection stats
          reportData.collectionStats[collectionName] = (reportData.collectionStats[collectionName] || 0) + 1;
        } else if (typeof item === 'object') {
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
          newUrl: replacementUrl
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
  
  // If we found changes, update the document
  if (hasChanges) {
    try {
      // Use set with merge to avoid overwriting other fields
      await adminDb.collection(collectionName).doc(docId).update(updates);
      return true;
    } catch (error) {
      console.error(`Error updating document ${collectionName}/${docId}:`, error);
      return false;
    }
  }
  
  return false;
}

/**
 * Scan all collections for blob URLs and replace them
 */
// Define report data interface
interface BlobResolutionReport {
  timestamp: string;
  resolvedUrls: any[];
  collectionStats: Record<string, number>;
  totalIdentified: number;
  totalResolved: number;
  stats: {
    imageCount: number;
    videoCount: number;
  };
  id?: string; // Added after report is saved
}

export async function resolveAllBlobUrls() {
  console.log('Starting blob URL resolution...');
  
  const reportData: BlobResolutionReport = {
    timestamp: new Date().toISOString(),
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
    console.log(`Scanning collection: ${collectionName}`);
    
    try {
      const snapshot = await adminDb.collection(collectionName).get();
      
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const updated = await processDocument(collectionName, doc.id, docData, reportData);
        
        if (updated) {
          reportData.totalResolved++;
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collectionName}:`, error);
    }
  }
  
  // Calculate stats
  reportData.totalIdentified = reportData.resolvedUrls.length;
  
  // Count media types
  reportData.stats.imageCount = reportData.resolvedUrls.filter(item => item.newUrl === IMAGE_PLACEHOLDER_URL).length;
  reportData.stats.videoCount = reportData.resolvedUrls.filter(item => item.newUrl === VIDEO_PLACEHOLDER_URL).length;
  
  // Save the report to Firestore
  try {
    const reportRef = await adminDb.collection('blob_url_resolution_reports').add({
      ...reportData,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Blob URL resolution complete. Report saved with ID: ${reportRef.id}`);
    reportData.id = reportRef.id;
    
    return reportData;
  } catch (error) {
    console.error('Error saving blob URL resolution report:', error);
    throw error;
  }
}

/**
 * Run the script if called directly
 */
if (require.main === module) {
  resolveAllBlobUrls()
    .then(() => {
      console.log('Blob URL resolution completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error during blob URL resolution:', error);
      process.exit(1);
    });
}