/**
 * Download Test Media
 * 
 * This script downloads test media from a Google Drive folder
 * and uploads them to Firebase Storage for testing.
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);
const { Storage } = require('@google-cloud/storage');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Temporary directory to store downloaded files
const TEMP_DIR = 'temp_test_media';

// Helper function to extract file ID from Google Drive URL
function extractFileId(url) {
  const match = url.match(/\/d\/([^/]+)/);
  return match ? match[1] : null;
}

// Google Drive file URLs
const DRIVE_FILES = [
  'https://drive.google.com/file/d/1YHO6FiRa8OECmFtqY1wqsUxj5yigQAVv/view?usp=sharing',
  'https://drive.google.com/file/d/14pTTAP1_3PVyPagaanCyPvYJMxvsJjxz/view?usp=sharing',
  'https://drive.google.com/file/d/1y4o1q4fpgVLwXhmar7AQlkMFgx07_Hqp/view?usp=sharing',
  'https://drive.google.com/file/d/1mHRYlOC5RqYCQUlxF9esy1DOnPc1Yzfq/view?usp=sharing',
  'https://drive.google.com/file/d/1pp13dNAwATFTjqaoEcFsRv-P6cohllsP/view?usp=sharing',
  'https://drive.google.com/file/d/1rzVvcWkF_JORFXw8gKOJqrcelPMrwKwW/view?usp=sharing',
  'https://drive.google.com/file/d/18Q-gsBLx5reGa9AXy9qpsEQRw0_EDCBC/view?usp=sharing',
  'https://drive.google.com/file/d/1EVXngTqKqcqLpbL2KiI1vFLvntUt7sYh/view?usp=sharing',
  'https://drive.google.com/file/d/1B0xdKu5EIXO3PQVIRnNztPHpd8x1sSI5/view?usp=sharing',
  'https://drive.google.com/file/d/1UWxbt3aMmi07Om0Lewu901AFvp2B4MY4/view?usp=sharing',
  'https://drive.google.com/file/d/1tShh9ZFRfgGOnApK7ryD6itbAn85yEqj/view?usp=sharing',
  'https://drive.google.com/file/d/1ygjt9z4OGRXLzk4XfCUzaUGg_ryVRt0v/view?usp=sharing',
  'https://drive.google.com/file/d/1a5JRI79oYQU2AzUm5DlbzNRTHCwL3yIm/view?usp=sharing',
  'https://drive.google.com/file/d/1Vp4PAaJFT-L7pCqDKohR4B7aby_ZKNEt/view?usp=sharing'
];

// Convert to direct download URLs and assign names
const TEST_MEDIA = DRIVE_FILES.map((url, index) => {
  const fileId = extractFileId(url);
  const name = `test-media-${index + 1}.${index < 10 ? 'jpg' : 'mp4'}`; // First 10 are images, rest are videos
  
  return {
    name,
    url: `https://drive.google.com/uc?export=download&id=${fileId}`,
    originalUrl: url
  };
});

// Firebase Storage bucket information
const BUCKET_NAME = 'etoile-yachts.appspot.com';
const STORAGE_PATH = 'test_media';

/**
 * Download file from URL to local filesystem
 */
async function downloadFile(url, filePath) {
  try {
    console.log(`Downloading ${url} to ${filePath}...`);
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
    }
    
    const buffer = await response.buffer();
    await writeFile(filePath, buffer);
    
    console.log(`✓ Downloaded ${filePath}`);
    return filePath;
  } catch (error) {
    console.error(`Error downloading file from ${url}:`, error);
    throw error;
  }
}

/**
 * Upload file to Firebase Storage
 */
async function uploadFileToStorage(filePath, destination) {
  try {
    console.log(`Uploading ${filePath} to gs://${BUCKET_NAME}/${destination}...`);
    
    const storage = new Storage();
    const bucket = storage.bucket(BUCKET_NAME);
    
    await bucket.upload(filePath, {
      destination,
      metadata: {
        cacheControl: 'public, max-age=31536000',
      },
    });
    
    console.log(`✓ Uploaded to gs://${BUCKET_NAME}/${destination}`);
    
    // Make the file publicly accessible
    const file = bucket.file(destination);
    await file.makePublic();
    
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${destination}`;
    console.log(`✓ Public URL: ${publicUrl}`);
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading file to storage:`, error);
    throw error;
  }
}

/**
 * Process test media (download and upload)
 */
async function processTestMedia() {
  try {
    // Create temp directory if it doesn't exist
    if (!fs.existsSync(TEMP_DIR)) {
      await mkdir(TEMP_DIR);
    }
    
    const results = [];
    
    for (const media of TEST_MEDIA) {
      try {
        const filePath = path.join(TEMP_DIR, media.name);
        
        // Download file from Google Drive
        await downloadFile(media.url, filePath);
        
        // Upload to Firebase Storage
        const destination = `${STORAGE_PATH}/${media.name}`;
        const publicUrl = await uploadFileToStorage(filePath, destination);
        
        results.push({
          name: media.name,
          publicUrl
        });
      } catch (error) {
        console.error(`Error processing media ${media.name}:`, error);
      }
    }
    
    console.log('\nProcessing complete. Media URLs:');
    results.forEach(item => {
      console.log(`${item.name}: ${item.publicUrl}`);
    });
    
    return results;
  } catch (error) {
    console.error('Error processing test media:', error);
    throw error;
  }
}

/**
 * Clean up temporary files
 */
async function cleanup() {
  try {
    if (fs.existsSync(TEMP_DIR)) {
      console.log(`Removing temporary directory ${TEMP_DIR}...`);
      fs.rmdirSync(TEMP_DIR, { recursive: true });
      console.log('✓ Temporary directory removed');
    }
  } catch (error) {
    console.error('Error cleaning up:', error);
  }
}

/**
 * Main function
 */
async function main() {
  try {
    console.log('Starting test media processing...');
    await processTestMedia();
  } catch (error) {
    console.error('Error in main process:', error);
  } finally {
    await cleanup();
    process.exit(0);
  }
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}

module.exports = {
  processTestMedia,
  cleanup
};