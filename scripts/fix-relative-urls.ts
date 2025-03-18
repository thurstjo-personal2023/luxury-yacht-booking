/**
 * Fix Relative URLs Script
 * 
 * This script scans all collections in Firestore for relative URLs (starting with "/") 
 * in media-related fields and converts them to absolute URLs using the base domain.
 * It tracks all changes and creates a detailed report in the 'relative_url_fix_reports' collection.
 */

import * as admin from 'firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminDb } from '../server/firebase-admin';

// Base URL for converting relative URLs to absolute
const BASE_URL = 'https://etoile-yachts.app'; // Default production URL

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
}

/**
 * Check if a URL is relative (starts with /)
 */
function isRelativeUrl(url: string): boolean {
  if (typeof url !== 'string') return false;
  return url.startsWith('/') && !url.startsWith('//');
}

/**
 * Convert a relative URL to an absolute URL
 */
function toAbsoluteUrl(relativeUrl: string): string {
  if (!isRelativeUrl(relativeUrl)) return relativeUrl;
  return `${BASE_URL}${relativeUrl}`;
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
 * Scan a collection for relative URLs and fix them
 */
async function processCollection(collectionName: string): Promise<FixedUrl[]> {
  const db = getAdminDb();
  const fixedUrls: FixedUrl[] = [];
  
  console.log(`Scanning ${collectionName} for relative URLs...`);
  
  try {
    const snapshot = await db.collection(collectionName).get();
    
    for (const doc of snapshot.docs) {
      const docId = doc.id;
      const data = doc.data();
      
      // Process the document to identify and fix relative URLs
      const { modified, fixedUrls: docFixedUrls } = processObject(data, docId, collectionName, '', []);
      
      // If modifications were made, update the document
      if (modified) {
        await db.collection(collectionName).doc(docId).update(data);
        fixedUrls.push(...docFixedUrls);
      }
    }
    
    console.log(`Found and fixed ${fixedUrls.length} relative URLs in ${collectionName}`);
    return fixedUrls;
  } catch (error) {
    console.error(`Error processing collection ${collectionName}:`, error);
    return [];
  }
}

/**
 * Main function to fix all relative URLs in the database
 */
export async function fixRelativeUrls(): Promise<FixReport> {
  const db = getAdminDb();
  let allFixedUrls: FixedUrl[] = [];
  const collectionStats: Record<string, number> = {};
  
  // Process each collection
  for (const collection of COLLECTIONS_TO_SCAN) {
    const fixedUrls = await processCollection(collection);
    
    if (fixedUrls.length > 0) {
      allFixedUrls = allFixedUrls.concat(fixedUrls);
      collectionStats[collection] = fixedUrls.length;
    }
  }
  
  // Create the report
  const report: FixReport = {
    timestamp: new Date().toISOString(),
    createdAt: Timestamp.now(),
    fixedUrls: allFixedUrls,
    collectionStats,
    totalRelativeUrls: allFixedUrls.length,
    totalFixed: allFixedUrls.length
  };
  
  // Save the report to Firestore
  try {
    const reportRef = await db.collection('relative_url_fix_reports').add(report);
    console.log(`Relative URL fix report created with ID: ${reportRef.id}`);
    console.log(`Total relative URLs fixed: ${allFixedUrls.length}`);
  } catch (error) {
    console.error('Error creating relative URL fix report:', error);
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
      console.log('Relative URL fix completed successfully.');
      process.exit(0);
    })
    .catch(error => {
      console.error('Error fixing relative URLs:', error);
      process.exit(1);
    });
}