/**
 * Import Harmonized Users to Firebase Firestore
 * 
 * This script imports the standardized user data from the harmonized_users.json file
 * into the Firebase Firestore emulator.
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
const HARMONIZED_USERS_PATH = path.join(__dirname, '..', 'harmonized_users.json');

/**
 * Import harmonized users from JSON file
 */
async function importHarmonizedUsers() {
  try {
    console.log(`Reading harmonized users from ${HARMONIZED_USERS_PATH}...`);
    
    // Read the harmonized users JSON file
    const rawData = fs.readFileSync(HARMONIZED_USERS_PATH, 'utf8');
    const users = JSON.parse(rawData);
    
    if (!Array.isArray(users)) {
      console.error('Harmonized users file does not contain an array.');
      return;
    }
    
    console.log(`Found ${users.length} harmonized users to import.`);
    
    // Create a batch for more efficient writes
    let batch = db.batch();
    let batchCount = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    for (const user of users) {
      if (!user.id) {
        console.warn('Skipping user with no ID.');
        continue;
      }
      
      // Convert timestamps from serialized format to Firestore timestamp
      const processedUser = { ...user };
      
      if (processedUser.createdAt && typeof processedUser.createdAt === 'object') {
        if (processedUser.createdAt._seconds) {
          processedUser.createdAt = new admin.firestore.Timestamp(
            processedUser.createdAt._seconds,
            processedUser.createdAt._nanoseconds || 0
          );
        }
      }
      
      if (processedUser.updatedAt && typeof processedUser.updatedAt === 'object') {
        if (processedUser.updatedAt._seconds) {
          processedUser.updatedAt = new admin.firestore.Timestamp(
            processedUser.updatedAt._seconds,
            processedUser.updatedAt._nanoseconds || 0
          );
        }
      }
      
      // Add the user to the batch
      const userRef = db.collection(USERS_COLLECTION).doc(user.id);
      batch.set(userRef, processedUser);
      batchCount++;
      
      // If batch size limit is reached, commit and create a new batch
      if (batchCount % BATCH_SIZE === 0) {
        await batch.commit();
        console.log(`Committed batch of ${BATCH_SIZE} users.`);
        batch = db.batch();
      }
    }
    
    // Commit any remaining updates
    if (batchCount % BATCH_SIZE !== 0) {
      await batch.commit();
      console.log(`Committed final batch of ${batchCount % BATCH_SIZE} users.`);
    }
    
    console.log(`Successfully imported ${batchCount} harmonized users.`);
    
    // Verify the import
    const snapshot = await db.collection(USERS_COLLECTION).get();
    console.log(`Users collection now contains ${snapshot.size} documents.`);
    
    // Log a sample user
    if (snapshot.size > 0) {
      const sampleDoc = snapshot.docs[0];
      console.log('Sample user document:');
      console.log(JSON.stringify(sampleDoc.data(), null, 2));
    }
    
  } catch (error) {
    console.error('Error importing harmonized users:', error);
  }
}

// Run the import
importHarmonizedUsers()
  .then(() => console.log('Harmonized users import completed successfully.'))
  .catch(error => console.error('Harmonized users import failed:', error));