/**
 * Broken URL Repair Utility
 * 
 * This utility identifies and repairs broken external URLs in the database.
 * It can replace broken URLs with placeholders, archive broken references,
 * and provide a report of all repaired URLs.
 */
import { adminDb } from '../server/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

interface BrokenUrlDetail {
  docId: string;
  collection: string;
  field: string; 
  subField?: string;
  url: string;
  reason: string;
  mediaType?: 'image' | 'video' | 'unknown';
}

interface RepairReport {
  timestamp: string;
  repairedUrls: {
    docId: string;
    collection: string;
    field: string;
    subField?: string;
    oldUrl: string;
    newUrl: string;
    mediaType?: 'image' | 'video' | 'unknown';
  }[];
  stats: {
    totalIdentified: number;
    totalRepaired: number;
    imageCount: number;
    videoCount: number;
    byCollection: Record<string, number>;
  }
}

/**
 * Find all broken URLs from the latest validation report
 */
async function findBrokenUrls(): Promise<BrokenUrlDetail[]> {
  try {
    // First try to get broken URLs from media validation reports
    const mediaReportsSnapshot = await adminDb.collection('media_validation_reports')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (!mediaReportsSnapshot.empty) {
      const mediaReport = mediaReportsSnapshot.docs[0].data();
      const brokenUrls: BrokenUrlDetail[] = [];
      
      // Extract all invalid URLs
      if (mediaReport.invalid && Array.isArray(mediaReport.invalid)) {
        for (const entry of mediaReport.invalid) {
          if (entry.reason === 'HTTP error' || entry.status === 404) {
            brokenUrls.push({
              docId: entry.docId,
              collection: entry.collection,
              field: entry.field,
              subField: entry.subField,
              url: entry.url,
              mediaType: entry.mediaType,
              reason: `HTTP ${entry.status || 'error'}: ${entry.statusText || entry.error || 'Unknown'}`
            });
          }
        }
      }
      
      if (brokenUrls.length > 0) {
        return brokenUrls;
      }
    }
    
    // Fallback to legacy image validation reports if no media validation reports exist
    const imageReportsSnapshot = await adminDb.collection('image_validation_reports')
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    
    if (imageReportsSnapshot.empty) {
      console.log('No validation reports found');
      return [];
    }
    
    const imageReport = imageReportsSnapshot.docs[0].data();
    const brokenUrls: BrokenUrlDetail[] = [];
    
    // Extract all invalid URLs
    if (imageReport.invalid && Array.isArray(imageReport.invalid)) {
      for (const entry of imageReport.invalid) {
        if (entry.reason === 'HTTP error' || entry.status === 404) {
          brokenUrls.push({
            docId: entry.docId,
            collection: entry.collection,
            field: entry.field,
            subField: entry.subField,
            url: entry.url,
            mediaType: 'image', // Assume image type for legacy reports
            reason: `HTTP ${entry.status || 'error'}: ${entry.statusText || entry.error || 'Unknown'}`
          });
        }
      }
    }
    
    return brokenUrls;
  } catch (error: any) {
    console.error('Error finding broken URLs:', error.message || String(error));
    throw error;
  }
}

/**
 * Repair a single broken URL
 * This function will update the document with a placeholder URL
 */
async function repairBrokenUrl(
  brokenUrl: BrokenUrlDetail,
  defaultImageUrl: string = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/image-placeholder.jpg',
  defaultVideoUrl: string = 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4'
): Promise<{ success: boolean; newUrl: string }> {
  try {
    const { docId, collection, field, subField, url, mediaType } = brokenUrl;
    
    // Determine placeholder based on URL and mediaType
    let placeholderUrl = defaultImageUrl; // Default to image
    
    if (mediaType === 'video') {
      placeholderUrl = defaultVideoUrl;
    } else if (!mediaType) {
      // If mediaType is not specified, try to determine from URL
      const isVideo = url.toLowerCase().endsWith('.mp4') || 
                     url.toLowerCase().endsWith('.mov') || 
                     url.toLowerCase().endsWith('.webm');
      
      if (isVideo) {
        placeholderUrl = defaultVideoUrl;
      }
    }
    
    // Get document reference
    const docRef = adminDb.collection(collection).doc(docId);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      console.log(`Document ${docId} in ${collection} not found`);
      return { success: false, newUrl: url };
    }
    
    const data = doc.data();
    
    // Update document based on field and subField
    if (!data) {
      console.log(`Document data is undefined for ${docId} in ${collection}`);
      return { success: false, newUrl: url };
    }

    // Case 1: Handle direct field that contains an array (common in yacht listings)
    if (field === 'media' && Array.isArray(data.media)) {
      let updated = false;
      const updatedMedia = [...data.media];
      
      // Check all items in the media array
      for (let i = 0; i < updatedMedia.length; i++) {
        // Handle 'url' field in media objects
        if (updatedMedia[i] && updatedMedia[i].url === url) {
          updatedMedia[i] = {
            ...updatedMedia[i],
            url: placeholderUrl
          };
          updated = true;
        }
      }
      
      if (updated) {
        await docRef.update({
          media: updatedMedia,
          lastUpdated: FieldValue.serverTimestamp()
        });
        return { success: true, newUrl: placeholderUrl };
      }
    }
    
    // Case 2: Handle array fields with subField notation (e.g., media[0].url)
    if (subField && subField.includes('[') && subField.includes(']')) {
      const arrayMatch = subField.match(/\[(\d+)\]/);
      if (arrayMatch && data[field] && Array.isArray(data[field])) {
        const index = parseInt(arrayMatch[1]);
        if (data[field][index]) {
          // Get property name after the array index
          const propMatch = subField.match(/\]\.(.*)/);
          if (propMatch) {
            const propName = propMatch[1];
            
            // Update the specific property
            if (data[field][index][propName] === url) {
              // Clone the array to avoid direct mutations
              const updatedArray = [...data[field]];
              updatedArray[index] = {
                ...updatedArray[index],
                [propName]: placeholderUrl
              };
              
              // Update Firestore with the modified array
              await docRef.update({
                [field]: updatedArray,
                lastUpdated: FieldValue.serverTimestamp()
              });
              
              return { success: true, newUrl: placeholderUrl };
            }
          }
        }
      }
    } 
    // Case 3: Handle direct field (e.g., profilePhoto)
    else if (data[field] === url) {
      await docRef.update({
        [field]: placeholderUrl,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      return { success: true, newUrl: placeholderUrl };
    }
    
    // Case 4: Handle field path notation (e.g., "media.0.url")
    if (field.includes('.')) {
      // Split the field path
      const fieldParts = field.split('.');
      
      // Navigate to the nested field
      let currentObj: any = data;
      let parentObj: any = null;
      let lastKey: string = '';
      
      for (let i = 0; i < fieldParts.length; i++) {
        const part = fieldParts[i];
        
        // Handle array index (numeric part)
        if (!isNaN(parseInt(part)) && Array.isArray(currentObj)) {
          parentObj = currentObj;
          currentObj = currentObj[parseInt(part)];
          lastKey = part; // Keep as string for consistency
        } 
        // Handle normal object properties
        else if (currentObj && typeof currentObj === 'object') {
          parentObj = currentObj;
          currentObj = currentObj[part];
          lastKey = part;
        } else {
          // Path doesn't exist
          break;
        }
        
        // If we've reached the last part and it matches the URL
        if (i === fieldParts.length - 1 && currentObj === url) {
          // Create update object with the correct field path
          if (parentObj && Array.isArray(parentObj)) {
            // Make a deep copy of the array
            const updatedArray = JSON.parse(JSON.stringify(parentObj));
            // Update the specific index
            const idx = parseInt(lastKey);
            if (!isNaN(idx) && idx >= 0 && idx < updatedArray.length) {
              updatedArray[idx] = placeholderUrl;
            }
            
            // Construct the update path for the parent array
            const parentPath = fieldParts.slice(0, -1).join('.');
            
            await docRef.update({
              [parentPath]: updatedArray,
              lastUpdated: FieldValue.serverTimestamp()
            });
            
            return { success: true, newUrl: placeholderUrl };
          } else if (parentObj && typeof parentObj === 'object') {
            // Update the specific property using the full field path as the document path
            await docRef.update({
              [field]: placeholderUrl,
              lastUpdated: FieldValue.serverTimestamp()
            });
            
            return { success: true, newUrl: placeholderUrl };
          }
        }
      }
    }
    
    return { success: false, newUrl: url };
  } catch (error: any) {
    console.error(`Error repairing broken URL for ${brokenUrl.docId}:`, error.message || String(error));
    return { success: false, newUrl: brokenUrl.url };
  }
}

/**
 * Repair all broken URLs
 */
export async function repairAllBrokenUrls(): Promise<RepairReport> {
  const brokenUrls = await findBrokenUrls();
  
  const report: RepairReport = {
    timestamp: new Date().toISOString(),
    repairedUrls: [],
    stats: {
      totalIdentified: brokenUrls.length,
      totalRepaired: 0,
      imageCount: 0,
      videoCount: 0,
      byCollection: {}
    }
  };
  
  // Initialize collection stats
  for (const url of brokenUrls) {
    if (!report.stats.byCollection[url.collection]) {
      report.stats.byCollection[url.collection] = 0;
    }
  }
  
  // Process each broken URL
  for (const brokenUrl of brokenUrls) {
    console.log(`Repairing URL in ${brokenUrl.collection}/${brokenUrl.docId}: ${brokenUrl.url}`);
    
    const { success, newUrl } = await repairBrokenUrl(brokenUrl);
    
    if (success) {
      report.repairedUrls.push({
        docId: brokenUrl.docId,
        collection: brokenUrl.collection,
        field: brokenUrl.field,
        subField: brokenUrl.subField,
        oldUrl: brokenUrl.url,
        newUrl,
        mediaType: brokenUrl.mediaType
      });
      
      report.stats.totalRepaired++;
      
      // Use type assertion to handle collection stats
      const collectionName = brokenUrl.collection as keyof typeof report.stats.byCollection;
      if (typeof report.stats.byCollection[collectionName] === 'number') {
        report.stats.byCollection[collectionName]++;
      }
      
      // Update media type stats
      if (brokenUrl.mediaType === 'video') {
        report.stats.videoCount++;
      } else {
        report.stats.imageCount++;
      }
      
      console.log(`✅ Successfully repaired URL in ${brokenUrl.collection}/${brokenUrl.docId}`);
    } else {
      console.log(`❌ Failed to repair URL in ${brokenUrl.collection}/${brokenUrl.docId}`);
    }
  }
  
  // Save report to Firestore
  await adminDb.collection('url_repair_reports').add({
    ...report,
    createdAt: FieldValue.serverTimestamp()
  });
  
  return report;
}

// Main execution if run directly
async function main() {
  try {
    console.log('Starting broken URL repair...');
    
    const report = await repairAllBrokenUrls();
    
    console.log(`\nRepair Complete:`);
    console.log(`Found ${report.stats.totalIdentified} broken URLs`);
    console.log(`Repaired ${report.stats.totalRepaired} URLs`);
    console.log(`Images: ${report.stats.imageCount}, Videos: ${report.stats.videoCount}`);
    
    console.log('\nResults by collection:');
    for (const [collection, count] of Object.entries(report.stats.byCollection)) {
      if (count > 0) {
        console.log(`- ${collection}: ${count} URLs repaired`);
      }
    }
    
    console.log('\nBroken URL repair completed successfully.');
  } catch (error) {
    console.error('Error in broken URL repair:', error);
  }
}

// For direct execution in ESM context
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(error => {
    console.error('Error running broken URL repair:', error);
  });
}

export default repairAllBrokenUrls;