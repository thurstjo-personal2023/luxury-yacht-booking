/**
 * Standardize Users Collection
 * 
 * This script standardizes all documents in the users collection
 * to ensure consistent field naming and data structure.
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const serviceAccount = require('../firebase-data-connect.json');

// Only initialize once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://yacht-rentals-dev.firebaseio.com",
  });
}

const db = admin.firestore();
const USERS_COLLECTION = 'users';

/**
 * Standardize the document fields for consistency
 * Ensures all documents have the same field names and structure
 */
async function standardizeUserDocument(doc) {
  try {
    const data = doc.data();
    
    // Basic validation
    if (!data) {
      console.error(`Document ${doc.id} has no data`);
      return false;
    }
    
    // Standard user fields that all users should have
    const role = (data.role || 'consumer').toLowerCase();
    
    // Create the standardized user object
    const standardizedUser = {
      id: doc.id,
      userId: doc.id, // Ensure userId always matches document id
      name: data.name || '',
      email: data.email || '',
      phone: data.phone || '',
      role: role,
      emailVerified: data.emailVerified === true,
      points: typeof data.points === 'number' ? data.points : 0,
      createdAt: data.createdAt || admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      _standardized: true,
      _standardizedVersion: 1
    };
    
    // Add role-specific fields
    switch (role) {
      case 'producer':
        standardizedUser.producerId = doc.id;
        standardizedUser.providerId = doc.id;
        standardizedUser.businessName = data.businessName || data.name || '';
        standardizedUser.yearsOfExperience = data.yearsOfExperience || 0;
        standardizedUser.certifications = Array.isArray(data.certifications) ? data.certifications : [];
        standardizedUser.servicesOffered = Array.isArray(data.servicesOffered) ? data.servicesOffered : [];
        break;
        
      case 'partner':
        standardizedUser.partnerId = doc.id;
        standardizedUser.businessName = data.businessName || data.name || '';
        standardizedUser.serviceTypes = Array.isArray(data.serviceTypes) ? data.serviceTypes : [];
        break;
        
      case 'consumer':
      default:
        standardizedUser.preferences = Array.isArray(data.preferences) ? data.preferences : [];
        standardizedUser.wishlist = Array.isArray(data.wishlist) ? data.wishlist : [];
        standardizedUser.bookingHistory = Array.isArray(data.bookingHistory) ? data.bookingHistory : [];
        break;
    }
    
    // Update the document with the standardized fields
    await db.collection(USERS_COLLECTION).doc(doc.id).set(standardizedUser, { merge: true });
    console.log(`Standardized user document: ${doc.id} (${role})`);
    return true;
  } catch (error) {
    console.error(`Error standardizing user document ${doc.id}:`, error);
    return false;
  }
}

/**
 * Main function to standardize all documents in the users collection
 */
async function standardizeUsersCollection() {
  try {
    console.log(`\nStandardizing ${USERS_COLLECTION} collection...`);
    
    // Get all user documents
    const snapshot = await db.collection(USERS_COLLECTION).get();
    
    if (snapshot.empty) {
      console.log(`No documents found in ${USERS_COLLECTION} collection.`);
      return;
    }
    
    console.log(`Found ${snapshot.size} documents in ${USERS_COLLECTION} collection.`);
    
    // Standardize each document
    let successCount = 0;
    
    for (const doc of snapshot.docs) {
      const success = await standardizeUserDocument(doc);
      if (success) successCount++;
    }
    
    console.log(`Successfully standardized ${successCount} out of ${snapshot.size} user documents.`);
    
    // Call the function to update producer references for yachts and add-ons
    await updateProducerReferences();
    
  } catch (error) {
    console.error(`Error standardizing ${USERS_COLLECTION} collection:`, error);
  }
}

/**
 * Update all yacht experiences and product add-ons to link to producer IDs
 */
async function updateProducerReferences() {
  try {
    console.log('\nUpdating producer references in yacht experiences and add-ons...');
    
    // Get all producer users
    const producersSnapshot = await db.collection(USERS_COLLECTION)
      .where('role', '==', 'producer')
      .get();
    
    if (producersSnapshot.empty) {
      console.log('No producer users found.');
      return;
    }
    
    console.log(`Found ${producersSnapshot.size} producer users.`);
    
    for (const producerDoc of producersSnapshot.docs) {
      const producerId = producerDoc.id;
      console.log(`Updating references for producer: ${producerId}`);
      
      // Update yachts in unified_yacht_experiences collection
      const yachtsSnapshot = await db.collection('unified_yacht_experiences')
        .where('producerId', '==', producerId)
        .get();
      
      let updatedYachts = 0;
      
      if (!yachtsSnapshot.empty) {
        // Create a batch for more efficient writes
        let batch = db.batch();
        let batchCount = 0;
        const BATCH_SIZE = 500; // Firestore limit
        
        for (const yachtDoc of yachtsSnapshot.docs) {
          // Update with standard producer reference fields
          batch.update(yachtDoc.ref, {
            producerId: producerId,
            providerId: producerId,
            updatedAt: admin.firestore.FieldValue.serverTimestamp()
          });
          
          batchCount++;
          updatedYachts++;
          
          // If batch size limit is reached, commit and create a new batch
          if (batchCount % BATCH_SIZE === 0) {
            await batch.commit();
            batch = db.batch();
            console.log(`Committed batch of ${BATCH_SIZE} yacht updates.`);
          }
        }
        
        // Commit any remaining updates
        if (batchCount % BATCH_SIZE !== 0) {
          await batch.commit();
          console.log(`Committed final batch of ${batchCount % BATCH_SIZE} yacht updates.`);
        }
      }
      
      // Update add-ons in products_add_ons collection
      const addonsSnapshot = await db.collection('products_add_ons')
        .where('partnerId', '==', producerId)
        .get();
      
      let updatedAddons = 0;
      
      if (!addonsSnapshot.empty) {
        // Create a batch for more efficient writes
        let batch = db.batch();
        let batchCount = 0;
        const BATCH_SIZE = 500; // Firestore limit
        
        for (const addonDoc of addonsSnapshot.docs) {
          // Update with standard producer reference fields
          batch.update(addonDoc.ref, {
            partnerId: producerId,
            producerId: producerId,
            lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp()
          });
          
          batchCount++;
          updatedAddons++;
          
          // If batch size limit is reached, commit and create a new batch
          if (batchCount % BATCH_SIZE === 0) {
            await batch.commit();
            batch = db.batch();
            console.log(`Committed batch of ${BATCH_SIZE} add-on updates.`);
          }
        }
        
        // Commit any remaining updates
        if (batchCount % BATCH_SIZE !== 0) {
          await batch.commit();
          console.log(`Committed final batch of ${batchCount % BATCH_SIZE} add-on updates.`);
        }
      }
      
      console.log(`Updated references for ${updatedYachts} yachts and ${updatedAddons} add-ons for producer ${producerId}.`);
    }
    
    console.log('Producer reference updates completed successfully.');
    
  } catch (error) {
    console.error('Error updating producer references:', error);
  }
}

// Run the standardization
standardizeUsersCollection()
  .then(() => console.log('User collection standardization completed successfully.'))
  .catch(error => console.error('User collection standardization failed:', error));