/**
 * View Email Collections
 * 
 * This script examines the Firestore collections used by the Firestore Send Email extension
 * It uses the same admin SDK configuration as the server code to ensure compatibility
 */

// Import Firebase Admin SDK
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// Initialize Firebase Admin
async function initializeFirebaseAdmin() {
  try {
    // Use the same environment variable as the server
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      console.error("FIREBASE_SERVICE_ACCOUNT environment variable is required");
      console.error("This should be the same environment variable used by the server");
      process.exit(1);
    }
    
    // Parse the service account JSON from environment variable
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    
    const projectId = process.env.VITE_FIREBASE_PROJECT_ID || serviceAccount.project_id || 'etoile-yachts';
    
    // Initialize Firebase Admin with service account credentials
    const app = initializeApp({
      credential: cert(serviceAccount),
      projectId: projectId
    });
    
    console.log(`Firebase Admin SDK initialized for project: ${projectId}`);
    
    return getFirestore();
  } catch (error) {
    console.error("Error initializing Firebase Admin:", error);
    process.exit(1);
  }
}

// Check the configuration of the Firestore Send Email extension
async function checkEmailConfiguration() {
  try {
    const db = await initializeFirebaseAdmin();
    
    console.log("\n=== Checking Email Extension Configuration ===\n");
    
    // 1. Check for email templates in the 'emails' collection
    const emailsCollection = await db.collection('emails').get();
    console.log(`Email templates found: ${emailsCollection.size}`);
    
    if (emailsCollection.size > 0) {
      console.log("\nEmail Templates:");
      emailsCollection.forEach(doc => {
        const data = doc.data();
        console.log(`- Template ID: ${doc.id}`);
        console.log(`  Subject: ${data.subject || 'N/A'}`);
        console.log(`  Text: ${data.text ? data.text.substring(0, 50) + '...' : 'N/A'}`);
        console.log(`  HTML: ${data.html ? 'Yes (HTML content available)' : 'No HTML content'}`);
        console.log();
      });
    } else {
      console.log("No email templates found. You need to create templates in the 'emails' collection.");
      console.log("See: https://github.com/firebase/extensions/tree/master/firestore-send-email#using-this-extension");
    }
    
    // 2. Check for the 'mail' collection used to trigger emails
    const mailCollection = await db.collection('mail').get();
    console.log(`Mail documents found: ${mailCollection.size}`);
    
    if (mailCollection.size > 0) {
      console.log("\nRecent mail documents (up to 3):");
      let count = 0;
      mailCollection.forEach(doc => {
        if (count < 3) {
          const data = doc.data();
          console.log(`- Mail ID: ${doc.id}`);
          console.log(`  To: ${data.to || 'N/A'}`);
          console.log(`  Template: ${data.template?.name || 'N/A'}`);
          console.log(`  Created: ${data.created ? new Date(data.created.seconds * 1000).toISOString() : 'N/A'}`);
          console.log(`  Status: ${data.delivery?.state || 'N/A'}`);
          console.log();
          count++;
        }
      });
    }
    
    console.log("=== Email Configuration Check Complete ===\n");
  } catch (error) {
    console.error("Error checking email configuration:", error);
  }
}

// Run the function
checkEmailConfiguration();