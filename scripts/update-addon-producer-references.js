/**
 * Update Product Add-ons Producer References
 * 
 * This script ensures all add-ons have proper producer references
 * by updating the partnerId and producerId fields to match the
 * ID of the producer user.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Only initialize once - connect to Firebase emulator
if (!admin.apps.length) {
  admin.initializeApp({
    projectId: 'yacht-rentals-dev',
  });
  
  // Connect to the Firestore emulator
  const firestore = admin.firestore();
  firestore.settings({
    host: "localhost:8080",
    ssl: false
  });
}

const db = admin.firestore();
const USERS_COLLECTION = 'users';
const ADDONS_COLLECTION = 'products_add_ons';
const DEFAULT_PRODUCER_ID = '2'; // ID of Ally Gee from users collection

/**
 * Update product add-ons with proper producer references
 */
async function updateAddonProducerReferences() {
  try {
    console.log(`\nUpdating producer references in ${ADDONS_COLLECTION} collection...`);
    
    // Get all producer users
    const producersSnapshot = await db.collection(USERS_COLLECTION)
      .where('role', '==', 'producer')
      .get();
    
    if (producersSnapshot.empty) {
      console.log('No producer users found. Using default producer ID.');
      await assignDefaultProducer();
      return;
    }
    
    console.log(`Found ${producersSnapshot.size} producer users.`);
    const producers = producersSnapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().name
    }));
    
    // Log the available producers
    console.log('Available producers:');
    producers.forEach(p => console.log(`- ${p.id}: ${p.name}`));
    
    // Get all add-ons
    const addonsSnapshot = await db.collection(ADDONS_COLLECTION).get();
    
    if (addonsSnapshot.empty) {
      console.log(`No documents found in ${ADDONS_COLLECTION} collection.`);
      return;
    }
    
    console.log(`Found ${addonsSnapshot.size} add-ons to update.`);
    
    // Create a batch for more efficient writes
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    for (const addonDoc of addonsSnapshot.docs) {
      const addonData = addonDoc.data();
      const addonId = addonDoc.id;
      
      // Check if the add-on already has a producer reference
      const hasProducerId = addonData.producerId && typeof addonData.producerId === 'string';
      const hasPartnerId = addonData.partnerId && typeof addonData.partnerId === 'string';
      
      // If both references exist and match, skip this add-on
      if (hasProducerId && hasPartnerId && addonData.producerId === addonData.partnerId) {
        console.log(`Add-on ${addonId} already has matching producer references.`);
        continue;
      }
      
      // Use the first producer as the default if no specific assignment is needed
      const producerId = DEFAULT_PRODUCER_ID;
      
      // Update the add-on with proper producer references
      batch.update(addonDoc.ref, {
        producerId: producerId,
        partnerId: producerId,
        lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        _lastUpdated: Date.now().toString()
      });
      
      batchCount++;
      
      // If batch size limit is reached, commit and create a new batch
      if (batchCount % BATCH_SIZE === 0) {
        await batch.commit();
        console.log(`Committed batch of ${BATCH_SIZE} add-on updates.`);
        batch = db.batch();
      }
    }
    
    // Commit any remaining updates
    if (batchCount % BATCH_SIZE !== 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount % BATCH_SIZE} add-on updates.`);
    }
    
    console.log(`Successfully updated producer references for ${batchCount} add-ons.`);
    
  } catch (error) {
    console.error('Error updating add-on producer references:', error);
  }
}

/**
 * Assign the default producer to all add-ons
 */
async function assignDefaultProducer() {
  try {
    // Get all add-ons
    const addonsSnapshot = await db.collection(ADDONS_COLLECTION).get();
    
    if (addonsSnapshot.empty) {
      console.log(`No documents found in ${ADDONS_COLLECTION} collection.`);
      return;
    }
    
    console.log(`Found ${addonsSnapshot.size} add-ons to update with default producer ID ${DEFAULT_PRODUCER_ID}.`);
    
    // Create a batch for more efficient writes
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    for (const addonDoc of addonsSnapshot.docs) {
      // Update the add-on with the default producer ID
      batch.update(addonDoc.ref, {
        producerId: DEFAULT_PRODUCER_ID,
        partnerId: DEFAULT_PRODUCER_ID,
        lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        _lastUpdated: Date.now().toString()
      });
      
      batchCount++;
      
      // If batch size limit is reached, commit and create a new batch
      if (batchCount % BATCH_SIZE === 0) {
        await batch.commit();
        console.log(`Committed batch of ${BATCH_SIZE} add-on updates.`);
        batch = db.batch();
      }
    }
    
    // Commit any remaining updates
    if (batchCount % BATCH_SIZE !== 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount % BATCH_SIZE} add-on updates.`);
    }
    
    console.log(`Successfully updated ${batchCount} add-ons with default producer ID.`);
    
  } catch (error) {
    console.error('Error assigning default producer:', error);
  }
}

// Run the update
updateAddonProducerReferences()
  .then(() => console.log('Add-on producer reference update completed successfully.'))
  .catch(error => console.error('Add-on producer reference update failed:', error));