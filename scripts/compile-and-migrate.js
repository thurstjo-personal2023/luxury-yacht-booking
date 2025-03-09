// This script uses tsx to run the TypeScript files directly
import { execSync } from 'child_process';
import fs from 'fs';

console.log('Starting the migration process...');

// Ensure the data is properly initialized
console.log('Step 1: Inserting test data into source collections');
try {
  const result = execSync('npx tsx server/create-test-data.ts --insert-legacy', { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.error('Error inserting test data:', error.message);
  process.exit(1);
}

console.log('Step 2: Running migration to unified collection');
try {
  const result = execSync('npx tsx scripts/migrate-to-unified-yacht-experiences.ts', { encoding: 'utf8' });
  console.log(result);
} catch (error) {
  console.error('Error running migration:', error.message);
  process.exit(1);
}

console.log('Migration completed successfully!');