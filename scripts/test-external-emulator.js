/**
 * Test External Emulator Connection
 * 
 * This script checks if we can connect to the external Firestore emulator.
 */

// Import required Node.js modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Initialize Firebase Admin without service account
// (since we're connecting to emulator)
const app = admin.initializeApp({
  projectId: 'etoile-yachts'
});

// Get Firestore instance
const db = admin.firestore();

// Configure Firestore to use emulator
db.settings({
  host: '127.0.0.1:8080',
  ssl: false,
  ignoreUndefinedProperties: true
});

// Set environment variable for Firestore emulator
process.env.FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

console.log('🔍 Testing connection to external Firestore emulator...');
console.log('📡 Connection settings:');
console.log('   - Host: 127.0.0.1:8080');
console.log('   - SSL: false');
console.log('   - Environment variable:');
console.log(`     - FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`);

// Test collections
const UNIFIED_YACHT_COLLECTION = 'unified_yacht_experiences';

async function testConnection() {
  try {
    console.log(`🔍 Testing access to collection: ${UNIFIED_YACHT_COLLECTION}...`);
    
    // Try to access the collection
    const snapshot = await db.collection(UNIFIED_YACHT_COLLECTION).limit(1).get();
    
    if (snapshot.empty) {
      console.log(`✅ Successfully connected to ${UNIFIED_YACHT_COLLECTION} (collection is empty)`);
    } else {
      console.log(`✅ Successfully connected to ${UNIFIED_YACHT_COLLECTION} (found ${snapshot.size} documents)`);
      const sampleDoc = snapshot.docs[0];
      console.log(`   Sample document ID: ${sampleDoc.id}`);
      
      // Print a summary of fields in the document
      const data = sampleDoc.data();
      const fields = Object.keys(data);
      console.log(`   Document has ${fields.length} fields: ${fields.slice(0, 10).join(', ')}${fields.length > 10 ? '...' : ''}`);
      
      // Check if producerId and providerId fields exist
      if (data.producerId) {
        console.log(`   ✅ Document has producerId: ${data.producerId}`);
      } else {
        console.log(`   ❌ Document is missing producerId field`);
      }
      
      if (data.providerId) {
        console.log(`   ✅ Document has providerId: ${data.providerId}`);
      } else {
        console.log(`   ❌ Document is missing providerId field`);
      }
    }
    
    // Test write capability
    try {
      console.log('\n📝 Testing write capability...');
      
      // Create a test document
      const testDocRef = db.collection('test_collection').doc(`test-${Date.now()}`);
      await testDocRef.set({
        timestamp: Date.now(),
        message: 'Test connection document',
        producerId: 'test-producer',
        providerId: 'test-provider'
      });
      
      console.log('✅ Successfully wrote test document');
      
      // Delete the test document
      await testDocRef.delete();
      console.log('✅ Successfully deleted test document');
    } catch (writeError) {
      console.error('❌ Write test failed:', writeError);
    }
    
    console.log('\n🎉 Emulator connection test completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to connect to Firestore emulator:', error);
    console.error('Error details:', error.message);
    console.error('Error code:', error.code);
    
    // Check if it's a connection error
    if (error.code === 14 || error.message.includes('ECONNREFUSED')) {
      console.error('\n🚨 CONNECTION ERROR: Unable to reach the Firestore emulator at 127.0.0.1:8080');
      console.error('Please ensure the Firebase emulator suite is running externally.');
    }
    
    process.exit(1);
  }
}

// Run the test
testConnection();