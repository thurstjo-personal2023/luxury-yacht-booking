/**
 * Setup Media Validation Firebase Emulators
 * 
 * This script sets up and initializes Firebase emulators specifically for
 * media validation integration tests. It ensures the emulators are running
 * and bootstraps them with initial test data.
 */

const admin = require('firebase-admin');
const { spawn } = require('child_process');
const axios = require('axios');
const path = require('path');

// Emulator configuration from firebase.json
const emulatorConfig = {
  auth: {
    host: '127.0.0.1',
    port: 9099
  },
  firestore: {
    host: '127.0.0.1',
    port: 8080
  },
  storage: {
    host: '127.0.0.1',
    port: 9199
  },
  pubsub: {
    host: '127.0.0.1',
    port: 8085
  },
  ui: {
    port: 4000
  }
};

// Test project ID
const projectId = 'etoile-yachts-test';

/**
 * Check if emulators are already running
 */
async function checkEmulatorsRunning() {
  try {
    // Try to connect to emulator UI
    await axios.get(`http://${emulatorConfig.ui.host || 'localhost'}:${emulatorConfig.ui.port}`);
    console.log('Emulators appear to be running');
    return true;
  } catch (error) {
    console.log('Emulators are not running');
    return false;
  }
}

/**
 * Start the emulators if they're not already running
 */
async function startEmulators() {
  // Check if already running
  const running = await checkEmulatorsRunning();
  if (running) return;
  
  console.log('Starting Firebase emulators...');
  
  // Start emulators using firebase tools
  const emulatorProcess = spawn('npx', [
    'firebase',
    'emulators:start',
    '--only',
    'auth,firestore,pubsub,storage',
    '--project',
    projectId
  ]);
  
  // Handle output
  emulatorProcess.stdout.on('data', (data) => {
    console.log(`Firebase Emulator: ${data}`);
  });
  
  emulatorProcess.stderr.on('data', (data) => {
    console.error(`Firebase Emulator Error: ${data}`);
  });
  
  // Wait for emulators to start
  let retries = 30;
  while (retries > 0) {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const result = await axios.get(`http://${emulatorConfig.ui.host || 'localhost'}:${emulatorConfig.ui.port}`);
      if (result.status === 200) {
        console.log('Emulators started successfully');
        return;
      }
    } catch (error) {
      retries--;
      console.log(`Waiting for emulators to start (${retries} retries left)...`);
    }
  }
  
  throw new Error('Timed out waiting for emulators to start');
}

/**
 * Initialize the emulators with test data
 */
async function bootstrapEmulators() {
  console.log('Bootstrapping emulators with test data...');
  
  // Initialize admin SDK
  if (!admin.apps.length) {
    admin.initializeApp({
      projectId
    });
  }
  
  // Set environment variables for emulator connections
  process.env.FIRESTORE_EMULATOR_HOST = `${emulatorConfig.firestore.host}:${emulatorConfig.firestore.port}`;
  process.env.FIREBASE_AUTH_EMULATOR_HOST = `${emulatorConfig.auth.host}:${emulatorConfig.auth.port}`;
  process.env.FIREBASE_STORAGE_EMULATOR_HOST = `${emulatorConfig.storage.host}:${emulatorConfig.storage.port}`;
  
  // Get Firestore instance
  const db = admin.firestore();
  
  // Create test collections
  const testCollections = [
    'test_yachts',
    'test_users',
    'validation_reports_test',
    'repair_reports_test'
  ];
  
  // Bootstrap with sample data
  try {
    // Create sample documents for each collection
    for (const collection of testCollections) {
      // Skip reports collections
      if (collection.includes('reports')) continue;
      
      // Add 5 sample documents to each collection
      for (let i = 0; i < 5; i++) {
        await db.collection(collection).doc(`bootstrap-doc-${i}`).set({
          title: `Bootstrap Document ${i}`,
          description: `Sample document for testing in ${collection}`,
          coverImage: i % 2 === 0 ? 'https://example.com/valid.jpg' : '/invalid.jpg',
          createdAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`Added sample data to ${collection} collection`);
    }
    
    console.log('Emulator bootstrap complete');
  } catch (error) {
    console.error('Error bootstrapping emulators:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await startEmulators();
    await bootstrapEmulators();
    
    console.log('Emulators are ready for media validation tests');
  } catch (error) {
    console.error('Error setting up emulators:', error);
    process.exit(1);
  }
}

// Only run the setup if executed directly (not imported)
if (require.main === module) {
  main();
}

// Export for use in other scripts
module.exports = {
  config: emulatorConfig,
  projectId,
  startEmulators,
  bootstrapEmulators
};