/**
 * Media Issues Repair Script
 * 
 * This script specifically handles two issues in our media:
 * 1. Converts relative URLs to absolute URLs (especially placeholder images)
 * 2. Corrects media type mismatches (especially incorrectly labeled videos)
 */
import { adminDb } from '../server/firebase-admin';
import { format } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';

// Collections to check
const COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'user_profiles_service_provider',
  'user_profiles_tourist'
];

// Base URL for resolving relative URLs
const BASE_URL = process.env.BASE_URL || 'https://etoile-yachts.replit.app';

// Video pattern detection for identifying videos
const VIDEO_PATTERNS = [
  '.mp4', '.mov', '.webm', '.avi', 'video', '.mp4',
  '-SBV-', 'Dynamic motion', 'preview.mp4'
];

// Types for tracking results
interface RepairResults {
  timestamp: string;
  relativeUrlsFixed: {
    collection: string;
    docId: string;
    field: string;
    subField?: string;
    originalUrl: string;
    fixedUrl: string;
  }[];
  mediaTypesFixed: {
    collection: string;
    docId: string;
    field: string;
    subField?: string;
    url: string;
    originalType: string;
    fixedType: string;
  }[];
  stats: {
    documentsProcessed: number;
    relativeUrlsFixed: number;
    mediaTypesFixed: number;
    byCollection: Record<string, {
      documentsProcessed: number;
      relativeUrlsFixed: number;
      mediaTypesFixed: number;
    }>;
  };
}

/**
 * Main function to fix media issues
 */
export async function fixMediaIssues(): Promise<RepairResults> {
  console.log('Starting media issues repair...');
  
  // Initialize results object
  const results: RepairResults = {
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    relativeUrlsFixed: [],
    mediaTypesFixed: [],
    stats: {
      documentsProcessed: 0,
      relativeUrlsFixed: 0,
      mediaTypesFixed: 0,
      byCollection: {}
    }
  };
  
  // Initialize collection stats
  for (const collection of COLLECTIONS) {
    results.stats.byCollection[collection] = {
      documentsProcessed: 0,
      relativeUrlsFixed: 0,
      mediaTypesFixed: 0
    };
  }
  
  // Process each collection
  for (const collection of COLLECTIONS) {
    console.log(`Processing ${collection}...`);
    
    try {
      // Get all documents in the collection
      const snapshot = await adminDb.collection(collection).get();
      const docs = snapshot.docs;
      
      console.log(`Found ${docs.length} documents in ${collection}`);
      results.stats.documentsProcessed += docs.length;
      results.stats.byCollection[collection].documentsProcessed = docs.length;
      
      // Process each document
      for (const doc of docs) {
        const data = doc.data();
        let docUpdated = false;
        let updates: Record<string, any> = {};
        
        // Handle media array in collections with media array field
        if (data.media && Array.isArray(data.media)) {
          const updatedMedia = [...data.media];
          let mediaModified = false;
          
          // Process each media item
          for (let i = 0; i < updatedMedia.length; i++) {
            const mediaItem = updatedMedia[i];
            
            // Skip items without URL
            if (!mediaItem || !mediaItem.url) continue;
            
            // 1. Fix relative URLs
            if (mediaItem.url.startsWith('/') && !mediaItem.url.startsWith('//')) {
              // Known placeholder images
              let fixedUrl = '';
              if (mediaItem.url === '/yacht-placeholder.jpg') {
                fixedUrl = `${BASE_URL}/images/yacht-placeholder.jpg`;
              } else if (mediaItem.url === '/service-placeholder.jpg') {
                fixedUrl = `${BASE_URL}/images/service-placeholder.jpg`;
              } else if (mediaItem.url === '/product-placeholder.jpg') {
                fixedUrl = `${BASE_URL}/images/product-placeholder.jpg`;
              } else if (mediaItem.url === '/user-placeholder.jpg') {
                fixedUrl = `${BASE_URL}/images/user-placeholder.jpg`;
              } else {
                fixedUrl = `${BASE_URL}${mediaItem.url}`;
              }
              
              console.log(`Fixing relative URL: ${mediaItem.url} -> ${fixedUrl}`);
              
              // Update the URL
              updatedMedia[i] = {
                ...mediaItem,
                url: fixedUrl
              };
              
              // Track the fix
              results.relativeUrlsFixed.push({
                collection,
                docId: doc.id,
                field: 'media',
                subField: `[${i}].url`,
                originalUrl: mediaItem.url,
                fixedUrl
              });
              
              results.stats.relativeUrlsFixed++;
              results.stats.byCollection[collection].relativeUrlsFixed++;
              
              mediaModified = true;
            }
            
            // 2. Fix media type mismatches
            const lowerUrl = mediaItem.url.toLowerCase();
            const isVideoByUrl = VIDEO_PATTERNS.some(pattern => lowerUrl.includes(pattern));
            
            // If URL suggests it's a video but type says image, fix it
            if (isVideoByUrl && mediaItem.type === 'image') {
              console.log(`Fixing media type: ${mediaItem.type} -> video for ${mediaItem.url}`);
              
              // Update the type
              updatedMedia[i] = {
                ...mediaItem,
                type: 'video'
              };
              
              // Track the fix
              results.mediaTypesFixed.push({
                collection,
                docId: doc.id,
                field: 'media',
                subField: `[${i}].type`,
                url: mediaItem.url,
                originalType: mediaItem.type,
                fixedType: 'video'
              });
              
              results.stats.mediaTypesFixed++;
              results.stats.byCollection[collection].mediaTypesFixed++;
              
              mediaModified = true;
            }
          }
          
          // If media array was modified, add it to updates
          if (mediaModified) {
            updates.media = updatedMedia;
            docUpdated = true;
          }
        }
        
        // Handle other common image fields
        const imageFields = ['profilePhoto', 'imageUrl', 'thumbnailUrl', 'coverImage'];
        
        for (const field of imageFields) {
          if (data[field] && typeof data[field] === 'string') {
            const url = data[field];
            
            // Fix relative URLs
            if (url.startsWith('/') && !url.startsWith('//')) {
              let fixedUrl = '';
              
              // Handle known placeholder images
              if (url.includes('placeholder')) {
                const baseName = url.split('/').pop();
                fixedUrl = `${BASE_URL}/images/${baseName}`;
              } else {
                fixedUrl = `${BASE_URL}${url}`;
              }
              
              console.log(`Fixing relative URL in ${field}: ${url} -> ${fixedUrl}`);
              
              // Add to updates
              updates[field] = fixedUrl;
              docUpdated = true;
              
              // Track the fix
              results.relativeUrlsFixed.push({
                collection,
                docId: doc.id,
                field,
                originalUrl: url,
                fixedUrl
              });
              
              results.stats.relativeUrlsFixed++;
              results.stats.byCollection[collection].relativeUrlsFixed++;
            }
          }
        }
        
        // Handle virtual tour images
        if (data.virtualTour && data.virtualTour.scenes && Array.isArray(data.virtualTour.scenes)) {
          const updatedScenes = [...data.virtualTour.scenes];
          let scenesModified = false;
          
          // Process each scene
          for (let i = 0; i < updatedScenes.length; i++) {
            const scene = updatedScenes[i];
            let sceneModified = false;
            
            // Fix imageUrl if it's relative
            if (scene.imageUrl && scene.imageUrl.startsWith('/') && !scene.imageUrl.startsWith('//')) {
              const fixedUrl = `${BASE_URL}${scene.imageUrl}`;
              
              console.log(`Fixing relative URL in virtualTour.scenes[${i}].imageUrl: ${scene.imageUrl} -> ${fixedUrl}`);
              
              updatedScenes[i] = {
                ...scene,
                imageUrl: fixedUrl
              };
              
              // Track the fix
              results.relativeUrlsFixed.push({
                collection,
                docId: doc.id,
                field: 'virtualTour',
                subField: `scenes[${i}].imageUrl`,
                originalUrl: scene.imageUrl,
                fixedUrl
              });
              
              results.stats.relativeUrlsFixed++;
              results.stats.byCollection[collection].relativeUrlsFixed++;
              
              sceneModified = true;
            }
            
            // Fix thumbnailUrl if it's relative
            if (scene.thumbnailUrl && scene.thumbnailUrl.startsWith('/') && !scene.thumbnailUrl.startsWith('//')) {
              const fixedUrl = `${BASE_URL}${scene.thumbnailUrl}`;
              
              console.log(`Fixing relative URL in virtualTour.scenes[${i}].thumbnailUrl: ${scene.thumbnailUrl} -> ${fixedUrl}`);
              
              updatedScenes[i] = {
                ...scene,
                thumbnailUrl: fixedUrl
              };
              
              // Track the fix
              results.relativeUrlsFixed.push({
                collection,
                docId: doc.id,
                field: 'virtualTour',
                subField: `scenes[${i}].thumbnailUrl`,
                originalUrl: scene.thumbnailUrl,
                fixedUrl
              });
              
              results.stats.relativeUrlsFixed++;
              results.stats.byCollection[collection].relativeUrlsFixed++;
              
              sceneModified = true;
            }
            
            if (sceneModified) {
              scenesModified = true;
            }
          }
          
          // If scenes were modified, add them to updates
          if (scenesModified) {
            updates.virtualTour = {
              ...data.virtualTour,
              scenes: updatedScenes
            };
            docUpdated = true;
          }
        }
        
        // Update document if needed
        if (docUpdated) {
          await adminDb.collection(collection).doc(doc.id).update(updates);
          console.log(`Updated document ${doc.id} in ${collection}`);
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collection}:`, error);
    }
  }
  
  return results;
}

/**
 * Save repair results to Firestore
 */
export async function saveRepairResults(results: RepairResults): Promise<string> {
  try {
    const docRef = await adminDb.collection('media_repair_reports').add({
      ...results,
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log(`Media repair results saved to Firestore with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error saving media repair results:', error);
    throw error;
  }
}

/**
 * Print a friendly report
 */
export function printRepairReport(results: RepairResults): void {
  console.log('\n' + '='.repeat(80));
  console.log(`MEDIA REPAIR REPORT - ${results.timestamp}`);
  console.log('='.repeat(80));
  
  console.log('\nSUMMARY:');
  console.log(`Documents processed: ${results.stats.documentsProcessed}`);
  console.log(`Relative URLs fixed: ${results.stats.relativeUrlsFixed}`);
  console.log(`Media types fixed: ${results.stats.mediaTypesFixed}`);
  
  console.log('\nRESULTS BY COLLECTION:');
  Object.entries(results.stats.byCollection).forEach(([collection, stats]) => {
    console.log(`\n  ${collection}:`);
    console.log(`    Documents processed: ${stats.documentsProcessed}`);
    console.log(`    Relative URLs fixed: ${stats.relativeUrlsFixed}`);
    console.log(`    Media types fixed: ${stats.mediaTypesFixed}`);
  });
  
  // Show some example fixes
  if (results.relativeUrlsFixed.length > 0) {
    console.log('\nEXAMPLE RELATIVE URL FIXES:');
    results.relativeUrlsFixed.slice(0, 5).forEach((fix, index) => {
      console.log(`\n  ${index + 1}. ${fix.collection} (${fix.docId}):`);
      console.log(`     Field: ${fix.field}${fix.subField ? '.' + fix.subField : ''}`);
      console.log(`     Original: ${fix.originalUrl}`);
      console.log(`     Fixed: ${fix.fixedUrl}`);
    });
    
    if (results.relativeUrlsFixed.length > 5) {
      console.log(`\n  ... and ${results.relativeUrlsFixed.length - 5} more URL fixes.`);
    }
  }
  
  if (results.mediaTypesFixed.length > 0) {
    console.log('\nEXAMPLE MEDIA TYPE FIXES:');
    results.mediaTypesFixed.slice(0, 5).forEach((fix, index) => {
      console.log(`\n  ${index + 1}. ${fix.collection} (${fix.docId}):`);
      console.log(`     Field: ${fix.field}${fix.subField ? '.' + fix.subField : ''}`);
      console.log(`     URL: ${fix.url}`);
      console.log(`     Original type: ${fix.originalType}`);
      console.log(`     Fixed type: ${fix.fixedType}`);
    });
    
    if (results.mediaTypesFixed.length > 5) {
      console.log(`\n  ... and ${results.mediaTypesFixed.length - 5} more type fixes.`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

/**
 * Main function
 */
export async function main() {
  try {
    console.log('Starting media issues repair script...');
    
    // Run the repair
    const results = await fixMediaIssues();
    
    // Print report
    printRepairReport(results);
    
    // Save results to Firestore
    await saveRepairResults(results);
    
    console.log('Media issues repair completed successfully.');
  } catch (error) {
    console.error('Error in media repair:', error);
  }
}

// For direct execution in ESM context
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('Error running media repair:', error);
  });
}

export default fixMediaIssues;