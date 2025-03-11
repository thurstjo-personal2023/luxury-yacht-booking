/**
 * Import Users to Firebase Firestore
 * 
 * This script imports user data from the users.json file
 * into the Firebase Firestore emulator.
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

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

/**
 * Import users from JSON file
 */
async function importUsers() {
  try {
    console.log('Reading users data from file...');
    
    // Read the users.json file
    const usersJsonPath = path.resolve(__dirname, '../attached_assets/users.json');
    const usersData = JSON.parse(fs.readFileSync(usersJsonPath, 'utf8'));
    
    console.log(`Found ${usersData.length} users to import.`);
    
    // Create a batch for more efficient writes
    let batch = db.batch();
    let count = 0;
    const BATCH_SIZE = 500; // Firestore limit
    
    // Process each user
    for (const user of usersData) {
      // Use the user's id as the document ID
      const docId = user.id;
      const docRef = db.collection(USERS_COLLECTION).doc(docId);
      
      // Convert date strings to Firestore timestamps
      const userData = {
        ...user,
        createdAt: user.createdAt ? admin.firestore.Timestamp.fromDate(new Date(user.createdAt)) : null,
        updatedAt: user.updatedAt ? admin.firestore.Timestamp.fromDate(new Date(user.updatedAt)) : null
      };
      
      // Add to batch
      batch.set(docRef, userData);
      count++;
      
      // If batch size limit is reached, commit and create a new batch
      if (count % BATCH_SIZE === 0) {
        console.log(`Committing batch of ${BATCH_SIZE} users...`);
        await batch.commit();
        batch = db.batch();
      }
    }
    
    // Commit any remaining users
    if (count % BATCH_SIZE !== 0) {
      console.log(`Committing final batch of ${count % BATCH_SIZE} users...`);
      await batch.commit();
    }
    
    console.log(`Successfully imported ${count} users into ${USERS_COLLECTION} collection.`);
    
  } catch (error) {
    console.error('Error importing users:', error);
  }
}

// Run the import
importUsers()
  .then(() => console.log('User import completed successfully.'))
  .catch(error => console.error('User import failed:', error));