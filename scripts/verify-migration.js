/**
 * Verify Migration Script
 * 
 * This script verifies that the user data migration to production Firebase was successful
 * by checking the contents of the migrated collections.
 */

// Import Firebase Admin using ES modules
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Read the service account key from environment variable
if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
  console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required");
  process.exit(1);
}

// Get bucket name from environment, with fallback
const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || undefined;

// Parse the service account from the environment variable
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} catch (error) {
  console.error("Error parsing Firebase service account:", error);
  process.exit(1);
}

// Initialize Firebase Admin with production credentials
const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket: storageBucket
});

// Get Firestore instance
const db = getFirestore();

/**
 * Verify the contents of a collection
 */
async function verifyCollection(collectionName) {
  console.log(`\n🔍 Verifying collection: ${collectionName}`);
  const snapshot = await db.collection(collectionName).get();
  console.log(`Found ${snapshot.size} documents in ${collectionName}`);
  
  if (snapshot.size > 0) {
    // Log the first document as a sample
    const sampleDoc = snapshot.docs[0].data();
    console.log(`Sample document: ${JSON.stringify(sampleDoc, null, 2).substring(0, 500)}...`);

    // Print IDs of all documents
    console.log(`Document IDs in ${collectionName}:`);
    snapshot.docs.forEach((doc, index) => {
      console.log(`  ${index + 1}. ${doc.id}`);
    });
  }
  
  return snapshot.size;
}

/**
 * Check the migration status of all user collections
 */
async function checkMigrationStatus() {
  const collections = [
    'harmonized_users',
    'user_profiles_tourist',
    'user_profiles_service_provider'
  ];
  
  console.log('🔄 Checking migration status...');
  
  let totalDocs = 0;
  for (const collection of collections) {
    const count = await verifyCollection(collection);
    totalDocs += count;
  }
  
  console.log(`\n✅ Total documents migrated: ${totalDocs}`);
}

// Run the verification
checkMigrationStatus()
  .then(() => {
    console.log('Verification complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Error during verification:', error);
    process.exit(1);
  });