/**
 * Check Emulator Connection Script
 * 
 * This script tests the connection to the Firebase emulators and
 * verifies the accessibility of the unified_yacht_experiences collection.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
const app = initializeApp({
  projectId: "etoile-yachts",
});

// Initialize Firestore
const db = getFirestore(app);

// Connect to emulator
db.settings({
  host: "127.0.0.1:8080",
  ssl: false,
  ignoreUndefinedProperties: true
});

// Define collections to check
const COLLECTIONS = [
  'unified_yacht_experiences',
  'harmonized_users', 
  'products_add_ons'
];

async function checkEmulatorConnection() {
  console.log('🔍 Checking emulator connection...');
  console.log('📡 Firestore emulator connection settings:');
  console.log('   - Host: 127.0.0.1:8080');
  console.log('   - SSL: false');
  console.log('   - Environment variables:');
  console.log(`     - FIREBASE_AUTH_EMULATOR_HOST: ${process.env.FIREBASE_AUTH_EMULATOR_HOST || 'not set'}`);
  console.log(`     - FIREBASE_STORAGE_EMULATOR_HOST: ${process.env.FIREBASE_STORAGE_EMULATOR_HOST || 'not set'}`);
  console.log(`     - FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST || 'not set'}`);
  
  // Try to access each collection
  for (const collectionName of COLLECTIONS) {
    try {
      console.log(`🔍 Testing access to collection: ${collectionName}...`);
      
      const snapshot = await db.collection(collectionName).limit(1).get();
      
      if (snapshot.empty) {
        console.log(`✅ Successfully connected to ${collectionName} (collection is empty)`);
      } else {
        console.log(`✅ Successfully connected to ${collectionName} (found ${snapshot.size} documents)`);
        const sampleDoc = snapshot.docs[0];
        console.log(`   Sample document ID: ${sampleDoc.id}`);
        console.log(`   Sample document fields: ${Object.keys(sampleDoc.data()).join(', ')}`);
      }
    } catch (error) {
      console.error(`❌ Failed to connect to ${collectionName}: ${error.message}`);
      console.error(error);
    }
  }
  
  // Additional connection diagnostics
  try {
    console.log('\n📊 Running additional connection diagnostics...');
    
    // Create a test document to verify write access
    const testRef = db.collection('connection_test').doc(`test-${Date.now()}`);
    await testRef.set({
      timestamp: Date.now(),
      message: 'Test connection document'
    });
    
    console.log('✅ Successfully wrote test document to connection_test collection');
    
    // Delete the test document to clean up
    await testRef.delete();
    console.log('✅ Successfully deleted test document');
    
  } catch (error) {
    console.error(`❌ Connection diagnostics failed: ${error.message}`);
    console.error(error);
  }
}

// Run the check
checkEmulatorConnection()
  .then(() => {
    console.log('\n✨ Emulator connection check completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('💥 Fatal error during connection check:', error);
    process.exit(1);
  });