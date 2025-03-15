/**
 * Check Emails Collection Script
 * 
 * This script checks the contents of the 'emails' collection
 * which is used by the Firestore Send Email extension.
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { readFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function checkEmailsCollection() {
  try {
    // Initialize Firebase Admin
    const serviceAccountPath = join(__dirname, '..', 'firebase-data-connect.json');
    const serviceAccountJson = await readFile(serviceAccountPath, 'utf8');
    const serviceAccount = JSON.parse(serviceAccountJson);
    
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    // Get Firestore instance
    const db = getFirestore();
    
    console.log('Checking emails collection...');
    
    // Get all documents from the emails collection
    const snapshot = await db.collection('emails').get();
    
    console.log(`Found ${snapshot.size} email templates:`);
    
    // Print each document
    snapshot.forEach(doc => {
      console.log(`\nDocument ID: ${doc.id}`);
      console.log(JSON.stringify(doc.data(), null, 2));
    });
    
    // Check the mail collection used by the extension
    const mailSnapshot = await db.collection('mail').get();
    console.log(`\nFound ${mailSnapshot.size} documents in the 'mail' collection.`);
    
    // If the mail collection has documents, show the first few
    if (mailSnapshot.size > 0) {
      console.log('\nRecent mail documents:');
      let count = 0;
      mailSnapshot.forEach(doc => {
        if (count < 3) { // Limit to 3 documents to avoid too much output
          console.log(`\nMail ID: ${doc.id}`);
          console.log(JSON.stringify(doc.data(), null, 2));
          count++;
        }
      });
    }
    
    console.log('\nEmail collection check complete.');
  } catch (error) {
    console.error('Error checking emails collection:', error);
  }
}

// Run the function
checkEmailsCollection().catch(console.error);