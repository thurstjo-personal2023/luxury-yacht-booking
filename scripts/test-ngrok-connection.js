/**
 * Test Ngrok Connection Script
 * 
 * This script verifies the connection to Firebase emulators via ngrok tunnels.
 * It can be used to quickly check if your ngrok tunnels are properly set up
 * and accessible from Replit.
 * 
 * Usage:
 * 1. Start your local Firebase emulators
 * 2. Start ngrok tunnels for each emulator (Firestore, Auth, Storage)
 * 3. Update the ngrok URLs in this script
 * 4. Run the script with:
 *    node scripts/test-ngrok-connection.js
 */

import * as admin from 'firebase-admin';
import https from 'https';
import { spawn } from 'child_process';

// These are the actual ngrok tunnel URLs from your setup
const FIRESTORE_NGROK_URL = 'e5b9-2001-8f8-1163-5b77-39c7-7461-9eac-f645.ngrok-free.app';
const AUTH_NGROK_URL = 'e5b9-2001-8f8-1163-5b77-39c7-7461-9eac-f645.ngrok-free.app';
const STORAGE_NGROK_URL = 'e5b9-2001-8f8-1163-5b77-39c7-7461-9eac-f645.ngrok-free.app';

// Set environment variables for the emulators
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_NGROK_URL;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_NGROK_URL;
process.env.FIREBASE_STORAGE_EMULATOR_HOST = STORAGE_NGROK_URL;

// Initialize Firebase Admin with default configuration
admin.initializeApp({
  projectId: 'etoile-yachts',
});

// Configure Firestore to use the ngrok tunnel
const db = admin.firestore();
db.settings({
  host: FIRESTORE_NGROK_URL,
  ssl: true,  // Set to true for ngrok https URLs
  ignoreUndefinedProperties: true
});

/**
 * Test HTTP GET request to a given URL
 */
async function testHttpGetRequest(url) {
  return new Promise((resolve, reject) => {
    console.log(`Testing HTTP GET to: ${url}`);
    
    const req = https.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        resolve({
          statusCode: res.statusCode,
          data: data.substring(0, 200) + (data.length > 200 ? '...[truncated]' : '')
        });
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error connecting to ${url}:`, error.message);
      reject(error);
    });
    
    req.end();
  });
}

/**
 * Test connection to Firestore via ngrok
 */
async function testFirestoreConnection() {
  try {
    console.log('\n📝 Testing Firestore connection via ngrok...');
    
    // Try to write a test document
    console.log('Writing test document...');
    await db.collection('test_ngrok').doc('connection-test').set({
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      message: 'Testing ngrok connection',
      source: 'Replit'
    });
    console.log('✅ Successfully wrote document to Firestore via ngrok!');
    
    // Try to read the test document
    console.log('Reading test document...');
    const docSnapshot = await db.collection('test_ngrok').doc('connection-test').get();
    if (docSnapshot.exists) {
      console.log('✅ Successfully read document from Firestore via ngrok!');
      console.log('Document data:', docSnapshot.data());
    } else {
      console.log('❌ Document not found.');
    }
    
    // Query a collection
    console.log('Querying unified_yacht_experiences collection...');
    const yachtsSnapshot = await db.collection('unified_yacht_experiences').limit(1).get();
    console.log(`Found ${yachtsSnapshot.size} yachts in the collection.`);
    if (yachtsSnapshot.size > 0) {
      const yacht = yachtsSnapshot.docs[0].data();
      console.log('Sample yacht fields:', Object.keys(yacht).join(', '));
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error testing Firestore connection:', error.message);
    console.error('Error details:', error);
    return false;
  }
}

/**
 * Test direct HTTP connection to each emulator port via ngrok
 */
async function testHttpConnections() {
  console.log('\n🌐 Testing direct HTTP connections to emulators via ngrok...');
  
  try {
    // Test Firestore emulator
    console.log('\nTesting Firestore Emulator HTTP connection:');
    const firestoreResult = await testHttpGetRequest(`https://${FIRESTORE_NGROK_URL}`);
    console.log(`Firestore response (${firestoreResult.statusCode}):`, firestoreResult.data);
    
    // Test Auth emulator
    console.log('\nTesting Auth Emulator HTTP connection:');
    const authResult = await testHttpGetRequest(`https://${AUTH_NGROK_URL}`);
    console.log(`Auth response (${authResult.statusCode}):`, authResult.data);
    
    // Test Storage emulator
    console.log('\nTesting Storage Emulator HTTP connection:');
    const storageResult = await testHttpGetRequest(`https://${STORAGE_NGROK_URL}`);
    console.log(`Storage response (${storageResult.statusCode}):`, storageResult.data);
    
    return true;
  } catch (error) {
    console.error('❌ Error testing HTTP connections:', error.message);
    return false;
  }
}

/**
 * Run curl command to test connection
 */
async function testCurlConnection(url) {
  return new Promise((resolve, reject) => {
    console.log(`\nTesting curl connection to: ${url}`);
    
    const curl = spawn('curl', ['-v', url]);
    
    let stdout = '';
    let stderr = '';
    
    curl.stdout.on('data', (data) => {
      stdout += data.toString();
    });
    
    curl.stderr.on('data', (data) => {
      stderr += data.toString();
    });
    
    curl.on('close', (code) => {
      console.log(`curl exited with code ${code}`);
      if (stdout) console.log('curl output:', stdout.substring(0, 200) + (stdout.length > 200 ? '...[truncated]' : ''));
      if (stderr) console.log('curl error output:', stderr.substring(0, 200) + (stderr.length > 200 ? '...[truncated]' : ''));
      
      if (code === 0) {
        resolve(true);
      } else {
        reject(new Error(`curl failed with code ${code}`));
      }
    });
  });
}

/**
 * Main test function
 */
async function runTests() {
  console.log('=== Firebase Emulator Ngrok Connection Test ===');
  console.log('Configured ngrok URLs:');
  console.log(`- Firestore: ${FIRESTORE_NGROK_URL}`);
  console.log(`- Auth: ${AUTH_NGROK_URL}`);
  console.log(`- Storage: ${STORAGE_NGROK_URL}`);
  
  let firestoreConnected = false;
  let httpConnected = false;
  let curlTested = false;
  
  try {
    // Test Firestore connection through Admin SDK
    firestoreConnected = await testFirestoreConnection();
    
    // Test HTTP connections to emulators
    httpConnected = await testHttpConnections();
    
    // Test curl connection to Firestore
    await testCurlConnection(`https://${FIRESTORE_NGROK_URL}`);
    curlTested = true;
  } catch (error) {
    console.error('Error during tests:', error);
  }
  
  // Summary
  console.log('\n=== Connection Test Summary ===');
  console.log(`Firestore Admin SDK: ${firestoreConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`HTTP Connections: ${httpConnected ? '✅ Connected' : '❌ Failed'}`);
  console.log(`Curl Test: ${curlTested ? '✅ Tested' : '❌ Failed'}`);
  
  if (firestoreConnected) {
    console.log('\n✅ SUCCESS: Connected to Firebase emulators via ngrok tunnels!');
    console.log('Your configuration is working correctly.');
  } else {
    console.log('\n❌ FAILED: Could not connect to Firebase emulators via ngrok.');
    console.log('Please check your ngrok tunnels and update the URLs in this script.');
    
    // Provide some troubleshooting tips
    console.log('\nTroubleshooting tips:');
    console.log('1. Ensure your Firebase emulators are running locally');
    console.log('2. Check that your ngrok tunnels are active and correct');
    console.log('3. Verify that the ngrok URLs in this script match your active tunnels');
    console.log('4. Make sure ngrok is using the https protocol');
    console.log('5. Try restarting the ngrok tunnels');
  }
}

// Run the tests
runTests().catch(console.error);