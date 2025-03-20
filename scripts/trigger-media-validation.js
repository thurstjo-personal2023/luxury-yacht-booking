/**
 * Trigger Media Validation Script
 * 
 * This script manually triggers the media validation process by publishing
 * messages to the Pub/Sub topic that the processMediaValidation function
 * is subscribed to.
 * 
 * Usage: node scripts/trigger-media-validation.js [--collection=collection_name]
 */

// Import Firebase Admin SDK
const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');

// Collection names to validate (add more as needed)
const COLLECTIONS_TO_VALIDATE = [
  'unified_yacht_experiences',
  'products_add_ons',
  'yacht_profiles',
  'articles_and_guides',
  'event_announcements'
];

// Batch size for processing documents
const BATCH_SIZE = 50;

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require('../firebase-admin-key.json');
} catch (error) {
  console.error('Error loading service account key file:');
  console.error('Please make sure firebase-admin-key.json exists in the root directory');
  console.error('You can download this file from the Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

// Parse command line arguments
const args = process.argv.slice(2);
let specificCollection = null;

args.forEach(arg => {
  if (arg.startsWith('--collection=')) {
    specificCollection = arg.split('=')[1];
  }
});

// Initialize Pub/Sub client
const pubsub = new PubSub();
const topicName = 'media-validation-tasks';

/**
 * Get the total count of documents in a collection
 * 
 * @param {string} collectionName - The name of the collection
 * @returns {Promise<number>} - The total number of documents
 */
async function getCollectionSize(collectionName) {
  try {
    // Firestore doesn't have a direct count method, so we need to get all document IDs
    // This approach works for small to medium collections but may hit limits for very large ones
    const snapshot = await admin.firestore().collection(collectionName).select().get();
    return snapshot.size;
  } catch (error) {
    console.error(`Error getting size of collection ${collectionName}:`, error);
    return 0;
  }
}

/**
 * Publish a validation task to Pub/Sub
 * 
 * @param {string} collection - The collection to validate
 * @param {number} batchIndex - The batch index
 * @param {number} totalBatches - The total number of batches
 * @param {number} startIndex - The starting document index
 * @returns {Promise<void>}
 */
async function publishValidationTask(collection, batchIndex, totalBatches, startIndex) {
  const task = {
    collection,
    batchIndex,
    totalBatches,
    batchSize: BATCH_SIZE,
    startIndex,
    timestamp: Date.now(),
  };

  try {
    // Convert the task to a Buffer
    const dataBuffer = Buffer.from(JSON.stringify(task));

    // Publish the message
    const messageId = await pubsub.topic(topicName).publish(dataBuffer);
    console.log(`Published message for ${collection}, batch ${batchIndex + 1}/${totalBatches}, message ID: ${messageId}`);
    return messageId;
  } catch (error) {
    console.error(`Error publishing message for ${collection}, batch ${batchIndex + 1}:`, error);
    throw error;
  }
}

/**
 * Trigger validation for a collection
 * 
 * @param {string} collection - The collection to validate
 * @returns {Promise<void>}
 */
async function triggerCollectionValidation(collection) {
  console.log(`\n=== Starting validation for collection: ${collection} ===`);

  try {
    // Get the total number of documents in the collection
    const totalDocuments = await getCollectionSize(collection);
    console.log(`Found ${totalDocuments} documents in ${collection}`);

    if (totalDocuments === 0) {
      console.log(`Skipping ${collection} - no documents found`);
      return;
    }

    // Calculate the number of batches
    const totalBatches = Math.ceil(totalDocuments / BATCH_SIZE);
    console.log(`Will process in ${totalBatches} batches of ${BATCH_SIZE} documents`);

    // Publish tasks for each batch
    const publishPromises = [];
    for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
      const startIndex = batchIndex * BATCH_SIZE;
      publishPromises.push(
        publishValidationTask(collection, batchIndex, totalBatches, startIndex)
      );
    }

    // Wait for all publish operations to complete
    await Promise.all(publishPromises);
    console.log(`Successfully queued all batches for ${collection}`);
  } catch (error) {
    console.error(`Error validating collection ${collection}:`, error);
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Media Validation Trigger Tool ===');
  
  try {
    // Check if the topic exists
    try {
      const [exists] = await pubsub.topic(topicName).exists();
      if (!exists) {
        console.error(`Error: Topic "${topicName}" does not exist.`);
        console.error('Please make sure the topic is created in your Google Cloud project.');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error checking Pub/Sub topic:', error);
      process.exit(1);
    }

    // Determine which collections to validate
    const collectionsToProcess = specificCollection
      ? [specificCollection]
      : COLLECTIONS_TO_VALIDATE;

    console.log(`Will validate the following collections: ${collectionsToProcess.join(', ')}`);

    // Process each collection
    for (const collection of collectionsToProcess) {
      await triggerCollectionValidation(collection);
    }

    console.log('\n=== Validation trigger completed successfully ===');
    console.log('Media validation tasks have been queued and will be processed by the cloud function.');
    console.log('You can check the Firebase Functions logs for progress and results.');
  } catch (error) {
    console.error('Error triggering validation:', error);
    process.exit(1);
  } finally {
    // Clean up
    admin.app().delete();
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });