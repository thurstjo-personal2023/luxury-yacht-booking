// This script runs the migration of all yacht-related collections to the unified collection
const { migrateToUnifiedCollection } = require('./migrate-to-unified-yacht-experiences');

console.log('Starting migration of yacht data to unified collection...');

migrateToUnifiedCollection()
  .then((stats) => {
    console.log('Migration completed successfully!');
    console.log('Stats:', JSON.stringify(stats, null, 2));
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });