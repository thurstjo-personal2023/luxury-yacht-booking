// Script to run the TypeScript migration file using ts-node
import { execSync } from 'child_process';

console.log('Starting migration to unified yachts collection...');

try {
  // Run the migration script using tsx
  execSync('npx tsx scripts/migrate-to-unified-collection.ts', { 
    stdio: 'inherit' // This will show the output in real-time
  });
  
  console.log('Migration script executed successfully!');
} catch (error) {
  console.error('Error running migration script:', error);
  process.exit(1);
}