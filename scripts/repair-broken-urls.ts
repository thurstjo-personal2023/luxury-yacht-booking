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
  } catch (error) {
    console.error('Error finding broken URLs:', error);
    throw error;
  }
}

/**
 * Repair a single broken URL
 * This function will update the document with a placeholder URL
 */
async function repairBrokenUrl(
  brokenUrl: BrokenUrlDetail,
  defaultImageUrl: string = '/yacht-placeholder.jpg',
  defaultVideoUrl: string = '/video-placeholder.mp4'
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
    if (subField && subField.includes('[') && subField.includes(']')) {
      // Handle array fields (e.g., media[0].url)
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
    } else if (data[field] === url) {
      // Handle direct field (e.g., profilePhoto)
      await docRef.update({
        [field]: placeholderUrl,
        lastUpdated: FieldValue.serverTimestamp()
      });
      
      return { success: true, newUrl: placeholderUrl };
    }
    
    return { success: false, newUrl: url };
  } catch (error) {
    console.error(`Error repairing broken URL for ${brokenUrl.docId}:`, error);
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
      report.stats.byCollection[brokenUrl.collection]++;
      
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