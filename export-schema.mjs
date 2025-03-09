// Export normalized yacht schema
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

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Normalize yacht data 
function normalizeYachtData(data, id) {
  return {
    // Original data
    ...data,
    // Consistent IDs
    package_id: id,
    id: id,
    yachtId: data.yachtId || id,
    // Consistent names
    name: data.name || data.title || '',
    title: data.title || data.name || '',
    // Consistent availability
    available: data.available !== undefined ? data.available : data.availability_status,
    availability_status: data.availability_status !== undefined ? data.availability_status : (data.available || false),
  };
}

async function exportNormalizedSchema() {
  try {
    console.log('Exporting normalized yacht schema...');
    
    // Get yacht data from yacht_experiences collection
    const snapshot = await db.collection('yacht_experiences').get();
    
    if (snapshot.empty) {
      console.log('No yacht data found in yacht_experiences collection.');
      return;
    }
    
    // Normalize data
    const normalizedYachts = snapshot.docs.map(doc => {
      const data = doc.data();
      return normalizeYachtData(data, doc.id);
    });
    
    // Create exports directory if it doesn't exist
    if (!fs.existsSync('./exports')) {
      fs.mkdirSync('./exports');
    }
    
    // Write normalized data to file
    fs.writeFileSync(
      './exports/normalized-yacht-schema.json', 
      JSON.stringify(normalizedYachts, null, 2)
    );
    
    console.log(`Exported ${normalizedYachts.length} normalized yacht records to ./exports/normalized-yacht-schema.json`);
    
    // Print first record as sample
    if (normalizedYachts.length > 0) {
      console.log('Sample normalized yacht record:');
      console.log(JSON.stringify(normalizedYachts[0], null, 2));
    }
  } catch (error) {
    console.error('Error exporting schema:', error);
  } finally {
    process.exit(0);
  }
}

// Run the export
exportNormalizedSchema();