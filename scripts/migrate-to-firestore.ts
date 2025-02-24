import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from 'url';

// Get the directory name in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to convert date strings to Firestore Timestamps
const convertDates = (obj: any) => {
  const newObj = { ...obj };
  for (const [key, value] of Object.entries(newObj)) {
    if (typeof value === "string" && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      newObj[key] = Timestamp.fromDate(new Date(value));
    } else if (typeof value === "object" && value !== null) {
      newObj[key] = convertDates(value);
    }
  }
  return newObj;
};

async function migrateCollection(collectionName: string, jsonPath: string) {
  try {
    console.log(`\nStarting to populate ${collectionName}...`);

    // Read JSON file
    console.log(`Reading file: ${jsonPath}`);
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'));
    console.log(`Found ${data.length} documents to import`);

    // Get collection reference
    const collectionRef = adminDb.collection(collectionName);

    // Process in batches
    const batchSize = 5;
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = adminDb.batch();
      const currentBatch = data.slice(i, i + batchSize);
      console.log(`Processing batch ${Math.floor(i / batchSize) + 1}...`);

      for (const doc of currentBatch) {
        // Get the ID field based on collection name
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
          throw new Error(`No ID field mapping found for collection: ${collectionName}`);
        }

        const docId = doc[idField];
        if (!docId) {
          throw new Error(`Document missing required ID field ${idField}`);
        }

        console.log(`Processing document: ${docId} (${idField})`);
        const docRef = collectionRef.doc(docId);
        const processedDoc = convertDates(doc);
        batch.set(docRef, processedDoc);
      }

      await batch.commit();
      console.log(`Batch ${Math.floor(i / batchSize) + 1} committed successfully`);
    }

    console.log(`✓ Successfully populated ${collectionName}`);
  } catch (error) {
    console.error(`Error populating ${collectionName}:`, error);
    throw error;
  }
}

async function migrateAllCollections() {
  try {
    console.log("Starting migration of all collections to Firestore...");

    const collections = [
      { name: 'experience_packages', file: 'experience_packages.json' },
      { name: 'yacht_profiles', file: 'yacht_profiles.json' },
      { name: 'articles_and_guides', file: 'articles_and_guides.json' },
      { name: 'event_announcements', file: 'event_announcements.json' },
      { name: 'notifications', file: 'notifications.json' },
      { name: 'products_add_ons', file: 'products_add-ons.json' },
      { name: 'promotions_and_offers', file: 'promotions_and_offers.json' },
      { name: 'reviews_and_feedback', file: 'reviews_and_feedback.json' },
      { name: 'support_content', file: 'support_content.json' },
      { name: 'user_profiles_service_provider', file: 'user_profiles_service_provider.json' },
      { name: 'user_profiles_tourist', file: 'user_profiles_tourist.json' }
    ];

    for (const collection of collections) {
      const jsonPath = path.join(__dirname, '../attached_assets', collection.file);
      await migrateCollection(collection.name, jsonPath);
    }

    console.log("\nMigration completed successfully!");
  } catch (error) {
    console.error("\nMigration failed:", error);
    process.exit(1);
  }
}

// Run migration
migrateAllCollections();