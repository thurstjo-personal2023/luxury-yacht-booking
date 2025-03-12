/**
 * Test External Firebase Emulator Connection Script
 * 
 * This script verifies the connection to the Firebase emulators via ngrok tunnel.
 * It tests direct HTTP connectivity and makes simple Firestore queries to validate
 * data access capabilities.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import axios from 'axios';

// Connection settings
const ngrokHost = "e5b9-2001-8f8-1163-5b77-39c7-7461-9eac-f645.ngrok-free.app";
const useSSL = true;
const protocol = useSSL ? 'https' : 'http';

async function testConnection() {
  try {
    console.log(`Testing connection to ngrok tunnel: ${ngrokHost}`);
    
    // Direct HTTP test
    try {
      const response = await axios.get(`${protocol}://${ngrokHost}`);
      console.log("✅ HTTP connection successful:", response.status, response.statusText);
    } catch (error) {
      console.error("❌ HTTP connection failed:", error.message);
    }
    
    // Initialize Firebase Admin with minimal config
    const app = initializeApp({
      projectId: "etoile-yachts-emulator"
    });
    
    const db = getFirestore(app);
    // Configure Firestore to use the ngrok tunnel
    db.settings({
      host: ngrokHost,
      ssl: useSSL,
      ignoreUndefinedProperties: true
    });
    
    console.log("Testing Firestore connection...");
    
    // Test a simple write operation
    try {
      await db.collection('test').doc('connection-test').set({
        timestamp: Date.now(),
        message: 'Testing connection from Replit'
      });
      console.log("✅ Firestore write successful");
    } catch (error) {
      console.error("❌ Firestore write failed:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error.details || "No details available");
    }
    
    // Test reading from unified_yacht_experiences collection
    try {
      const snapshot = await db.collection('unified_yacht_experiences').limit(1).get();
      console.log(`✅ Found ${snapshot.size} yacht(s) in unified_yacht_experiences collection`);
      
      if (snapshot.size > 0) {
        const doc = snapshot.docs[0];
        console.log("Sample document ID:", doc.id);
        console.log("Available fields:", Object.keys(doc.data()));
        console.log("Producer ID:", doc.data().producerId || "Not found");
      }
    } catch (error) {
      console.error("❌ Firestore read failed:", error.message);
      console.error("Error code:", error.code);
      console.error("Error details:", error.details || "No details available");
    }
    
    // Report success
    console.log("\nConnection test completed.");
    
  } catch (error) {
    console.error("Error during test:", error);
  }
}

// Run the test
testConnection().catch(console.error);