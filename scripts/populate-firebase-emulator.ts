import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

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

async function populateEmulator() {
  try {
    console.log("Starting to populate Firestore emulator with production data...");

    for (const collectionName of collections) {
      console.log(`\nProcessing ${collectionName}...`);

      // Get data from production
      const snapshot = await adminDb.collection(collectionName).get();

      if (snapshot.empty) {
        console.log(`No documents found in ${collectionName}`);
        continue;
      }

      console.log(`Found ${snapshot.size} documents in ${collectionName}`);

      // Process in batches
      const batchSize = 500;
      const batches = [];

      for (let i = 0; i < snapshot.docs.length; i += batchSize) {
        const batch = adminDb.batch();
        const currentBatch = snapshot.docs.slice(i, i + batchSize);

        for (const doc of currentBatch) {
          const docRef = adminDb.collection(collectionName).doc(doc.id);
          batch.set(docRef, doc.data());
        }

        batches.push(batch.commit());
      }

      await Promise.all(batches);
      console.log(`✓ Successfully copied ${snapshot.size} documents to ${collectionName}`);
    }

    console.log("\nSuccessfully populated all collections in Firestore emulator!");
  } catch (error) {
    console.error("Error populating Firestore emulator:", error);
    process.exit(1);
  }
}

// Run the population
populateEmulator();