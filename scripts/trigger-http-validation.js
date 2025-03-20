/**
 * Trigger Media Validation via HTTP Request
 * 
 * This script uses direct HTTP calls to trigger the media validation process.
 * It doesn't require Firebase Admin SDK or CLI credentials.
 * 
 * Usage: node scripts/trigger-http-validation.js [--collection=collection_name] [--token=firebase_id_token]
 */

const https = require('https');
const readline = require('readline');

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
let authToken = null;

args.forEach(arg => {
  if (arg.startsWith('--collection=')) {
    specificCollection = arg.split('=')[1];
  } else if (arg.startsWith('--token=')) {
    authToken = arg.split('=')[1];
  }
});

// Create readline interface for interactive input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

/**
 * Make an HTTP request to the media validation endpoint
 * 
 * @param {string} collection - The collection to validate
 * @param {string} token - The Firebase ID token for authentication
 * @returns {Promise<object>} - The response from the server
 */
function triggerValidation(collection, token) {
  return new Promise((resolve, reject) => {
    const functionUrl = 'https://us-central1-etoile-yachts.cloudfunctions.net/processMediaValidation';
    
    console.log(`\n=== Triggering validation for collection: ${collection} ===`);
    
    // Prepare the request data
    const data = JSON.stringify({
      collection,
      batchSize: 50,
      startIndex: 0,
      timestamp: Date.now(),
      isFullValidation: true,
      batchIndex: 0
    });
    
    // Configure the request options
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    // Add authentication header if a token is provided
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    
    // Make the request
    const req = https.request(functionUrl, options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`Response status: ${res.statusCode}`);
        
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`Successfully triggered validation for ${collection}`);
          try {
            const parsedData = JSON.parse(responseData);
            resolve(parsedData);
          } catch (error) {
            console.log(`Response: ${responseData}`);
            resolve({ success: true, message: responseData });
          }
        } else {
          console.error(`Error response: ${responseData}`);
          reject(new Error(`Request failed with status ${res.statusCode}: ${responseData}`));
        }
      });
    });
    
    req.on('error', (error) => {
      console.error(`Error making request: ${error.message}`);
      reject(error);
    });
    
    // Send the request
    req.write(data);
    req.end();
  });
}

/**
 * Main function
 */
async function main() {
  console.log('=== Media Validation HTTP Trigger Tool ===');
  
  try {
    // If no token was provided, ask for one
    if (!authToken) {
      console.log('No authentication token provided.');
      console.log('The function may be secured and require authentication.');
      console.log('You can get a token from the Firebase Authentication section or from your app.');
      
      authToken = await new Promise((resolve) => {
        rl.question('Enter Firebase ID token (or press Enter to continue without one): ', (answer) => {
          resolve(answer.trim() || null);
        });
      });
    }
    
    // Determine which collections to validate
    const collectionsToProcess = specificCollection
      ? [specificCollection]
      : COLLECTIONS_TO_VALIDATE;
    
    console.log(`Will validate the following collections: ${collectionsToProcess.join(', ')}`);
    
    // Process each collection
    for (const collection of collectionsToProcess) {
      try {
        await triggerValidation(collection, authToken);
      } catch (error) {
        console.error(`Error processing collection ${collection}:`, error.message);
      }
    }
    
    console.log('\n=== Validation trigger completed ===');
    console.log('Media validation tasks have been triggered.');
    console.log('You can check the Firebase Functions logs for progress and results.');
  } catch (error) {
    console.error('Error in main process:', error.message);
  } finally {
    rl.close();
  }
}

// Run the script
main();