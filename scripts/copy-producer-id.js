/**
 * Copy Producer ID Script
 * 
 * This script ensures that for every document in the harmonized_users collection
 * with a role of "producer", the ID field is copied to the producerId and providerId fields.
 */

const admin = require('firebase-admin');
const serviceAccount = require('../firebase-data-connect.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

async function copyProducerIdField() {
  console.log('Starting producer ID field copy operation...');
  
  try {
    // Get all users with role 'producer'
    const producersSnapshot = await db.collection('harmonized_users')
      .where('role', '==', 'producer')
      .get();
    
    if (producersSnapshot.empty) {
      console.log('No producer users found in harmonized_users collection.');
      return;
    }
    
    console.log(`Found ${producersSnapshot.size} producer users.`);
    const batch = db.batch();
    let updateCount = 0;
    
    // Process each producer
    producersSnapshot.forEach(doc => {
      const userData = doc.data();
      const userId = doc.id;
      
      // Skip if producerId and providerId already set and match the ID
      if (userData.producerId === userId && userData.providerId === userId) {
        console.log(`User ${userId} already has matching producerId and providerId.`);
        return;
      }
      
      // Update producer fields to match the document ID
      console.log(`Updating user ${userId} with producerId and providerId set to the document ID.`);
      batch.update(doc.ref, {
        producerId: userId,
        providerId: userId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      updateCount++;
    });
    
    // Commit the batch if there are updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`Successfully updated ${updateCount} producer users.`);
    } else {
      console.log('No updates needed, all producer users already have the correct fields.');
    }
    
  } catch (error) {
    console.error('Error updating producer IDs:', error);
  }
}

// Execute the function
copyProducerIdField()
  .then(() => {
    console.log('Producer ID copy operation complete.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Failed to complete producer ID copy operation:', error);
    process.exit(1);
  });