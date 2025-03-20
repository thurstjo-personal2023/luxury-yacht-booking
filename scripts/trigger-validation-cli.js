/**
 * Trigger Media Validation Script (CLI Version)
 * 
 * This script uses the Firebase CLI to trigger the media validation process.
 * It's a simpler alternative that doesn't require service account credentials.
 * 
 * Prerequisites:
 * 1. You must be logged in with Firebase CLI: firebase login
 * 2. Your project must be selected: firebase use <project-id>
 * 
 * Usage: node scripts/trigger-validation-cli.js [--collection=collection_name]
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Collection names to validate (add more as needed)
const COLLECTIONS_TO_VALIDATE = [
  'unified_yacht_experiences',
  'products_add_ons',
  'yacht_profiles',
  'articles_and_guides',
  'event_announcements'
];

// Parse command line arguments
const args = process.argv.slice(2);
let specificCollection = null;

args.forEach(arg => {
  if (arg.startsWith('--collection=')) {
    specificCollection = arg.split('=')[1];
  }
});

/**
 * Trigger validation for a collection using Firebase CLI
 */
function triggerCollectionValidation(collection) {
  console.log(`\n=== Triggering validation for collection: ${collection} ===`);

  // Create a temporary message file
  const messageFile = path.join(__dirname, 'temp-message.json');
  const message = {
    data: {
      collection,
      batchSize: 50,
      startIndex: 0,
      timestamp: Date.now(),
      isFullValidation: true,
      batchIndex: 0
    }
  };

  try {
    // Write the message to a temporary file
    fs.writeFileSync(messageFile, JSON.stringify(message));
    
    // Trigger the function using Firebase CLI
    console.log(`Executing Firebase CLI command to publish message...`);
    const command = `firebase functions:call processMediaValidation --data="${JSON.stringify(message.data).replace(/"/g, '\\"')}"`;
    
    console.log(`Running command: ${command}`);
    const result = execSync(command, { encoding: 'utf8' });
    console.log(`Result: ${result}`);
    
    console.log(`Successfully triggered validation for ${collection}`);
  } catch (error) {
    console.error(`Error triggering validation for ${collection}:`, error.message);
  } finally {
    // Clean up the temporary file
    if (fs.existsSync(messageFile)) {
      fs.unlinkSync(messageFile);
    }
  }
}

/**
 * Main function
 */
function main() {
  console.log('=== Media Validation Trigger Tool (CLI Version) ===');

  try {
    // Check if Firebase CLI is installed and logged in
    try {
      execSync('firebase --version', { encoding: 'utf8' });
    } catch (error) {
      console.error('Error: Firebase CLI is not installed or not in PATH.');
      console.error('Please install it with: npm install -g firebase-tools');
      process.exit(1);
    }

    // Check if logged in
    try {
      const loginStatus = execSync('firebase login:list', { encoding: 'utf8' });
      if (!loginStatus.includes('✔')) {
        console.error('Error: Not logged in to Firebase CLI.');
        console.error('Please login with: firebase login');
        process.exit(1);
      }
    } catch (error) {
      console.error('Error checking Firebase login status:', error.message);
      process.exit(1);
    }

    // Determine which collections to validate
    const collectionsToProcess = specificCollection
      ? [specificCollection]
      : COLLECTIONS_TO_VALIDATE;

    console.log(`Will validate the following collections: ${collectionsToProcess.join(', ')}`);

    // Process each collection
    for (const collection of collectionsToProcess) {
      triggerCollectionValidation(collection);
    }

    console.log('\n=== Validation trigger completed ===');
    console.log('Media validation tasks have been triggered.');
    console.log('You can check the Firebase Functions logs for progress and results.');
  } catch (error) {
    console.error('Error triggering validation:', error.message);
    process.exit(1);
  }
}

// Run the script
main();