/**
 * Associate Yachts With Producer Script
 * 
 * This script updates all yachts in the database to associate them with the specified producer ID.
 * It handles both unified collection and legacy collections.
 */

import admin from 'firebase-admin';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';
import path from 'path';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Firebase Admin SDK
// Get emulator host from environment
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";

// Initialize Firebase Admin with a service account
try {
  // Initialize with default credentials for emulator
  admin.initializeApp({
    projectId: "etoile-yachts"
  });
} catch (error) {
  console.error('Error initializing Firebase Admin:', error);
}

console.log('Connecting to Firestore emulator...');
// Connect to Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
const db = admin.firestore();
console.log(`Connected to Firestore emulator at: ${FIRESTORE_EMULATOR_HOST}`);

// Producer ID to use - replace with your actual user ID
const PRODUCER_ID = 'V4aiP9ihPbdnWNO6UbiZKEt1GoCZ';
console.log(`Using producer ID: ${PRODUCER_ID}`);

// Collections to update
const COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_experiences',
  'yachts'
];

/**
 * Associate all yachts with the given producer ID
 */
async function associateYachtsWithProducer() {
  console.log('Starting to associate yachts with producer...');
  
  let totalUpdated = 0;
  
  // Process each collection
  for (const collectionName of COLLECTIONS) {
    console.log(`\nProcessing collection: ${collectionName}`);
    
    try {
      // Get all documents in the collection
      const snapshot = await db.collection(collectionName).get();
      
      if (snapshot.empty) {
        console.log(`No documents found in ${collectionName}`);
        continue;
      }
      
      console.log(`Found ${snapshot.size} documents in ${collectionName}`);
      
      // Keep track of how many documents are updated in this collection
      let collectionUpdateCount = 0;
      
      // Create a batch for more efficient writes
      let batch = db.batch();
      let batchCount = 0;
      const BATCH_SIZE = 500; // Firestore batch limit
      
      // Process each document
      for (const doc of snapshot.docs) {
        // Add all producer ID field variations to ensure compatibility
        const updates = {
          producerId: PRODUCER_ID,
          providerId: PRODUCER_ID,
          producer_id: PRODUCER_ID,
          provider_id: PRODUCER_ID,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Add the field in the format that matches the collection's schema
        if (collectionName === 'yacht_experiences') {
          updates.last_updated_date = admin.firestore.FieldValue.serverTimestamp();
        }
        
        // Add to batch
        batch.update(doc.ref, updates);
        batchCount++;
        collectionUpdateCount++;
        
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
      
      console.log(`Updated ${collectionUpdateCount} documents in ${collectionName}`);
      totalUpdated += collectionUpdateCount;
    } catch (error) {
      console.error(`Error updating ${collectionName}:`, error);
    }
  }
  
  console.log(`\nCompleted! Total documents updated: ${totalUpdated}`);
}

// Execute the function
associateYachtsWithProducer()
  .then(() => {
    console.log('Script execution completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script execution failed:', error);
    process.exit(1);
  });