import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize admin SDK (using environment path)
const serviceAccountPath = path.resolve(__dirname, '../firebase-data-connect.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

// Function to normalize yacht data
function normalizeYachtData(data: any, id: string) {
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

// Export normalized schema
async function exportNormalizedSchema() {
  try {
    console.log('Exporting normalized yacht schema...');
    
    // Get all yacht experiences
    const snapshot = await db.collection('yacht_experiences').get();
    
    if (snapshot.empty) {
      console.log('No experiences found in yacht_experiences collection.');
      return;
    }
    
    // Normalize the data
    const normalizedYachts = snapshot.docs.map(doc => {
      const data = doc.data();
      return normalizeYachtData(data, doc.id);
    });
    
    // Write to file
    const outputPath = path.join(__dirname, '../exports/normalized-yacht-schema.json');
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(normalizedYachts, null, 2));
    
    console.log(`Successfully exported ${normalizedYachts.length} normalized yacht records to ${outputPath}`);
    
    // Also output the first record to console for quick reference
    console.log('Example of normalized record:');
    console.log(JSON.stringify(normalizedYachts[0], null, 2));
  } catch (error) {
    console.error('Error exporting normalized schema:', error);
  } finally {
    // Exit process
    process.exit();
  }
}

// Run the function
exportNormalizedSchema();