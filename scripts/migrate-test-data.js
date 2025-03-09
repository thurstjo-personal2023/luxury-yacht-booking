// This script migrates test data to the unified yacht collection
import { migrateToUnifiedCollection } from './migrate-to-unified-yacht-experiences.js';

// First make sure we have test data in the source collections
import { insertTestData } from '../server/create-test-data.js';

async function migrateTestData() {
  console.log('Step 1: Inserting test data into source collections...');
  try {
    await insertTestData();
    console.log('Test data inserted successfully.');
  } catch (error) {
    console.error('Error inserting test data:', error);
    return;
  }

  console.log('Step 2: Migrating data to unified collection...');
  try {
    const stats = await migrateToUnifiedCollection();
    console.log('Migration completed successfully.');
    console.log('Stats:', JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

migrateTestData()
  .then(() => {
    console.log('Test data migration process completed.');
    process.exit(0);
  })
  .catch(err => {
    console.error('Test data migration process failed:', err);
    process.exit(1);
  });