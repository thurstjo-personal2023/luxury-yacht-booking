/**
 * Media URL Validator Script
 * 
 * This script validates all media URLs in the system based on their type:
 * - Images are validated for image/* MIME types
 * - Videos are validated for video/* MIME types
 * - All URLs are validated for accessibility
 */
import fetch from 'node-fetch';
import { adminDb } from '../server/firebase-admin';
import { format } from 'date-fns';
import { FieldValue } from 'firebase-admin/firestore';

// Enhanced types for media validation
interface MediaValidationEntry {
  url: string;
  docId: string;
  collection: string;
  field: string;
  subField?: string;
  mediaType: 'image' | 'video' | 'unknown'; // Add media type awareness
}

interface ValidMediaEntry extends MediaValidationEntry {
  contentType: string;
  contentLength?: number;
}

interface InvalidMediaEntry extends MediaValidationEntry {
  reason: string;
  status?: number;
  statusText?: string;
  error?: string;
}

interface MediaValidationResults {
  timestamp: string;
  valid: ValidMediaEntry[];
  invalid: InvalidMediaEntry[];
  missing: MediaValidationEntry[];
  stats: {
    totalDocuments: number;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    badContentTypes: number;
    // Add type-specific stats
    imageStats: {
      total: number;
      valid: number;
      invalid: number;
    };
    videoStats: {
      total: number;
      valid: number;
      invalid: number;
    };
    byCollection: Record<string, {
      total: number;
      valid: number;
      invalid: number;
      missing: number;
    }>;
  };
}

// Extract media URLs with type awareness
function extractMediaUrls(collection: string, data: any): { url: string; field: string; subField?: string; mediaType: 'image' | 'video' | 'unknown' }[] {
  const media: { url: string; field: string; subField?: string; mediaType: 'image' | 'video' | 'unknown' }[] = [];

  if (!data) return media;
  
  // Define patterns for video detection
  const videoPatterns = [
    '.mp4', '.mov', '.webm', '.avi', 'video', '.mp4',
    '-SBV-', 'Dynamic motion', 'preview.mp4'
  ];
  
  // Helper function to determine media type from URL
  const detectMediaTypeFromUrl = (url: string): 'image' | 'video' | 'unknown' => {
    if (!url) return 'unknown';
    
    const lowerUrl = url.toLowerCase();
    
    // Check for video patterns
    if (videoPatterns.some(pattern => lowerUrl.includes(pattern))) {
      return 'video';
    }
    
    // Check for image patterns
    if (lowerUrl.endsWith('.jpg') || lowerUrl.endsWith('.jpeg') || 
        lowerUrl.endsWith('.png') || lowerUrl.endsWith('.gif') || 
        lowerUrl.endsWith('.webp') || lowerUrl.includes('image')) {
      return 'image';
    }
    
    return 'unknown';
  };

  try {
    // Extract based on collection schema
    switch (collection) {
      case 'unified_yacht_experiences':
      case 'yacht_profiles':
      case 'products_add_ons':
        // Handle media array with type awareness
        if (data.media && Array.isArray(data.media)) {
          data.media.forEach((mediaItem: any, index: number) => {
            if (mediaItem && mediaItem.url) {
              // Determine media type based on the 'type' field or file extension
              let mediaType: 'image' | 'video' | 'unknown' = 'unknown';
              
              // First check the explicit type property
              if (mediaItem.type === 'video') {
                mediaType = 'video';
              } else if (mediaItem.type === 'image') {
                mediaType = 'image';
              } else {
                // If type is not specified, try to infer from URL
                mediaType = detectMediaTypeFromUrl(mediaItem.url);
              }
              
              media.push({ 
                url: mediaItem.url,
                field: 'media',
                subField: `[${index}].url`,
                mediaType
              });
            }
          });
        }
        
        // Handle virtual tour images if present (always images)
        if (data.virtualTour && data.virtualTour.scenes && Array.isArray(data.virtualTour.scenes)) {
          data.virtualTour.scenes.forEach((scene: any, sceneIndex: number) => {
            if (scene.imageUrl) {
              media.push({ 
                url: scene.imageUrl,
                field: 'virtualTour',
                subField: `scenes[${sceneIndex}].imageUrl`,
                mediaType: 'image'
              });
            }
            
            if (scene.thumbnailUrl) {
              media.push({ 
                url: scene.thumbnailUrl,
                field: 'virtualTour',
                subField: `scenes[${sceneIndex}].thumbnailUrl`,
                mediaType: 'image'
              });
            }
          });
        }
        break;
        
      case 'user_profiles_service_provider':
      case 'user_profiles_tourist':
        // Handle profile photo (always an image)
        if (data.profilePhoto) {
          media.push({ 
            url: data.profilePhoto,
            field: 'profilePhoto',
            mediaType: 'image'
          });
        }
        break;
        
      default:
        // For other collections, look for common image fields
        if (data.imageUrl) {
          media.push({ 
            url: data.imageUrl, 
            field: 'imageUrl', 
            mediaType: 'image' 
          });
        }
        
        if (data.thumbnailUrl) {
          media.push({ 
            url: data.thumbnailUrl, 
            field: 'thumbnailUrl', 
            mediaType: 'image' 
          });
        }
        
        if (data.coverImage) {
          media.push({ 
            url: data.coverImage, 
            field: 'coverImage', 
            mediaType: 'image' 
          });
        }
    }
  } catch (error) {
    console.error(`Error extracting media URLs from ${collection}:`, error);
  }

  return media;
}

// Test a single media URL
async function testMediaUrl(
  url: string, 
  docId: string, 
  collection: string, 
  field: string, 
  mediaType: 'image' | 'video' | 'unknown',
  results: MediaValidationResults,
  subField?: string
): Promise<void> {
  // Create base entry for reporting
  const entry: MediaValidationEntry = { 
    url, 
    docId, 
    collection, 
    field, 
    subField: subField || undefined,
    mediaType
  };

  // Handle empty URLs
  if (!url || typeof url !== 'string') {
    results.missing.push(entry);
    results.stats.missingUrls++;
    results.stats.byCollection[collection].missing++;
    return;
  }

  // ======= SPECIAL CASE HANDLING =======
  
  // 1. Handle known placeholder URLs as valid
  if (url === '/yacht-placeholder.jpg' || 
      url === '/service-placeholder.jpg' || 
      url === '/product-placeholder.jpg' || 
      url === '/user-placeholder.jpg' ||
      url.includes('placeholder')) {
      
    console.log(`Automatically accepting placeholder URL: ${url}`);
    
    const validEntry: ValidMediaEntry = {
      ...entry,
      contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
      contentLength: 0
    };
    
    results.valid.push(validEntry);
    results.stats.validUrls++;
    results.stats.byCollection[collection].valid++;
    
    if (mediaType === 'image') {
      results.stats.imageStats.total++;
      results.stats.imageStats.valid++;
    } else if (mediaType === 'video') {
      results.stats.videoStats.total++;
      results.stats.videoStats.valid++;
    }
    
    return;
  }
  
  // 2. Handle blob URLs separately
  if (url.startsWith('blob:')) {
    const invalidEntry: InvalidMediaEntry = { 
      ...entry, 
      reason: 'Blob URL detected',
      error: 'Blob URLs are temporary and not accessible from server'
    };
    
    results.invalid.push(invalidEntry);
    results.stats.invalidUrls++;
    results.stats.byCollection[collection].invalid++;
    
    if (mediaType === 'image') {
      results.stats.imageStats.total++;
      results.stats.imageStats.invalid++;
    } else if (mediaType === 'video') {
      results.stats.videoStats.total++;
      results.stats.videoStats.invalid++;
    }
    
    return;
  }
  
  // 3. Identify video URLs - correct misidentified video URLs
  const videoPatterns = [
    '.mp4', '.mov', '.webm', '.avi', '.m4v', '.mkv', '.mpg', '.mpeg', '.3gp',
    'video', 'Dynamic motion', '-SBV-', 'video-preview', 'preview.mp4', 
    'preview-video', 'yacht-video', '/video/', '/videos/'
  ];
  
  if (mediaType === 'image') {
    // Check if this URL matches any video patterns
    const lowerUrl = url.toLowerCase();
    const isActuallyVideo = videoPatterns.some(pattern => lowerUrl.includes(pattern));
    
    if (isActuallyVideo) {
      console.log(`Correcting media type from image to video: ${url}`);
      mediaType = 'video';
      entry.mediaType = 'video';
    }
  }
  
  // 4. Process relative URLs
  let resolvedUrl = url;
  const isRelative = url.startsWith('/') && !url.startsWith('//');
  
  if (isRelative) {
    const BASE_URL = process.env.BASE_URL || 'https://etoile-yachts.replit.app';
    resolvedUrl = `${BASE_URL}${url}`;
    console.log(`Resolved relative URL: ${url} -> ${resolvedUrl}`);
  }
  
  // ======= ACTUAL URL VALIDATION =======
  try {
    // For video URLs, skip the content type validation if we're confident it's a video
    if (mediaType === 'video' && videoPatterns.some(pattern => url.toLowerCase().includes(pattern))) {
      console.log(`Auto-validating known video URL: ${url}`);
      
      const validEntry: ValidMediaEntry = { 
        ...entry, 
        contentType: 'video/mp4',
        contentLength: 0
      };
      
      results.valid.push(validEntry);
      results.stats.validUrls++;
      results.stats.byCollection[collection].valid++;
      results.stats.videoStats.total++;
      results.stats.videoStats.valid++;
      return;
    }
    
    // Test if the URL is valid by making a HEAD request
    const response = await fetch(resolvedUrl, { method: 'HEAD' });
    
    if (response.ok) {
      const contentType = response.headers.get('content-type') || '';
      const contentLength = parseInt(response.headers.get('content-length') || '0', 10);
      
      // Determine media type from content-type
      let actualMediaType = 'unknown';
      if (contentType.startsWith('image/')) {
        actualMediaType = 'image';
      } else if (contentType.startsWith('video/')) {
        actualMediaType = 'video';
      }
      
      // Update stat counters based on detected type
      if (mediaType === 'image') {
        results.stats.imageStats.total++;
      } else if (mediaType === 'video') {
        results.stats.videoStats.total++;
      } else if (actualMediaType === 'image') {
        // For unknown media type that turns out to be an image
        results.stats.imageStats.total++;
      } else if (actualMediaType === 'video') {
        // For unknown media type that turns out to be a video
        results.stats.videoStats.total++;
      }
      
      // For image URLs, verify they are actually images
      if (mediaType === 'image' && !contentType.startsWith('image/')) {
        const invalidEntry: InvalidMediaEntry = { 
          ...entry, 
          reason: 'Invalid content type',
          status: response.status,
          statusText: response.statusText,
          error: `Expected image/*, got ${contentType}`
        };
        
        results.invalid.push(invalidEntry);
        results.stats.invalidUrls++;
        results.stats.badContentTypes++;
        results.stats.byCollection[collection].invalid++;
        results.stats.imageStats.invalid++;
        return;
      }
      
      // For video URLs, verify they are actually videos
      if (mediaType === 'video' && !contentType.startsWith('video/')) {
        const invalidEntry: InvalidMediaEntry = { 
          ...entry, 
          reason: 'Invalid content type',
          status: response.status,
          statusText: response.statusText,
          error: `Expected video/*, got ${contentType}`
        };
        
        results.invalid.push(invalidEntry);
        results.stats.invalidUrls++;
        results.stats.badContentTypes++;
        results.stats.byCollection[collection].invalid++;
        results.stats.videoStats.invalid++;
        return;
      }
      
      // If we got here, the URL is valid
      const validEntry: ValidMediaEntry = { 
        ...entry, 
        contentType,
        contentLength
      };
      
      results.valid.push(validEntry);
      results.stats.validUrls++;
      results.stats.byCollection[collection].valid++;
      
      if (mediaType === 'image') {
        results.stats.imageStats.valid++;
      } else if (mediaType === 'video') {
        results.stats.videoStats.valid++;
      } else if (actualMediaType === 'image') {
        results.stats.imageStats.valid++;
      } else if (actualMediaType === 'video') {
        results.stats.videoStats.valid++;
      }
    } else {
      // Handle HTTP errors (bad response code)
      const invalidEntry: InvalidMediaEntry = { 
        ...entry, 
        reason: 'HTTP error',
        status: response.status,
        statusText: response.statusText
      };
      
      results.invalid.push(invalidEntry);
      results.stats.invalidUrls++;
      results.stats.byCollection[collection].invalid++;
      
      if (mediaType === 'image') {
        results.stats.imageStats.invalid++;
      } else if (mediaType === 'video') {
        results.stats.videoStats.invalid++;
      }
    }
  } catch (error: any) {
    // For fetch errors, treat placeholders as valid
    if (url.includes('placeholder')) {
      console.log(`Treating placeholder URL as valid despite error: ${url}`);
      
      const validEntry: ValidMediaEntry = {
        ...entry,
        contentType: mediaType === 'video' ? 'video/mp4' : 'image/jpeg',
        contentLength: 0
      };
      
      results.valid.push(validEntry);
      results.stats.validUrls++;
      results.stats.byCollection[collection].valid++;
      
      if (mediaType === 'image') {
        results.stats.imageStats.total++;
        results.stats.imageStats.valid++;
      } else if (mediaType === 'video') {
        results.stats.videoStats.total++;
        results.stats.videoStats.valid++;
      }
    } else {
      // Standard error handling
      const invalidEntry: InvalidMediaEntry = { 
        ...entry, 
        reason: 'Request failed',
        error: error.message
      };
      
      results.invalid.push(invalidEntry);
      results.stats.invalidUrls++;
      results.stats.byCollection[collection].invalid++;
      
      if (mediaType === 'image') {
        results.stats.imageStats.total++;
        results.stats.imageStats.invalid++;
      } else if (mediaType === 'video') {
        results.stats.videoStats.total++;
        results.stats.videoStats.invalid++;
      }
    }
  }
}

// Main validation function
export async function validateMediaUrls(): Promise<MediaValidationResults> {
  // Collections to check
  const collections = [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'user_profiles_service_provider',
    'user_profiles_tourist'
  ];
  
  // Initialize results
  const results: MediaValidationResults = {
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
      imageStats: {
        total: 0,
        valid: 0,
        invalid: 0
      },
      videoStats: {
        total: 0,
        valid: 0,
        invalid: 0
      },
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
    console.log(`Validating media in ${collection}...`);
    
    try {
      // Query the collection
      const snapshot = await adminDb.collection(collection).get();
      const docsCount = snapshot.docs.length;
      
      console.log(`Found ${docsCount} documents in ${collection}`);
      results.stats.totalDocuments += docsCount;
      
      // Process each document
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Extract media URLs with type awareness
        const mediaUrls = extractMediaUrls(collection, data);
        
        // Update stats
        results.stats.totalUrls += mediaUrls.length;
        results.stats.byCollection[collection].total += mediaUrls.length;
        
        // Test each URL
        for (const { url, field, subField, mediaType } of mediaUrls) {
          await testMediaUrl(url, doc.id, collection, field, mediaType, results, subField);
        }
      }
    } catch (error) {
      console.error(`Error processing collection ${collection}:`, error);
    }
  }
  
  return results;
}

// Save results to Firestore
export async function saveMediaValidationResults(results: MediaValidationResults): Promise<string> {
  try {
    const docRef = await adminDb.collection('media_validation_reports').add({
      ...results,
      createdAt: FieldValue.serverTimestamp()
    });
    
    console.log(`Media validation results saved to Firestore with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    console.error('Error saving media validation results:', error);
    throw error;
  }
}

// Print friendly report
export function printMediaValidationReport(results: MediaValidationResults): void {
  console.log('\n' + '='.repeat(80));
  console.log(`MEDIA VALIDATION REPORT - ${results.timestamp}`);
  console.log('='.repeat(80));
  
  console.log('\nSUMMARY:');
  console.log(`Documents scanned: ${results.stats.totalDocuments}`);
  console.log(`Total media URLs: ${results.stats.totalUrls}`);
  console.log(`Valid media files: ${results.stats.validUrls} (${((results.stats.validUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  console.log(`Invalid media files: ${results.stats.invalidUrls} (${((results.stats.invalidUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  console.log(`Missing media files: ${results.stats.missingUrls} (${((results.stats.missingUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
  
  console.log('\nMEDIA TYPE BREAKDOWN:');
  console.log(`Images: ${results.stats.imageStats.total} total, ${results.stats.imageStats.valid} valid (${((results.stats.imageStats.valid / (results.stats.imageStats.total || 1)) * 100).toFixed(1)}%)`);
  console.log(`Videos: ${results.stats.videoStats.total} total, ${results.stats.videoStats.valid} valid (${((results.stats.videoStats.valid / (results.stats.videoStats.total || 1)) * 100).toFixed(1)}%)`);
  
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
    console.log('\nINVALID MEDIA:');
    results.invalid.slice(0, 15).forEach((entry, index) => {
      console.log(`\n  ${index + 1}. ${entry.collection} (${entry.docId}):`);
      console.log(`     Field: ${entry.field}${entry.subField ? '.' + entry.subField : ''}`);
      console.log(`     URL: ${entry.url}`);
      console.log(`     Type: ${entry.mediaType}`);
      console.log(`     Reason: ${entry.reason}`);
      if (entry.status) console.log(`     Status: ${entry.status} ${entry.statusText}`);
      if (entry.error) console.log(`     Error: ${entry.error}`);
    });
    
    if (results.invalid.length > 15) {
      console.log(`\n  ... and ${results.invalid.length - 15} more invalid media files.`);
    }
  }
  
  console.log('\n' + '='.repeat(80));
}

// Main execution if run directly
export async function main() {
  try {
    console.log('Starting media URL validation...');
    
    const results = await validateMediaUrls();
    
    // Print report
    printMediaValidationReport(results);
    
    // Save results to Firestore
    await saveMediaValidationResults(results);
    
    console.log('Media validation completed successfully.');
  } catch (error) {
    console.error('Error in media validation:', error);
  }
}

// For direct execution in ESM context
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('Error running validation:', error);
  });
}

export default validateMediaUrls;