/**
 * Check User Harmonization
 * 
 * This script verifies that all user records in the harmonized_users collection
 * have standardized fields, especially producer-specific fields.
 */

// Import required Node.js modules
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const admin = require('firebase-admin');

// Initialize Firebase Admin without service account
// (since we're connecting to emulator)
const app = admin.initializeApp({
  projectId: 'etoile-yachts'
}, 'check-user-harmonization');

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

console.log('🔍 Checking user harmonization in harmonized_users collection...');
console.log('📡 Connection settings:');
console.log('   - Host: 127.0.0.1:8080');
console.log('   - SSL: false');
console.log('   - Environment variable:');
console.log(`     - FIRESTORE_EMULATOR_HOST: ${process.env.FIRESTORE_EMULATOR_HOST}`);

async function checkUserHarmonization() {
  try {
    console.log(`🔍 Testing access to collection: harmonized_users...`);
    
    // Try to access the collection
    const snapshot = await db.collection('harmonized_users').get();
    
    if (snapshot.empty) {
      console.log(`❌ harmonized_users collection is empty - no users to check`);
      process.exit(1);
    } 
    
    console.log(`✅ Found ${snapshot.size} users in harmonized_users collection`);
    
    // Check producer users
    const producerUsers = snapshot.docs.filter(doc => {
      const data = doc.data();
      return data.role === 'producer';
    });
    
    console.log(`\n📊 Found ${producerUsers.length} producer users`);
    
    // Validate producer fields
    let validProducerCount = 0;
    let invalidProducerCount = 0;
    
    for (const doc of producerUsers) {
      const data = doc.data();
      const id = doc.id;
      
      // Check standardized producer ID fields
      const hasProducerId = !!data.producerId;
      const hasProviderId = !!data.providerId;
      
      // Check if producerId matches user ID
      const producerIdMatchesId = data.producerId === id;
      const providerIdMatchesId = data.providerId === id;
      
      if (hasProducerId && hasProviderId && producerIdMatchesId && providerIdMatchesId) {
        validProducerCount++;
        console.log(`✅ Producer ${id} has correct ID fields`);
      } else {
        invalidProducerCount++;
        console.log(`❌ Producer ${id} has invalid ID fields:`);
        
        if (!hasProducerId) console.log(`   - Missing producerId field`);
        if (!hasProviderId) console.log(`   - Missing providerId field`);
        if (hasProducerId && !producerIdMatchesId) console.log(`   - producerId (${data.producerId}) doesn't match user ID (${id})`);
        if (hasProviderId && !providerIdMatchesId) console.log(`   - providerId (${data.providerId}) doesn't match user ID (${id})`);
      }
    }
    
    // Summary 
    console.log(`\n📊 Producer ID Harmonization Summary:`);
    console.log(`   - Total producer users: ${producerUsers.length}`);
    console.log(`   - Correctly harmonized: ${validProducerCount}`);
    console.log(`   - Incorrectly harmonized: ${invalidProducerCount}`);
    
    if (invalidProducerCount > 0) {
      console.log(`\n⚠️ Some producer users need harmonization. Run the copy-producer-id.js script to fix.`);
    } else if (producerUsers.length > 0) {
      console.log(`\n🎉 All producer users are correctly harmonized!`);
    }
    
    // Check if unified_yacht_experiences collection has proper producer IDs
    console.log(`\n🔍 Checking producer ID references in unified_yacht_experiences collection...`);
    
    const yachtsSnapshot = await db.collection('unified_yacht_experiences').get();
    
    if (yachtsSnapshot.empty) {
      console.log(`❌ unified_yacht_experiences collection is empty - no yachts to check`);
    } else {
      console.log(`✅ Found ${yachtsSnapshot.size} yachts in unified_yacht_experiences collection`);
      
      let yachtsWithProducerId = 0;
      let yachtsWithoutProducerId = 0;
      
      for (const doc of yachtsSnapshot.docs) {
        const data = doc.data();
        
        if (data.producerId) {
          yachtsWithProducerId++;
        } else {
          yachtsWithoutProducerId++;
        }
      }
      
      console.log(`📊 Yacht Producer ID Summary:`);
      console.log(`   - Total yachts: ${yachtsSnapshot.size}`);
      console.log(`   - With producerId: ${yachtsWithProducerId}`);
      console.log(`   - Without producerId: ${yachtsWithoutProducerId}`);
      
      if (yachtsWithoutProducerId > 0) {
        console.log(`\n⚠️ Some yachts are missing producerId. Run the associate-yachts-with-producer.js script to fix.`);
      } else if (yachtsSnapshot.size > 0) {
        console.log(`\n🎉 All yachts have producerId fields!`);
      }
    }
    
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

// Run the check
checkUserHarmonization();