/**
 * Media Validation Worker
 * 
 * This module processes media validation tasks from Pub/Sub.
 * It's designed to run as a Cloud Function that processes one
 * message at a time, validating media URLs in Firestore documents.
 */
const admin = require('firebase-admin');
const fetch = require('node-fetch');
const { v4: uuidv4 } = require('uuid');

// Utility function to check if a URL is an image
async function isImageUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return { isValid: false, status: response.status, statusText: response.statusText };
    
    const contentType = response.headers.get('content-type');
    if (!contentType) return { isValid: false, error: 'No content type header' };
    
    return {
      isValid: contentType.startsWith('image/'),
      contentType,
      status: response.status,
      statusText: response.statusText
    };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

// Utility function to check if a URL is a video
async function isVideoUrl(url) {
  try {
    // First try with HEAD request
    const response = await fetch(url, { method: 'HEAD' });
    if (!response.ok) return { isValid: false, status: response.status, statusText: response.statusText };
    
    const contentType = response.headers.get('content-type');
    if (!contentType) return { isValid: false, error: 'No content type header' };
    
    // Check if content type indicates video
    const isVideo = contentType.startsWith('video/');
    
    // If content type indicates video, or URL contains video indicators, it's likely a video
    const videoPatterns = [
      '-SBV-',
      'Dynamic motion',
      '.mp4',
      '.mov',
      '.avi',
      '.webm',
      'video/'
    ];
    
    const containsVideoPattern = videoPatterns.some(pattern => url.includes(pattern));
    
    return {
      isValid: isVideo || containsVideoPattern,
      contentType,
      status: response.status,
      statusText: response.statusText,
      isVideoByPattern: containsVideoPattern
    };
  } catch (error) {
    // Check if URL contains video indicators even if request failed
    const videoPatterns = [
      '-SBV-',
      'Dynamic motion',
      '.mp4',
      '.mov',
      '.avi',
      '.webm',
      'video/'
    ];
    
    const containsVideoPattern = videoPatterns.some(pattern => url.includes(pattern));
    
    if (containsVideoPattern) {
      return { isValid: true, isVideoByPattern: true, error: error.message };
    }
    
    return { isValid: false, error: error.message };
  }
}

// Utility function to validate a media URL
async function validateMediaUrl(url, expectedType = 'image') {
  // Skip invalid or empty URLs
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return { isValid: false, error: 'Empty or invalid URL' };
  }
  
  // Skip relative URLs for now (they will be reported as invalid)
  if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
    return { isValid: false, error: 'Relative URL' };
  }
  
  // Skip blob URLs
  if (url.startsWith('blob:')) {
    return { isValid: false, error: 'Blob URL' };
  }
  
  try {
    // Validate based on expected type
    if (expectedType === 'image') {
      const imageResult = await isImageUrl(url);
      
      // If URL is an image, it's valid
      if (imageResult.isValid) {
        return { isValid: true, contentType: imageResult.contentType };
      }
      
      // If URL is not an image, check if it's a video
      const videoResult = await isVideoUrl(url);
      if (videoResult.isValid) {
        return { 
          isValid: false, 
          contentType: videoResult.contentType || 'video/*',
          error: 'Expected image, got video' 
        };
      }
      
      // Not an image or video
      return { 
        isValid: false, 
        status: imageResult.status,
        statusText: imageResult.statusText,
        error: imageResult.error || 'Not an image'
      };
    } 
    else if (expectedType === 'video') {
      const videoResult = await isVideoUrl(url);
      
      // If URL is a video, it's valid
      if (videoResult.isValid) {
        return { isValid: true, contentType: videoResult.contentType };
      }
      
      // If URL is not a video, check if it's an image
      const imageResult = await isImageUrl(url);
      if (imageResult.isValid) {
        return { 
          isValid: false, 
          contentType: imageResult.contentType,
          error: 'Expected video, got image' 
        };
      }
      
      // Not a video or image
      return { 
        isValid: false, 
        status: videoResult.status,
        statusText: videoResult.statusText,
        error: videoResult.error || 'Not a video'
      };
    }
    else {
      // For generic media, check both image and video
      const imageResult = await isImageUrl(url);
      if (imageResult.isValid) {
        return { 
          isValid: true, 
          contentType: imageResult.contentType,
          mediaType: 'image'
        };
      }
      
      const videoResult = await isVideoUrl(url);
      if (videoResult.isValid) {
        return { 
          isValid: true, 
          contentType: videoResult.contentType,
          mediaType: 'video'
        };
      }
      
      // Not an image or video
      return { 
        isValid: false, 
        status: imageResult.status || videoResult.status,
        statusText: imageResult.statusText || videoResult.statusText,
        error: imageResult.error || videoResult.error || 'Not a valid media URL'
      };
    }
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

// Helper to process media fields in a document
async function processMediaFields(
  documentRef, 
  documentData, 
  reportData = {}, 
  config = {}
) {
  const { collection, documentId } = documentRef;
  const invalidUrls = [];
  const validUrls = [];
  let hasChanges = false;
  
  // Define replacer for relative URLs
  function getAbsoluteUrl(relativeUrl) {
    if (!relativeUrl || typeof relativeUrl !== 'string') return '';
    
    // If URL is already absolute, return as is
    if (relativeUrl.startsWith('http')) return relativeUrl;
    
    // Production domain
    return `https://www.etoileyachts.com${relativeUrl.startsWith('/') ? relativeUrl : `/${relativeUrl}`}`;
  }
  
  // Recursive function to scan object properties
  async function scanObject(obj, path = '', parentProp = null) {
    if (!obj || typeof obj !== 'object') return;
    
    // Handle arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        const itemPath = `${path}[${i}]`;
        
        // If item is an object (including arrays), scan it recursively
        if (item && typeof item === 'object') {
          await scanObject(item, itemPath);
        }
        // If item is a string that might be a URL, validate it
        else if (typeof item === 'string' && isLikelyUrl(item)) {
          const expectedType = detectExpectedType(parentProp, itemPath);
          const validationResult = await validateMediaUrl(item, expectedType);
          
          // Record validation result
          recordValidationResult(item, itemPath, validationResult);
          
          // Apply fixes if configured
          if (config.autoFix) {
            const fixedUrl = applyFixes(item, validationResult);
            if (fixedUrl !== item) {
              obj[i] = fixedUrl;
              hasChanges = true;
            }
          }
        }
      }
    }
    // Handle objects
    else {
      for (const [key, value] of Object.entries(obj)) {
        const propPath = path ? `${path}.${key}` : key;
        
        // Special handling for media fields
        if (key === 'media' && Array.isArray(value)) {
          // Process each media item
          for (let i = 0; i < value.length; i++) {
            const media = value[i];
            const mediaPath = `${propPath}[${i}]`;
            
            // Scan media object recursively
            if (media && typeof media === 'object') {
              await scanObject(media, mediaPath, 'media');
            }
          }
        }
        // Special handling for url/mediaUrl/imageUrl fields
        else if (['url', 'mediaUrl', 'imageUrl', 'videoUrl', 'thumbnailUrl'].includes(key) && typeof value === 'string') {
          const expectedType = detectExpectedType(key);
          const validationResult = await validateMediaUrl(value, expectedType);
          
          // Record validation result
          recordValidationResult(value, propPath, validationResult);
          
          // Apply fixes if configured
          if (config.autoFix) {
            const fixedUrl = applyFixes(value, validationResult);
            if (fixedUrl !== value) {
              obj[key] = fixedUrl;
              hasChanges = true;
            }
          }
        }
        // If value is an object (including arrays), scan it recursively
        else if (value && typeof value === 'object') {
          await scanObject(value, propPath, key);
        }
        // If value is a string that might be a URL, validate it
        else if (typeof value === 'string' && isLikelyUrl(value)) {
          // Check if key suggests it's a media URL
          if (key.toLowerCase().includes('image') || key.toLowerCase().includes('photo')) {
            const validationResult = await validateMediaUrl(value, 'image');
            
            // Record validation result
            recordValidationResult(value, propPath, validationResult);
            
            // Apply fixes if configured
            if (config.autoFix) {
              const fixedUrl = applyFixes(value, validationResult);
              if (fixedUrl !== value) {
                obj[key] = fixedUrl;
                hasChanges = true;
              }
            }
          }
          else if (key.toLowerCase().includes('video')) {
            const validationResult = await validateMediaUrl(value, 'video');
            
            // Record validation result
            recordValidationResult(value, propPath, validationResult);
            
            // Apply fixes if configured
            if (config.autoFix) {
              const fixedUrl = applyFixes(value, validationResult);
              if (fixedUrl !== value) {
                obj[key] = fixedUrl;
                hasChanges = true;
              }
            }
          }
        }
      }
    }
  }
  
  // Helper to determine if a string is likely a URL
  function isLikelyUrl(str) {
    if (!str || typeof str !== 'string') return false;
    
    return (
      str.startsWith('http') || 
      str.startsWith('/') ||
      str.startsWith('blob:') ||
      (str.includes('.') && str.includes('/'))
    );
  }
  
  // Helper to detect expected media type
  function detectExpectedType(key, path = '') {
    // Default to image if no hints
    if (!key) return 'image';
    
    // Check key name for hints
    const keyLower = key.toLowerCase();
    if (keyLower.includes('video') || path.toLowerCase().includes('video')) {
      return 'video';
    }
    if (keyLower.includes('image') || keyLower.includes('photo') || 
        path.toLowerCase().includes('image') || path.toLowerCase().includes('photo')) {
      return 'image';
    }
    
    // For media arrays, check the type property
    if (keyLower === 'media' || path.toLowerCase().includes('media')) {
      return 'auto';
    }
    
    // Default to auto (will check both image and video)
    return 'auto';
  }
  
  // Helper to record validation result
  function recordValidationResult(url, field, result) {
    const validationRecord = {
      url,
      field,
      isValid: result.isValid,
      collection,
      documentId,
      timestamp: Date.now()
    };
    
    // Add status code if available
    if (result.status) {
      validationRecord.status = result.status;
      validationRecord.statusText = result.statusText;
    }
    
    // Add error message if available
    if (result.error) {
      validationRecord.error = result.error;
    }
    
    // Add content type if available
    if (result.contentType) {
      validationRecord.contentType = result.contentType;
    }
    
    // Add to appropriate list
    if (result.isValid) {
      validUrls.push(validationRecord);
    } else {
      invalidUrls.push(validationRecord);
    }
    
    // Update report data
    if (!reportData.collections) reportData.collections = {};
    if (!reportData.collections[collection]) {
      reportData.collections[collection] = {
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0
      };
    }
    
    reportData.collections[collection].totalUrls++;
    if (result.isValid) {
      reportData.collections[collection].validUrls++;
    } else {
      reportData.collections[collection].invalidUrls++;
    }
  }
  
  // Helper to apply fixes based on config
  function applyFixes(url, validationResult) {
    // Skip if URL is valid
    if (validationResult.isValid) return url;
    
    // Fix relative URLs
    if (config.fixRelativeUrls && 
        (url.startsWith('/') || url.startsWith('./') || url.startsWith('../'))) {
      return getAbsoluteUrl(url);
    }
    
    // Handle media type mismatches
    if (config.fixMediaTypes && validationResult.contentType) {
      // If expected image but got video, use placeholder
      if (validationResult.error === 'Expected image, got video') {
        return '/video-thumbnail-placeholder.jpg';
      }
      
      // If expected video but got image, keep as is
      if (validationResult.error === 'Expected video, got image') {
        return url;
      }
    }
    
    // No fixes applied
    return url;
  }
  
  // Process the document data
  await scanObject(documentData);
  
  return {
    hasChanges,
    documentData: hasChanges ? documentData : null,
    invalidUrls,
    validUrls
  };
}

/**
 * Process media validation messages from Pub/Sub
 * 
 * @param {Object} message Pub/Sub message
 * @returns {Promise<void>}
 */
async function mediaValidationWorker(message) {
  // Check if we have a valid message
  if (!message || !message.data) {
    console.error('Invalid message format, missing data');
    return { error: 'Invalid message format, missing data' };
  }
  
  // Parse the message data
  let messageData;
  try {
    const dataString = Buffer.from(message.data, 'base64').toString();
    messageData = JSON.parse(dataString);
    console.log('Received media validation task:', messageData.taskId);
  } catch (error) {
    console.error('Error parsing message data:', error);
    return { error: 'Error parsing message data' };
  }
  
  // Get Firestore instance
  const db = admin.firestore();
  
  // Create/update the task in Firestore
  const taskRef = db.collection('media_validation_tasks').doc(messageData.taskId || `task-${Date.now()}`);
  await taskRef.set({
    ...messageData,
    status: 'processing',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true });
  
  // Create a new report for this validation run
  const reportId = messageData.reportId || `report-${Date.now()}-${uuidv4().substring(0, 8)}`;
  const reportRef = db.collection('media_validation_reports').doc(reportId);
  
  // Get the collections to validate
  const collections = messageData.collections || [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'articles_and_guides',
    'event_announcements'
  ];
  
  // Initialize report data
  const reportData = {
    status: 'started',
    taskId: messageData.taskId,
    reportId,
    collections: {},
    totalCollections: collections.length,
    completedCollections: 0,
    started: Date.now(),
    updated: Date.now()
  };
  
  // Save initial report
  await reportRef.set(reportData);
  
  // Update task with report ID
  await taskRef.update({
    reportId,
    status: 'processing',
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  try {
    // Process each collection
    for (let i = 0; i < collections.length; i++) {
      const collection = collections[i];
      console.log(`Processing collection: ${collection} (${i + 1}/${collections.length})`);
      
      // Update report
      reportData.currentCollection = collection;
      reportData.updated = Date.now();
      await reportRef.update({
        status: 'processing',
        currentCollection: collection,
        updated: Date.now()
      });
      
      // Get documents from the collection
      const querySnapshot = await db.collection(collection).get();
      console.log(`Found ${querySnapshot.size} documents in ${collection}`);
      
      // Initialize collection stats
      reportData.collections[collection] = {
        totalDocuments: querySnapshot.size,
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0,
        processedDocuments: 0,
        startedAt: Date.now()
      };
      
      // Process each document in batches
      const batchSize = messageData.batchSize || 50;
      let invalidUrlsCount = 0;
      let validUrlsCount = 0;
      let updatedDocumentsCount = 0;
      
      // Process documents in batches
      for (let j = 0; j < querySnapshot.size; j += batchSize) {
        const batch = db.batch();
        let batchUpdates = 0;
        
        // Process documents in this batch
        const endIndex = Math.min(j + batchSize, querySnapshot.size);
        for (let k = j; k < endIndex; k++) {
          const doc = querySnapshot.docs[k];
          
          // Skip documents without data
          if (!doc.exists) continue;
          
          const documentData = doc.data();
          const documentRef = {
            collection,
            documentId: doc.id
          };
          
          // Process media fields in the document
          const result = await processMediaFields(
            documentRef, 
            documentData, 
            reportData,
            messageData.workerConfig || {}
          );
          
          // If document has changes, add to batch
          if (result.hasChanges && result.documentData) {
            batch.update(doc.ref, result.documentData);
            batchUpdates++;
            updatedDocumentsCount++;
          }
          
          // Add invalid URLs to report subcollection
          for (const invalidUrl of result.invalidUrls) {
            invalidUrlsCount++;
            
            // Add to subcollection
            batch.set(
              reportRef.collection('invalid_urls').doc(`${collection}-${doc.id}-${invalidUrlsCount}`),
              invalidUrl
            );
          }
          
          // Count valid URLs
          validUrlsCount += result.validUrls.length;
          
          // Update collection stats
          reportData.collections[collection].processedDocuments++;
          reportData.collections[collection].validUrls += result.validUrls.length;
          reportData.collections[collection].invalidUrls += result.invalidUrls.length;
          reportData.collections[collection].totalUrls += result.validUrls.length + result.invalidUrls.length;
        }
        
        // Commit the batch if there are updates
        if (batchUpdates > 0) {
          await batch.commit();
          console.log(`Committed batch with ${batchUpdates} updates for collection ${collection}`);
        }
        
        // Update report
        reportData.updated = Date.now();
        reportData.collections[collection].lastUpdated = Date.now();
        await reportRef.update({
          collections: reportData.collections,
          updated: reportData.updated
        });
      }
      
      // Update collection completion
      reportData.collections[collection].completedAt = Date.now();
      reportData.collections[collection].duration = 
        reportData.collections[collection].completedAt - reportData.collections[collection].startedAt;
      reportData.completedCollections++;
      
      // Update report
      await reportRef.update({
        collections: reportData.collections,
        completedCollections: reportData.completedCollections,
        updated: Date.now()
      });
      
      console.log(`Completed collection ${collection}: ${invalidUrlsCount} invalid URLs, ${validUrlsCount} valid URLs, ${updatedDocumentsCount} documents updated`);
    }
    
    // Mark task and report as completed
    reportData.status = 'completed';
    reportData.completed = Date.now();
    reportData.duration = reportData.completed - reportData.started;
    
    await reportRef.update({
      status: 'completed',
      completed: reportData.completed,
      duration: reportData.duration,
      updated: Date.now()
    });
    
    await taskRef.update({
      status: 'completed',
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    console.log(`Media validation completed: ${reportId}`);
    return { success: true, reportId };
  } catch (error) {
    console.error('Error processing media validation:', error);
    
    // Mark task and report as failed
    await reportRef.update({
      status: 'failed',
      error: error.message,
      updated: Date.now()
    });
    
    await taskRef.update({
      status: 'failed',
      error: error.message,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { error: error.message };
  }
}

module.exports = {
  mediaValidationWorker,
  validateMediaUrl,
  isImageUrl,
  isVideoUrl,
  processMediaFields
};