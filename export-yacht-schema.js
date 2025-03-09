// Simple script to export the yacht schema from Firebase
import admin from 'firebase-admin';
import fs from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, './firebase-data-connect.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount)
});

const db = firebase.firestore();

// Normalize yacht data 
function normalizeYachtData(data, id) {
  // Create a normalized structure with consistent field names
  return {
    ...data,
    // Ensure consistent field names by mapping between different formats
    package_id: id, // Ensure package_id is set
    id: id, // Keep id for backwards compatibility
    yachtId: data.yachtId || id,
    // Map between name and title fields
    name: data.name || data.title || '',
    title: data.title || data.name || '',
    // Map between available and availability_status
    available: data.available !== undefined ? data.available : data.availability_status,
    availability_status: data.availability_status !== undefined ? data.availability_status : (data.available || false),
  };
}

async function exportNormalizedYachtData() {
  try {
    console.log('Fetching yacht data from Firestore...');
    
    // Get yacht data from yacht_experiences collection
    const snapshot = await db.collection('yacht_experiences').get();
    
    if (snapshot.empty) {
      console.log('No yacht data found in yacht_experiences collection.');
      return;
    }
    
    // Normalize the data
    const normalizedData = snapshot.docs.map(doc => {
      const data = doc.data();
      const normalizedYacht = normalizeYachtData(data, doc.id);
      return normalizedYacht;
    });
    
    // Create exports directory if it doesn't exist
    if (!fs.existsSync('./exports')) {
      fs.mkdirSync('./exports');
    }
    
    // Write normalized data to file
    fs.writeFileSync(
      './exports/normalized-yacht-data.json', 
      JSON.stringify(normalizedData, null, 2)
    );
    
    console.log(`Successfully exported ${normalizedData.length} yacht records to ./exports/normalized-yacht-data.json`);
    
    // Also print the first record as a sample
    if (normalizedData.length > 0) {
      console.log('Sample normalized yacht record:');
      console.log(JSON.stringify(normalizedData[0], null, 2));
    }
  } catch (error) {
    console.error('Error exporting yacht data:', error);
  }
}

// Execute the export function
exportNormalizedYachtData();