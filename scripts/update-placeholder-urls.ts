/**
 * Update Placeholder URLs Script
 * 
 * This script updates placeholder URLs in Firestore to use proper development environment URLs.
 * It fixes relative, production, and broken placeholder URLs to ensure consistent media validation.
 */

import { adminDb } from '../server/firebase-admin';
import { formatPlaceholderUrl, isPlaceholderUrl } from '../core/domain/media/placeholder-handler';

// Collections to process
const COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'user_profiles_service_provider',
  'user_profiles_tourist'
];

/**
 * Extract all media URLs from a document
 */
function extractMediaUrls(data: any): { path: string; url: string }[] {
  const urls: { path: string; url: string }[] = [];
  
  function processObject(obj: any, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        if (typeof item === 'string' && isPlaceholderUrl(item)) {
          urls.push({ path: `${path}[${index}]`, url: item });
        } else if (item && typeof item === 'object') {
          processObject(item, `${path}[${index}]`);
        }
      });
      return;
    }
    
    // Handle direct URL fields
    if (obj.url && typeof obj.url === 'string' && isPlaceholderUrl(obj.url)) {
      urls.push({ path: path ? `${path}.url` : 'url', url: obj.url });
    }
    
    // Process all object properties
    Object.entries(obj).forEach(([key, value]) => {
      const newPath = path ? `${path}.${key}` : key;
      
      // Handle string values that might be URLs
      if (typeof value === 'string') {
        if (isPlaceholderUrl(value)) {
          urls.push({ path: newPath, url: value });
        }
      } 
      // Recursively process nested objects
      else if (value && typeof value === 'object') {
        processObject(value, newPath);
      }
    });
  }
  
  processObject(data);
  return urls;
}

/**
 * Update placeholder URLs in a document
 */
async function updateDocumentPlaceholders(collectionName: string, docId: string, data: any): Promise<boolean> {
  // Extract URLs
  const mediaUrls = extractMediaUrls(data);
  const placeholderUrls = mediaUrls.filter(({ url }) => isPlaceholderUrl(url));
  
  if (placeholderUrls.length === 0) {
    return false; // No placeholders to update
  }
  
  // Create update object
  const updates: Record<string, any> = {};
  let hasUpdates = false;
  
  placeholderUrls.forEach(({ path, url }) => {
    const newUrl = formatPlaceholderUrl(url);
    if (newUrl !== url) {
      updates[path] = newUrl;
      hasUpdates = true;
      console.log(`Updating placeholder in ${collectionName}/${docId}: ${path}`);
      console.log(`  Old: ${url}`);
      console.log(`  New: ${newUrl}`);
    }
  });
  
  // Apply updates if needed
  if (hasUpdates) {
    await adminDb.collection(collectionName).doc(docId).update(updates);
    return true;
  }
  
  return false;
}

/**
 * Update placeholder URLs across collections
 */
export async function updatePlaceholderUrls(): Promise<{
  totalDocuments: number;
  updatedDocuments: number;
  placeholderCount: number;
  updatedPlaceholders: number;
}> {
  let totalDocuments = 0;
  let updatedDocuments = 0;
  let placeholderCount = 0;
  let updatedPlaceholders = 0;
  
  // Process each collection
  for (const collectionName of COLLECTIONS) {
    console.log(`\nProcessing collection: ${collectionName}`);
    
    try {
      // Query the collection
      const snapshot = await adminDb.collection(collectionName).get();
      const docsCount = snapshot.docs.length;
      totalDocuments += docsCount;
      
      console.log(`Found ${docsCount} documents in ${collectionName}`);
      
      // Process each document
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const docPlaceholders = extractMediaUrls(data).filter(({ url }) => isPlaceholderUrl(url));
        placeholderCount += docPlaceholders.length;
        
        if (docPlaceholders.length > 0) {
          const wasUpdated = await updateDocumentPlaceholders(collectionName, doc.id, data);
          if (wasUpdated) {
            updatedDocuments++;
            updatedPlaceholders += docPlaceholders.length;
          }
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collectionName}:`, error);
    }
  }
  
  return {
    totalDocuments,
    updatedDocuments,
    placeholderCount,
    updatedPlaceholders
  };
}

/**
 * Main function
 */
export async function main() {
  try {
    console.log('Starting placeholder URL update process...');
    
    const stats = await updatePlaceholderUrls();
    
    console.log('\n=========================================');
    console.log('PLACEHOLDER URL UPDATE REPORT');
    console.log('=========================================');
    console.log(`Total documents scanned: ${stats.totalDocuments}`);
    console.log(`Documents with placeholders: ${stats.updatedDocuments}`);
    console.log(`Total placeholder URLs found: ${stats.placeholderCount}`);
    console.log(`Placeholder URLs updated: ${stats.updatedPlaceholders}`);
    console.log('=========================================');
    
    console.log('\nPlaceholder URL update completed successfully.');
  } catch (error) {
    console.error('Error updating placeholder URLs:', error);
  }
}

// Run if invoked directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('Error running placeholder update:', error);
    process.exit(1);
  });
}

export default updatePlaceholderUrls;