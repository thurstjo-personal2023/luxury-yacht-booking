/**
 * Add Producer IDs to Yachts
 * 
 * This script adds the producer ID to all yacht documents in the unified collection.
 */

// Common JS require
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
try {
  admin.initializeApp({
    projectId: "etoile-yachts"
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

// Configure Firestore to use emulator
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
const db = admin.firestore();
db.settings({
  host: FIRESTORE_EMULATOR_HOST,
  ssl: false
});

console.log(`Connected to Firestore emulator at: ${FIRESTORE_EMULATOR_HOST}`);

// Producer ID to use
const PRODUCER_ID = 'V4aiP9ihPbdnWNO6UbiZKEt1GoCZ';
console.log(`Using producer ID: ${PRODUCER_ID}`);

// Collection to update
const COLLECTION = 'unified_yacht_experiences';

/**
 * Add producer ID to all yachts in the collection
 */
async function addProducerIds() {
  console.log(`Starting to add producer ID to yachts in ${COLLECTION}...`);
  
  try {
    // Get all documents in the collection
    const snapshot = await db.collection(COLLECTION).get();
    
    if (snapshot.empty) {
      console.log(`No documents found in ${COLLECTION}`);
      return;
    }
    
    console.log(`Found ${snapshot.size} documents in ${COLLECTION}`);
    
    // Create a batch for more efficient writes
    let batch = db.batch();
    let batchCount = 0;
    let count = 0;
    const BATCH_SIZE = 500; // Firestore batch limit
    
    // Process each document
    for (const doc of snapshot.docs) {
      // Add producer ID fields
      batch.update(doc.ref, {
        providerId: PRODUCER_ID,
        producerId: PRODUCER_ID
      });
      batchCount++;
      count++;
      
      // If we reach the batch limit, commit and start a new batch
      if (batchCount >= BATCH_SIZE) {
        await batch.commit();
        console.log(`Committed batch of ${batchCount} updates`);
        batch = db.batch();
        batchCount = 0;
      }
    }
    
    // Commit any remaining updates
    if (batchCount > 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount} updates`);
    }
    
    console.log(`\nCompleted! Total yachts updated: ${count}`);
    return true;
  } catch (error) {
    console.error('Error updating yachts:', error);
    return false;
  }
}

// Run the script
addProducerIds()
  .then(() => {
    console.log('Script execution completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });