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
  host: "127.0.0.1:8080",  // Changed from localhost to explicit IP
  ssl: false,
  ignoreUndefinedProperties: true // Add this to handle undefined values
});

async function retryOperation(operation: () => Promise<any>, maxAttempts = 3): Promise<any> {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.log(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt < maxAttempts) {
        console.log(`Waiting ${attempt} seconds before retry...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  throw lastError;
}

async function testQueries() {
  try {
    console.log("Starting Firestore emulator connectivity test...");

    // First verify emulator connection
    try {
      await retryOperation(async () => {
        console.log("Testing emulator connection...");
        const testRef = db.collection('test').doc('test');
        await testRef.set({ test: true });
        const doc = await testRef.get();
        console.log("Test document created and retrieved:", doc.exists);
        await testRef.delete();
      });
      console.log("✓ Successfully connected to Firestore emulator");
    } catch (error) {
      throw new Error(`Failed to connect to Firestore emulator: ${error.message}`);
    }

    // Test experience_packages collection
    console.log("\nTesting experience_packages collection:");
    const expSnapshot = await db.collection("experience_packages").get();

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
    const recommendedSnapshot = await db.collection("experience_packages")
      .where("featured", "==", true)
      .limit(6)
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

  } catch (error) {
    console.error("Error testing queries:", error);
    process.exit(1);
  }
}

// Run the test
testQueries();