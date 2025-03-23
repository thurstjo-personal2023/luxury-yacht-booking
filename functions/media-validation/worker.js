/**
 * Media Validation Worker
 * 
 * This module processes media validation tasks from Pub/Sub.
 * It validates and repairs media URLs in Firestore documents.
 */
const admin = require("../src/utils/firebaseAdmin");
const { logger } = require("../src/utils/logging");
const { validateAndRepairMedia } = require("./validation");

// Constants for worker operation
const DEFAULT_BATCH_SIZE = 50;
const DEFAULT_COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'articles_and_guides',
  'event_announcements'
];

/**
 * Process a validation task from Pub/Sub
 * 
 * @param {Object} message - The Pub/Sub message
 * @param {Object} context - The event context
 * @returns {Promise<Object>} - Processing result
 */
async function mediaValidationWorker(message, context) {
  try {
    // Parse the message data
    const task = JSON.parse(Buffer.from(message.data, "base64").toString());

    // If this is a batch task, process it directly
    if (task.batchIndex !== undefined && task.collection) {
      logger.info(
          `Processing media validation task for ${task.collection}, ` +
          `batch ${task.batchIndex + 1}/${task.totalBatches}`
      );

      // Process the batch
      return await processBatch(task);
    } 
    
    // Otherwise, this was just a trigger message which should have already been handled by the scheduler
    logger.info('Received trigger message; batch tasks should be scheduled by scheduler');
    return { success: true, message: 'Trigger message received' };
  } catch (error) {
    logger.error("Error processing media validation task:", error);
    throw error; // Re-throw to trigger Pub/Sub retry
  }
}

/**
 * Process a batch of documents from a collection
 * 
 * @param {Object} task - The batch task to process
 * @returns {Promise<Object>} - Batch processing result
 */
async function processBatch(task) {
  const { 
    collection, 
    batchSize = DEFAULT_BATCH_SIZE, 
    startIndex = 0,
    validationId
  } = task;

  try {
    // Get a batch of documents from the collection
    const query = admin
        .firestore()
        .collection(collection)
        .orderBy("__name__") // Order by document ID for consistent pagination
        .limit(batchSize);

    // If we have a start index, add a startAfter clause
    let snapshot;
    if (startIndex > 0) {
      // Get the document ID at the previous batch's last position
      const previousBatchQuery = admin
          .firestore()
          .collection(collection)
          .orderBy("__name__")
          .limit(1)
          .offset(startIndex - 1);

      const previousBatchSnapshot = await previousBatchQuery.get();

      if (!previousBatchSnapshot.empty) {
        const lastDoc = previousBatchSnapshot.docs[0];
        snapshot = await query.startAfter(lastDoc).get();
      } else {
        snapshot = await query.get();
      }
    } else {
      snapshot = await query.get();
    }

    // Process each document in the batch
    const results = {
      processed: 0,
      fixed: 0,
      errors: 0,
      invalidUrls: [],
    };

    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        results.processed++;

        // Only process documents with media fields
        if (hasMediaFields(data)) {
          const { fixed } = await validateAndRepairMedia(
              collection,
              doc.id,
              data,
          );
          if (fixed) {
            results.fixed++;
          }
        }
      } catch (error) {
        logger.error(
            `Error processing document ${doc.id} in ${collection}:`,
            error,
        );
        results.errors++;
      }
    }

    // Log results
    logger.info(
        `Completed batch ${task.batchIndex + 1}/${task.totalBatches} ` +
        `for ${collection}:`,
    );
    logger.info(`- Documents processed: ${results.processed}`);
    logger.info(`- Media items fixed: ${results.fixed}`);
    logger.info(`- Errors: ${results.errors}`);

    // Save the results to Firestore for reporting
    await saveWorkerResults(collection, task, results, validationId);
    
    // Update task status
    await admin.firestore().collection('media_validation_tasks')
      .doc(task.taskId || `${collection}-${task.batchIndex}`)
      .set({
        ...task,
        status: 'completed',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        results
      }, { merge: true });
    
    // Return the results
    return {
      success: true,
      collection,
      batchIndex: task.batchIndex,
      totalBatches: task.totalBatches,
      results
    };
  } catch (error) {
    logger.error(`Error processing batch for ${collection}:`, error);
    
    // Update task status
    if (task.taskId) {
      await admin.firestore().collection('media_validation_tasks')
        .doc(task.taskId)
        .set({
          status: 'error',
          error: error.message,
          errorAt: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
    }
    
    throw error;
  }
}

/**
 * Check if a document has media fields that need validation.
 *
 * @param {object} data - The document data to check for media fields.
 * @return {boolean} - Returns true if the document has media fields,
 * otherwise false.
 */
function hasMediaFields(data) {
  // Check for common media field patterns
  if (data.media && Array.isArray(data.media)) {
    return true;
  }

  if (data.imageUrl || data.coverImageUrl || data.thumbnailUrl) {
    return true;
  }

  // Check for nested media fields like virtualTour.scenes[].imageUrl
  if (
    data.virtualTour &&
    data.virtualTour.scenes &&
    Array.isArray(data.virtualTour.scenes)
  ) {
    return data.virtualTour.scenes.some(
        (scene) => scene.imageUrl || scene.thumbnailUrl,
    );
  }

  return false;
}

/**
 * Save worker results to Firestore for reporting
 *
 * @param {string} collection - The name of the Firestore collection.
 * @param {object} task - The task object containing batch details.
 * @param {object} results - The results of the worker's processing.
 * @param {string} validationId - The ID of the validation run.
 */
async function saveWorkerResults(collection, task, results, validationId) {
  const timestamp = admin.firestore.Timestamp.now();

  // Save to the log collection
  await admin.firestore().collection("media_validation_worker_logs").add({
    collection,
    batch: task.batchIndex + 1,
    totalBatches: task.totalBatches,
    results,
    timestamp,
    taskId: task.timestamp || Date.now(),
    validationId
  });
  
  // If we have a validation ID, update the validation report
  if (validationId) {
    const docRef = admin.firestore().collection('media_validation_reports').doc(validationId);
    
    // Update the collection stats in the validation report
    await docRef.update({
      [`collections.${collection}.processed`]: admin.firestore.FieldValue.increment(results.processed),
      [`collections.${collection}.fixed`]: admin.firestore.FieldValue.increment(results.fixed),
      [`collections.${collection}.errors`]: admin.firestore.FieldValue.increment(results.errors),
      lastUpdated: timestamp
    });
    
    // Check if this is the last batch for this collection
    if (task.batchIndex === task.totalBatches - 1) {
      // Mark this collection as completed
      await docRef.update({
        [`collections.${collection}.completed`]: true,
        [`collections.${collection}.completedAt`]: timestamp,
        completedCollections: admin.firestore.FieldValue.increment(1)
      });
      
      // Check if all collections are completed
      const doc = await docRef.get();
      const data = doc.data();
      
      if (data.completedCollections >= data.totalCollections) {
        // Mark the entire validation as completed
        await docRef.update({
          status: 'completed',
          completed: timestamp
        });
        
        logger.info(`Media validation ${validationId} completed`);
      }
    }
  }
}

module.exports = { 
  mediaValidationWorker,
  processBatch,
  hasMediaFields
};