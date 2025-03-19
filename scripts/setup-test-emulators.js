/**
 * Setup Test Emulators
 * 
 * This script configures and starts Firebase emulators for testing.
 * It uses a separate configuration file and port settings to avoid
 * conflicts with the development environment.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const FIREBASE_CONFIG_PATH = path.join(__dirname, '..', 'firebase.test.json');
const TEST_DATA_PATH = path.join(__dirname, '..', 'tests', 'test-data');

// Ensure test data directory exists
if (!fs.existsSync(TEST_DATA_PATH)) {
  fs.mkdirSync(TEST_DATA_PATH, { recursive: true });
}

// Create or update the export-metadata.json file
const metadataPath = path.join(TEST_DATA_PATH, 'export-metadata.json');
if (!fs.existsSync(metadataPath)) {
  const metadata = {
    version: 'firebase-export-metadata-1',
    firestore: {
      version: '1.16.1',
      path: 'firestore_export',
      metadata_file: 'firestore_export/firestore_export.overall_export_metadata'
    },
    storage: {
      version: '10.7.0',
      path: 'storage_export'
    }
  };
  
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
}

// Function to start the emulators
function startEmulators() {
  console.log('Starting Firebase emulators for testing...');
  
  // Create emulator process
  const emulatorProcess = spawn('firebase', [
    'emulators:start',
    '--config', FIREBASE_CONFIG_PATH,
    '--import', TEST_DATA_PATH,
    '--export-on-exit', TEST_DATA_PATH
  ], {
    stdio: 'inherit',
    shell: true
  });
  
  // Handle emulator process events
  emulatorProcess.on('error', (error) => {
    console.error('Failed to start emulators:', error);
    process.exit(1);
  });
  
  return emulatorProcess;
}

// If this script is run directly
if (require.main === module) {
  const emulatorProcess = startEmulators();
  
  // Handle clean shutdown
  process.on('SIGINT', () => {
    console.log('Stopping emulators...');
    emulatorProcess.kill('SIGINT');
  });
  
  emulatorProcess.on('exit', (code) => {
    console.log(`Emulators exited with code ${code}`);
    process.exit(code);
  });
}

// Export for use in other scripts
module.exports = {
  startEmulators,
  config: {
    firestore: { host: '127.0.0.1', port: 8081 },
    auth: { host: '127.0.0.1', port: 9091 },
    storage: { host: '127.0.0.1', port: 9191 },
    functions: { host: '127.0.0.1', port: 5002 },
    pubsub: { host: '127.0.0.1', port: 8086 }
  },
  testDataPath: TEST_DATA_PATH
};