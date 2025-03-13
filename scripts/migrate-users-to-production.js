/**
 * Migrate User Data to Production
 * 
 * This script migrates all user-related collections from local files (or emulator exports)
 * to the production Firebase database.
 */

// Use the provided service account for authentication with Firebase Admin
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// User collection paths
const USER_COLLECTIONS = [
  {
    name: "harmonized_users",
    sourcePath: "./attached_assets/users.json",
    transformer: transformUserData
  },
  {
    name: "user_profiles_tourist",
    sourcePath: "./attached_assets/user_profiles_tourist.json",
    transformer: transformTouristProfile
  },
  {
    name: "user_profiles_service_provider",
    sourcePath: "./attached_assets/user_profiles_service_provider.json",
    transformer: transformServiceProviderProfile
  }
];

// Timestamp conversion helper
function convertTimestampFields(data) {
  // Convert any timestamp values that might be serialized
  return Object.entries(data).reduce((obj, [key, value]) => {
    // Check if value has _seconds and _nanoseconds (serialized Timestamp)
    if (value && typeof value === 'object' && '_seconds' in value) {
      obj[key] = Timestamp.fromMillis(value._seconds * 1000);
    } 
    // Check if value is a stringified date pattern
    else if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      obj[key] = Timestamp.fromDate(new Date(value));
    }
    // Handle nested objects recursively
    else if (value && typeof value === 'object' && !Array.isArray(value)) {
      obj[key] = convertTimestampFields(value);
    } 
    // Keep arrays and other values as is
    else {
      obj[key] = value;
    }
    return obj;
  }, {});
}

// Transform user data
function transformUserData(userData) {
  // Process the core user data
  const transformed = {
    ...userData,
    _migrated: true,
    _migratedTimestamp: FieldValue.serverTimestamp()
  };
  
  // Standardize timestamp fields
  return convertTimestampFields(transformed);
}

// Transform tourist profile
function transformTouristProfile(profileData) {
  // Fix array fields that might be objects with numeric keys
  function ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    
    // Handle objects that look like arrays with numeric keys
    if (typeof value === 'object') {
      return Object.values(value);
    }
    
    return [value]; // Turn single value into array
  }
  
  const transformed = {
    ...profileData,
    preferences: ensureArray(profileData.preferences),
    wishlist: ensureArray(profileData.wishlist),
    bookingHistory: ensureArray(profileData.bookingHistory),
    reviewsProvided: ensureArray(profileData.reviewsProvided),
    _migrated: true,
    _migratedTimestamp: FieldValue.serverTimestamp()
  };
  
  // Standardize timestamp fields
  return convertTimestampFields(transformed);
}

// Transform service provider profile
function transformServiceProviderProfile(profileData) {
  // Fix array fields that might be objects with numeric keys
  function ensureArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    
    // Handle objects that look like arrays with numeric keys
    if (typeof value === 'object') {
      return Object.values(value);
    }
    
    return [value]; // Turn single value into array
  }
  
  const transformed = {
    ...profileData,
    servicesOffered: ensureArray(profileData.servicesOffered),
    certifications: ensureArray(profileData.certifications),
    tags: ensureArray(profileData.tags),
    _migrated: true,
    _migratedTimestamp: FieldValue.serverTimestamp()
  };
  
  // Standardize timestamp fields
  return convertTimestampFields(transformed);
}

/**
 * Load data from a JSON file
 */
async function loadJsonData(filePath) {
  try {
    if (!fs.existsSync(filePath)) {
      console.warn(`Source file not found: ${filePath}`);
      return [];
    }
    
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(data) ? data : Object.values(data);
  } catch (error) {
    console.error(`Error loading data from ${filePath}:`, error);
    return [];
  }
}

/**
 * Import a collection to Firestore
 */
async function importCollection(collectionConfig) {
  try {
    console.log(`\nMigrating collection: ${collectionConfig.name}`);
    const { name, sourcePath, transformer } = collectionConfig;
    
    // Check if collection already has data
    const collectionRef = db.collection(name);
    const snapshot = await collectionRef.limit(1).get();
    if (!snapshot.empty) {
      console.warn(`⚠️ Collection ${name} already contains data. Skipping to avoid duplicates.`);
      return {
        collection: name,
        status: 'skipped',
        reason: 'destination collection not empty'
      };
    }
    
    // Load data from JSON file
    const sourceData = await loadJsonData(sourcePath);
    console.log(`Loaded ${sourceData.length} documents from ${sourcePath}`);
    
    if (sourceData.length === 0) {
      console.warn(`⚠️ No data found in source file: ${sourcePath}`);
      return {
        collection: name,
        status: 'skipped',
        reason: 'source file empty or not found'
      };
    }
    
    // Batch write to Firestore
    // Use batches of 500 documents to stay within Firestore limits
    const BATCH_SIZE = 500;
    const batches = [];
    let currentBatch = db.batch();
    let docsInBatch = 0;
    let totalDocsWritten = 0;
    
    for (const doc of sourceData) {
      // Get the data with transformations applied
      const data = transformer ? transformer(doc) : doc;
      
      // Use the id field as the document ID if available
      const docId = doc.id || doc.userId || doc.providerId;
      if (!docId) {
        console.warn(`⚠️ Document missing ID field, skipping: ${JSON.stringify(doc).substring(0, 100)}...`);
        continue;
      }
      
      // Add to batch
      currentBatch.set(collectionRef.doc(docId), data);
      docsInBatch++;
      totalDocsWritten++;
      
      // If batch full, commit and create new batch
      if (docsInBatch >= BATCH_SIZE) {
        batches.push(currentBatch);
        currentBatch = db.batch();
        docsInBatch = 0;
      }
    }
    
    // If there are any remaining docs in the current batch
    if (docsInBatch > 0) {
      batches.push(currentBatch);
    }
    
    // Commit all batches
    console.log(`Committing ${batches.length} batches with ${totalDocsWritten} documents...`);
    let successCount = 0;
    for (let i = 0; i < batches.length; i++) {
      try {
        await batches[i].commit();
        successCount++;
        process.stdout.write(`Batch ${i + 1}/${batches.length} committed ✓\r`);
      } catch (error) {
        console.error(`\nError committing batch ${i + 1}:`, error);
      }
    }
    
    console.log(`\n✅ Migration complete for ${name}: ${successCount}/${batches.length} batches committed successfully`);
    return {
      collection: name,
      status: 'success',
      totalDocuments: totalDocsWritten,
      successfulBatches: successCount,
      totalBatches: batches.length
    };
    
  } catch (error) {
    console.error(`❌ Error migrating collection ${collectionConfig.name}:`, error);
    return {
      collection: collectionConfig.name,
      status: 'failed',
      error: error.message
    };
  }
}

/**
 * Main function to run the migration
 */
async function runMigration() {
  console.log("Starting user data migration to production Firebase");
  console.log("=================================================");
  
  const results = [];
  for (const collection of USER_COLLECTIONS) {
    const result = await importCollection(collection);
    results.push(result);
  }
  
  console.log("\nMigration Summary:");
  console.log("=================");
  for (const result of results) {
    console.log(`- ${result.collection}: ${result.status}`);
    if (result.status === 'success') {
      console.log(`  Migrated ${result.totalDocuments} documents (${result.successfulBatches}/${result.totalBatches} batches)`);
    } else if (result.status === 'skipped') {
      console.log(`  Skipped: ${result.reason}`);
    } else if (result.status === 'failed') {
      console.log(`  Failed: ${result.error}`);
    }
  }
  
  console.log("\nMigration complete!");
}

// Run the migration
runMigration()
  .then(() => {
    console.log("Migration script completed.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed with error:", error);
    process.exit(1);
  });