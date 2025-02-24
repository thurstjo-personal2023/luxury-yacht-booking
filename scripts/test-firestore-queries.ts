import { adminDb } from "../server/firebase-admin";
import { collection, getDocs } from "firebase-admin/firestore";

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

  } catch (error) {
    console.error("Error testing queries:", error);
  }
}

// Run the test
testQueries();