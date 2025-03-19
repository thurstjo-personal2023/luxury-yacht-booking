/**
 * Media Validation Worker
 * 
 * This module implements the background worker functionality that processes
 * media validation tasks from a Pub/Sub queue. It:
 * 
 * 1. Listens for validation job messages 
 * 2. Processes batches of documents from specific collections
 * 3. Validates and repairs media URLs
 * 4. Records validation results for reporting
 */

const admin = require('firebase-admin');
const { validateAndRepairMedia, validateImageUrl } = require('./validation');

// Constants for worker operation
const BATCH_SIZE = 50; // Number of documents to process in a single batch
const COLLECTIONS_WITH_MEDIA = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'articles_and_guides',
  'event_announcements'
];
const VALID_MEDIA_TYPES = ['image', 'video'];

/**
 * Process a batch of documents from a collection
 * 
 * @param {string} collectionName - The Firestore collection to process
 * @param {string} reportId - ID of the validation report document
 * @param {number} batchSize - Number of documents to process
 * @param {number} offset - Starting point for batch
 * @returns {Promise<Object>} - Result of batch processing
 */
async function processBatch(collectionName, reportId, batchSize = BATCH_SIZE, offset = 0) {
  const db = admin.firestore();
  const results = {
    processed: 0,
    fixed: 0,
    errors: [],
    invalidUrls: []
  };
  
  try {
    // Get a batch of documents from the collection
    const snapshot = await db.collection(collectionName)
      .orderBy('__name__') // Order by document ID
      .limit(batchSize)
      .offset(offset)
      .get();
    
    if (snapshot.empty) {
      return { ...results, done: true };
    }
    
    // Process each document in the batch
    const processPromises = snapshot.docs.map(async (doc) => {
      const docData = doc.data();
      results.processed++;
      
      try {
        // Validate and repair media URLs
        const repairResult = await validateAndRepairMedia(
          collectionName, 
          doc.id, 
          docData
        );
        
        if (repairResult.fixed) {
          results.fixed++;
        }
        
        // Perform deep validation of media URLs if they exist
        if (docData.media && Array.isArray(docData.media)) {
          for (let i = 0; i < docData.media.length; i++) {
            const mediaItem = docData.media[i];
            
            // Skip items without URLs or invalid types
            if (!mediaItem || !mediaItem.url || !VALID_MEDIA_TYPES.includes(mediaItem.type)) {
              continue;
            }
            
            // Validate image URLs
            if (mediaItem.type === 'image') {
              const validationResult = await validateImageUrl(mediaItem.url);
              
              if (!validationResult.valid) {
                results.invalidUrls.push({
                  documentId: doc.id,
                  fieldPath: `media.[${i}].url`,
                  url: mediaItem.url,
                  reason: validationResult.error ? 'Request failed' : 'Invalid content type',
                  status: validationResult.status,
                  error: validationResult.error
                });
                
                // Record the invalid URL in the report
                await db.collection('media_validation_reports')
                  .doc(reportId)
                  .collection('invalid_urls')
                  .add({
                    collection: collectionName,
                    documentId: doc.id,
                    fieldPath: `media.[${i}].url`,
                    url: mediaItem.url,
                    reason: validationResult.reason || 'Invalid URL',
                    status: validationResult.status,
                    error: validationResult.error,
                    contentType: validationResult.contentType,
                    timestamp: admin.firestore.FieldValue.serverTimestamp()
                  });
              }
            }
          }
        }
      } catch (error) {
        results.errors.push({
          documentId: doc.id,
          error: error.message
        });
        
        console.error(`Error processing document ${collectionName}/${doc.id}:`, error);
      }
    });
    
    // Wait for all documents to be processed
    await Promise.all(processPromises);
    
    // Update the report with batch results
    await db.collection('media_validation_reports')
      .doc(reportId)
      .update({
        [`collections.${collectionName}.processed`]: admin.firestore.FieldValue.increment(results.processed),
        [`collections.${collectionName}.fixed`]: admin.firestore.FieldValue.increment(results.fixed),
        [`collections.${collectionName}.errors`]: admin.firestore.FieldValue.increment(results.errors.length),
        [`collections.${collectionName}.invalidUrls`]: admin.firestore.FieldValue.increment(results.invalidUrls.length),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return { ...results, done: snapshot.size < batchSize };
  } catch (error) {
    console.error(`Error processing batch for ${collectionName}:`, error);
    
    // Update the report with batch error
    await db.collection('media_validation_reports')
      .doc(reportId)
      .update({
        [`collections.${collectionName}.batchErrors`]: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    
    return { 
      ...results, 
      error: error.message,
      done: true  // Stop processing this collection if we hit an error
    };
  }
}

/**
 * Process validation for a single collection
 * 
 * @param {string} collectionName - The collection to validate
 * @param {string} reportId - ID of the validation report document
 * @returns {Promise<Object>} - Result of collection processing
 */
async function processCollection(collectionName, reportId) {
  const db = admin.firestore();
  let offset = 0;
  let done = false;
  const collectionResults = {
    collection: collectionName,
    totalProcessed: 0,
    totalFixed: 0,
    totalErrors: 0,
    totalInvalidUrls: 0,
    batches: 0
  };
  
  // Initialize collection results in the report
  await db.collection('media_validation_reports')
    .doc(reportId)
    .update({
      [`collections.${collectionName}`]: {
        processed: 0,
        fixed: 0,
        errors: 0,
        invalidUrls: 0,
        batchErrors: 0,
        started: admin.firestore.FieldValue.serverTimestamp()
      }
    });
  
  // Process batches until done
  while (!done) {
    collectionResults.batches++;
    
    const batchResult = await processBatch(
      collectionName, 
      reportId, 
      BATCH_SIZE, 
      offset
    );
    
    // Accumulate results
    collectionResults.totalProcessed += batchResult.processed;
    collectionResults.totalFixed += batchResult.fixed;
    collectionResults.totalErrors += batchResult.errors.length;
    collectionResults.totalInvalidUrls += batchResult.invalidUrls.length;
    
    // Move to next batch or finish
    done = batchResult.done;
    offset += BATCH_SIZE;
  }
  
  // Mark collection as completed in the report
  await db.collection('media_validation_reports')
    .doc(reportId)
    .update({
      [`collections.${collectionName}.completed`]: admin.firestore.FieldValue.serverTimestamp(),
      [`collections.${collectionName}.batches`]: collectionResults.batches
    });
  
  return collectionResults;
}

/**
 * Process a validation job from Pub/Sub
 * 
 * @param {Object} message - The Pub/Sub message
 * @returns {Promise<Object>} - Result of job processing
 */
async function processValidationJob(message) {
  const db = admin.firestore();
  
  // Parse the message data
  const messageData = message.json || {};
  const { 
    collections = COLLECTIONS_WITH_MEDIA,
    reportId = null,
    validateSingle = false,
    documentId = null,
    collectionName = null
  } = messageData;
  
  try {
    // Create a new report if not provided
    const actualReportId = reportId || db.collection('media_validation_reports').doc().id;
    
    // Initialize the report
    if (!reportId) {
      await db.collection('media_validation_reports').doc(actualReportId).set({
        started: admin.firestore.FieldValue.serverTimestamp(),
        status: 'running',
        collections: {},
        validateSingle: validateSingle,
        singleCollection: collectionName,
        singleDocumentId: documentId,
        totalCollections: validateSingle ? 1 : collections.length,
        completedCollections: 0,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Process a single document if requested
    if (validateSingle && documentId && collectionName) {
      const docRef = db.collection(collectionName).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        throw new Error(`Document ${collectionName}/${documentId} not found`);
      }
      
      const docData = doc.data();
      const result = await validateAndRepairMedia(collectionName, documentId, docData);
      
      // Update the report
      await db.collection('media_validation_reports').doc(actualReportId).update({
        result,
        status: 'completed',
        completed: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
      
      return { 
        success: true, 
        reportId: actualReportId,
        validateSingle: true,
        result 
      };
    }
    
    // Process all collections
    const collectionsToProcess = validateSingle ? [collectionName] : collections;
    const results = [];
    
    for (const collection of collectionsToProcess) {
      const collectionResult = await processCollection(collection, actualReportId);
      results.push(collectionResult);
      
      // Update completed collections count
      await db.collection('media_validation_reports').doc(actualReportId).update({
        completedCollections: admin.firestore.FieldValue.increment(1),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Mark the report as completed
    await db.collection('media_validation_reports').doc(actualReportId).update({
      status: 'completed',
      completed: admin.firestore.FieldValue.serverTimestamp(),
      lastUpdated: admin.firestore.FieldValue.serverTimestamp()
    });
    
    return { 
      success: true, 
      reportId: actualReportId,
      results 
    };
  } catch (error) {
    console.error("Error processing validation job:", error);
    
    // Update the report with error
    if (reportId) {
      await db.collection('media_validation_reports').doc(reportId).update({
        status: 'error',
        error: error.message,
        completed: admin.firestore.FieldValue.serverTimestamp(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return { 
      success: false, 
      error: error.message 
    };
  }
}

module.exports = {
  processValidationJob,
  processCollection,
  processBatch
};