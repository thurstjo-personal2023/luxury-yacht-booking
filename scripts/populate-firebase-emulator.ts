import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Fix for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app for emulator
const app = initializeApp({ projectId: "etoile-yachts" });
const db = getFirestore(app);

// Configure emulator connection
db.settings({
  host: "127.0.0.1:8080",
  ssl: false,
  ignoreUndefinedProperties: true // Add this to handle undefined values
});

const collections = [
  'articles_and_guides',
  'event_announcements',
  'experience_packages',
  'notifications',
  'products_add_ons',
  'promotions_and_offers',
  'reviews_and_feedback',
  'support_content',
  'user_profiles_service_provider',
  'user_profiles_tourist',
  'yacht_profiles'
];

async function retryOperation(operation: () => Promise<any>, maxAttempts = 3): Promise<any> {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed, retrying...`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }
  throw lastError;
}

async function populateEmulator() {
  try {
    console.log("Starting to populate Firestore emulator from JSON files...");

    // First verify we can connect to the emulator
    try {
      await db.collection('test').doc('test').set({ test: true });
      await db.collection('test').doc('test').delete();
      console.log("✓ Successfully connected to Firestore emulator");
    } catch (error) {
      throw new Error(`Failed to connect to Firestore emulator: ${error.message}`);
    }

    for (const collectionName of collections) {
      console.log(`\nProcessing ${collectionName}...`);

      // Read JSON file
      const jsonPath = path.join(__dirname, '../attached_assets', 
        collectionName === 'products_add_ons' ? 'products_add-ons.json' : `${collectionName}.json`);

      if (!fs.existsSync(jsonPath)) {
        console.log(`Warning: File not found: ${jsonPath}`);
        continue;
      }

      console.log(`Reading file: ${jsonPath}`);
      const fileContent = fs.readFileSync(jsonPath, 'utf-8');
      let documents: any[];

      try {
        const data = JSON.parse(fileContent);
        // Try different possible structures of the JSON
        documents = Array.isArray(data) ? data : 
                   Array.isArray(data[collectionName]) ? data[collectionName] :
                   data.data ? (Array.isArray(data.data) ? data.data : [data.data]) :
                   Object.values(data);

        console.log(`Found ${documents.length} documents to import`);
      } catch (error) {
        console.error(`Error parsing JSON for ${collectionName}:`, error);
        continue;
      }

      if (!documents.length) {
        console.log(`No documents found in ${jsonPath}`);
        continue;
      }

      // Process in batches
      const batchSize = 5;
      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = db.batch();
        const currentBatch = documents.slice(i, i + batchSize);

        for (const doc of currentBatch) {
          // Use the appropriate ID field based on collection
          const idMapping: { [key: string]: string } = {
            'yacht_profiles': 'yacht_id',
            'experience_packages': 'package_id',
            'articles_and_guides': 'article_id',
            'event_announcements': 'event_id',
            'notifications': 'notification_id',
            'products_add_ons': 'product_id',
            'promotions_and_offers': 'promotion_id',
            'reviews_and_feedback': 'review_id',
            'support_content': 'support_id',
            'user_profiles_service_provider': 'provider_id',
            'user_profiles_tourist': 'user_id'
          };

          const idField = idMapping[collectionName];
          if (!idField) {
            console.warn(`Warning: No ID field mapping found for collection: ${collectionName}`);
            continue;
          }

          const docId = doc[idField];
          if (!docId) {
            console.warn(`Warning: Document missing required ID field ${idField}, skipping...`);
            continue;
          }

          console.log(`Processing document: ${docId} (${idField})`);
          const docRef = db.collection(collectionName).doc(docId);

          // Remove undefined values from document
          const cleanDoc = JSON.parse(JSON.stringify(doc));
          batch.set(docRef, cleanDoc);
        }

        await retryOperation(() => batch.commit());
        console.log(`Batch ${Math.floor(i / batchSize) + 1} committed successfully`);
      }

      console.log(`✓ Successfully populated ${collectionName}`);
    }

    console.log("\nSuccessfully populated Firestore emulator from JSON files!");
  } catch (error) {
    console.error("Error populating Firestore emulator:", error);
    process.exit(1);
  }
}

// Run the population
populateEmulator();