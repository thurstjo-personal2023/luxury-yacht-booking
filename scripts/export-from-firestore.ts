import * as fs from 'fs';
import * as path from 'path';
import { db } from '../client/src/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';

// Collections to export
const COLLECTIONS = [
  'yacht_experiences',
  'user_profiles_tourist',
  'user_profiles_service_provider',
  'articles_and_guides',
  'event_announcements',
  'notifications',
  'products_add_ons',
  'products_add-ons', // Include both variants
  'product_add_ons',
  'promotions_and_offers',
  'reviews_and_feedback',
  'support_content',
  'experience_packages', // Include both variants
  'users'
];

// Ensure the exports directory exists
const EXPORTS_DIR = path.join(__dirname, '../exports');
if (!fs.existsSync(EXPORTS_DIR)) {
  fs.mkdirSync(EXPORTS_DIR, { recursive: true });
}

/**
 * Export a single collection to a JSON file
 */
async function exportCollection(collectionName: string): Promise<void> {
  try {
    console.log(`Exporting collection: ${collectionName}...`);
    
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`Collection ${collectionName} is empty, skipping...`);
      return;
    }
    
    // Convert snapshot to array of data objects with IDs
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Write to file
    const filePath = path.join(EXPORTS_DIR, `${collectionName}.json`);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    console.log(`Successfully exported ${data.length} documents from ${collectionName} to ${filePath}`);
  } catch (error) {
    console.error(`Error exporting collection ${collectionName}:`, error);
  }
}

/**
 * Export all collections
 */
async function exportAllCollections(): Promise<void> {
  console.log('Starting export of all collections...');
  
  // Process collections in sequence to avoid rate limiting
  for (const collectionName of COLLECTIONS) {
    try {
      await exportCollection(collectionName);
    } catch (error) {
      // Continue with next collection even if one fails
      console.error(`Failed to export ${collectionName}:`, error);
    }
  }
  
  console.log('Export complete! Files are saved in the exports directory.');
}

// Run the export
exportAllCollections().catch(console.error);