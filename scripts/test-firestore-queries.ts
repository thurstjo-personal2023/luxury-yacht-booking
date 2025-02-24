import { adminDb } from "../server/firebase-admin";
import { collection, getDocs, query, where, limit } from "firebase-admin/firestore";

async function testQueries() {
  try {
    console.log("Testing Firestore queries...");

    // Test experience_packages collection
    console.log("\nTesting experience_packages collection:");
    const expSnapshot = await adminDb.collection("experience_packages").get();

    if (expSnapshot.empty) {
      console.log("No documents found in experience_packages collection!");
    } else {
      console.log(`Found ${expSnapshot.size} documents in experience_packages collection:`);
      expSnapshot.docs.forEach(doc => {
        console.log(`\nDocument ID: ${doc.id}`);
        console.log("Data:", JSON.stringify(doc.data(), null, 2));
      });
    }

    // Test recommended experience packages query (similar to Consumer.tsx)
    console.log("\nTesting recommended experience packages query:");
    const recommendedSnapshot = await adminDb.collection("experience_packages")
      .where("featured", "==", true)
      .get();

    if (recommendedSnapshot.empty) {
      console.log("No featured experience packages found!");
    } else {
      console.log(`Found ${recommendedSnapshot.size} featured experience packages:`);
      recommendedSnapshot.docs.forEach(doc => {
        console.log(`\nDocument ID: ${doc.id}`);
        console.log("Data:", JSON.stringify(doc.data(), null, 2));
      });
    }

    // Test all other collections
    const collections = [
      'articles_and_guides',
      'event_announcements',
      'notifications',
      'products_add_ons',
      'promotions_and_offers',
      'reviews_and_feedback',
      'support_content',
      'user_profiles_service_provider',
      'user_profiles_tourist',
      'yacht_profiles'
    ];

    for (const collectionName of collections) {
      console.log(`\nTesting ${collectionName} collection:`);
      const snapshot = await adminDb.collection(collectionName).get();

      if (snapshot.empty) {
        console.log(`No documents found in ${collectionName} collection!`);
      } else {
        console.log(`Found ${snapshot.size} documents in ${collectionName} collection`);
        snapshot.docs.forEach(doc => {
          console.log(`Document ID: ${doc.id}`);
        });
      }
    }

  } catch (error) {
    console.error("Error testing queries:", error);
  }
}

// Run the test
testQueries();