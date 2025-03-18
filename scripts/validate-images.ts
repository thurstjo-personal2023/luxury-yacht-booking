/**
 * Image URL Validator Script
 * 
 * This script validates all image URLs in the system to ensure they are accessible
 * and properly formatted. It checks URLs in the following collections:
 * - unified_yacht_experiences
 * - yacht_profiles
 * - products_add_ons
 * - user_profiles_service_provider
 * 
 * For each URL, it:
 * 1. Verifies the URL can be accessed
 * 2. Checks the content type is an image
 * 3. Reports detailed results
 */
import fetch from 'node-fetch';
import { adminDb } from '../server/firebase-admin';
import { format } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';

// Types for validation results
interface ValidationEntry {
  url: string;
  docId: string;
  collection: string;
  field: string;
  subField?: string;
}

interface ValidEntry extends ValidationEntry {
  contentType: string;
  contentLength?: number;
}

interface InvalidEntry extends ValidationEntry {
  reason: string;
  status?: number;
  statusText?: string;
  error?: string;
}

interface ValidationResults {
  timestamp: string;
  valid: ValidEntry[];
  invalid: InvalidEntry[];
  missing: ValidationEntry[];
  stats: {
    totalDocuments: number;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    badContentTypes: number;
    byCollection: Record<string, {
      total: number;
      valid: number;
      invalid: number;
      missing: number;
    }>;
  };
}

// Function to extract image URLs from different collection schemas
function extractImageUrls(collection: string, data: any): { url: string; field: string; subField?: string }[] {
  const urls: { url: string; field: string; subField?: string }[] = [];

  if (!data) return urls;

  try {
    // Extract based on collection schema
    switch (collection) {
      case 'unified_yacht_experiences':
        // Handle media array
        if (data.media && Array.isArray(data.media)) {
          data.media.forEach((mediaItem: any, index: number) => {
            if (mediaItem && mediaItem.url) {
              urls.push({ 
                url: mediaItem.url,
                field: 'media',
                subField: `[${index}].url`
              });
            }
          });
        }
        
        // Handle virtual tour images if present
        if (data.virtualTour && data.virtualTour.scenes && Array.isArray(data.virtualTour.scenes)) {
          data.virtualTour.scenes.forEach((scene: any, sceneIndex: number) => {
            if (scene.imageUrl) {
              urls.push({ 
                url: scene.imageUrl,
                field: 'virtualTour',
                subField: `scenes[${sceneIndex}].imageUrl`
              });
            }
            
            if (scene.thumbnailUrl) {
              urls.push({ 
                url: scene.thumbnailUrl,
                field: 'virtualTour',
                subField: `scenes[${sceneIndex}].thumbnailUrl`
              });
            }
          });
        }
        break;
        
      case 'yacht_profiles':
        // Handle media array
        if (data.media && Array.isArray(data.media)) {
          data.media.forEach((mediaItem: any, index: number) => {
            if (mediaItem && mediaItem.url) {
              urls.push({ 
                url: mediaItem.url,
                field: 'media',
                subField: `[${index}].url`
              });
            }
          });
        }
        break;
        
      case 'products_add_ons':
        // Handle media array
        if (data.media && Array.isArray(data.media)) {
          data.media.forEach((mediaItem: any, index: number) => {
            if (mediaItem && mediaItem.url) {
              urls.push({ 
                url: mediaItem.url,
                field: 'media',
                subField: `[${index}].url`
              });
            }
          });
        }
        break;
        
      case 'user_profiles_service_provider':
        // Handle profile photo
        if (data.profilePhoto) {
          urls.push({ 
            url: data.profilePhoto,
            field: 'profilePhoto'
          });
        }
        break;
        
      case 'user_profiles_tourist':
        // Handle profile photo
        if (data.profilePhoto) {
          urls.push({ 
            url: data.profilePhoto,
            field: 'profilePhoto'
          });
        }
        break;
        
      default:
        // For other collections, look for common image fields
        if (data.imageUrl) {
          urls.push({ url: data.imageUrl, field: 'imageUrl' });
        }
        
        if (data.thumbnailUrl) {
          urls.push({ url: data.thumbnailUrl, field: 'thumbnailUrl' });
        }
        
        if (data.coverImage) {
          urls.push({ url: data.coverImage, field: 'coverImage' });
        }
    }
  } catch (error) {
    console.error(`Error extracting image URLs from ${collection}:`, error);
  }

  return urls;
}

// Function to test a single image URL
async function testImageUrl(
  url: string, 
  docId: string, 
  collection: string, 
  field: string, 
  results: ValidationResults,
  subField?: string
): Promise<void> {
  const entry: ValidationEntry = { url, docId, collection, field, subField: subField || undefined };

  // Skip empty URLs
  if (!url || typeof url !== 'string') {
    results.missing.push(entry);
    
    // Update stats
    results.stats.missingUrls++;
    results.stats.byCollection[collection].missing++;
    return;
  }
  
  try {
    // Test if the URL is valid by making a HEAD request
    const response = await fetch(url, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Check if the content is actually an image
      if (contentType.startsWith('image/')) {
        const validEntry: ValidEntry = { 
          ...entry, 
          contentType,
          contentLength
        };
        
        results.valid.push(validEntry);
        
        // Update stats
        results.stats.validUrls++;
        results.stats.byCollection[collection].valid++;
      } else {
        const invalidEntry: InvalidEntry = { 
          ...entry, 
          reason: 'Invalid content type',
          status: response.status,
          statusText: response.statusText,
          error: `Expected image, got ${contentType}`
        };
        
        results.invalid.push(invalidEntry);
        
        // Update stats
        results.stats.invalidUrls++;
        results.stats.badContentTypes++;
        results.stats.byCollection[collection].invalid++;
      }
    } else {
      const invalidEntry: InvalidEntry = { 
        ...entry, 
        reason: 'HTTP error',
        status: response.status,
        statusText: response.statusText
      };
      
      results.invalid.push(invalidEntry);
      
      // Update stats
      results.stats.invalidUrls++;
      results.stats.byCollection[collection].invalid++;
    }
  } catch (error: any) {
    const invalidEntry: InvalidEntry = { 
      ...entry, 
      reason: 'Request failed',
      error: error.message
    };
    
    results.invalid.push(invalidEntry);
    
    // Update stats
    results.stats.invalidUrls++;
    results.stats.byCollection[collection].invalid++;
  }
}

// Main validation function
export async function validateImageUrls(): Promise<ValidationResults> {
  // Collections to check
  const collections = [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'user_profiles_service_provider',
    'user_profiles_tourist'
  ];
  
  // Initialize results
  const results: ValidationResults = {
    timestamp: format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    valid: [],
    invalid: [],
    missing: [],
    stats: {
      totalDocuments: 0,
      totalUrls: 0,
      validUrls: 0,
      invalidUrls: 0,
      missingUrls: 0,
      badContentTypes: 0,
      byCollection: {}
    }
  };
  
  // Initialize collection stats
  for (const collection of collections) {
    results.stats.byCollection[collection] = {
      total: 0,
      valid: 0,
      invalid: 0,
      missing: 0
    };
  }
  
  // Process each collection
  for (const collection of collections) {
    console.log(`Validating images in ${collection}...`);
    
    try {
      // Query the collection
      const snapshot = await adminDb.collection(collection).get();
      const docsCount = snapshot.docs.length;
      
      console.log(`Found ${docsCount} documents in ${collection}`);
      results.stats.totalDocuments += docsCount;
      
      // Process each document
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Extract image URLs
        const urls = extractImageUrls(collection, data);
        
        // Update stats
        results.stats.totalUrls += urls.length;
        results.stats.byCollection[collection].total += urls.length;
        
        // Test each URL
        for (const { url, field, subField } of urls) {
          await testImageUrl(url, doc.id, collection, field, results, subField);
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collection}:`, error);
    }
  }
  
  return results;
}

// Print friendly report
function printValidationReport(results: ValidationResults): void {
  console.log('\n' + '='.repeat(80));
  console.log(`IMAGE VALIDATION REPORT - ${results.timestamp}`);
  console.log('='.repeat(80));
  
  console.log('\nSUMMARY:');
  console.log(`Documents scanned: ${results.stats.totalDocuments}`);
  console.log(`Total image URLs: ${results.stats.totalUrls}`);
  console.log(`Valid images: ${results.stats.validUrls} (${((results.stats.validUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  console.log(`Invalid images: ${results.stats.invalidUrls} (${((results.stats.invalidUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  console.log(`Missing images: ${results.stats.missingUrls} (${((results.stats.missingUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  console.log(`Bad content types: ${results.stats.badContentTypes}`);
  
  console.log('\nRESULTS BY COLLECTION:');
  Object.entries(results.stats.byCollection).forEach(([collection, stats]) => {
    console.log(`\n  ${collection}:`);
    console.log(`    Total URLs: ${stats.total}`);
    console.log(`    Valid: ${stats.valid} (${stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0}%)`);
    console.log(`    Invalid: ${stats.invalid} (${stats.total > 0 ? ((stats.invalid / stats.total) * 100).toFixed(1) : 0}%)`);
    console.log(`    Missing: ${stats.missing} (${stats.total > 0 ? ((stats.missing / stats.total) * 100).toFixed(1) : 0}%)`);
  });
  
  // Report detailed errors
  if (results.invalid.length > 0) {
    console.log('\nINVALID IMAGES:');
    results.invalid.slice(0, 15).forEach((entry, index) => {
      console.log(`\n  ${index + 1}. ${entry.collection} (${entry.docId}):`);
      console.log(`     Field: ${entry.field}${entry.subField ? '.' + entry.subField : ''}`);
      console.log(`     URL: ${entry.url}`);
      console.log(`     Reason: ${entry.reason}`);
      if (entry.status) console.log(`     Status: ${entry.status} ${entry.statusText}`);
      if (entry.error) console.log(`     Error: ${entry.error}`);
    });
    
    if (results.invalid.length > 15) {
      console.log(`\n  ... and ${results.invalid.length - 15} more invalid images.`);
    }
  }
  
  if (results.missing.length > 0) {
    console.log('\nMISSING IMAGES:');
    results.missing.slice(0, 15).forEach((entry, index) => {
      console.log(`\n  ${index + 1}. ${entry.collection} (${entry.docId}):`);
      console.log(`     Field: ${entry.field}${entry.subField ? '.' + entry.subField : ''}`);
    });
    
    if (results.missing.length > 15) {
      console.log(`\n  ... and ${results.missing.length - 15} more missing images.`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Save results to Firestore
async function saveValidationResults(results: ValidationResults): Promise<string> {
  try {
    const docRef = await adminDb.collection('image_validation_reports').add({
      ...results,
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log(`Validation results saved to Firestore with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error saving validation results:', error);
    throw error;
  }
}

// Main execution if run directly
async function main() {
  try {
    console.log('Starting image URL validation...');
    
    const results = await validateImageUrls();
    
    // Print report
    printValidationReport(results);
    
    // Save results to Firestore
    await saveValidationResults(results);
    
    console.log('Image validation completed successfully.');
  } catch (error) {
    console.error('Error in image validation:', error);
  }
}

// For direct execution in ESM context
main().catch(error => {
  console.error('Error running validation:', error);
});

export default validateImageUrls;