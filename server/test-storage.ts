/**
 * Test Firebase Storage in Production
 * 
 * This module tests Firebase Storage functionality in the production environment.
 * It attempts to upload a test image and verify that it was successfully stored.
 */

import { adminStorage } from './firebase-admin';
import * as fs from 'fs';
import * as path from 'path';
import { USE_FIREBASE_EMULATORS } from './env-config';

/**
 * Run a test to verify production storage functionality
 */
export async function testProductionStorage() {
  try {
    if (USE_FIREBASE_EMULATORS) {
      console.log("⚠️ Using Firebase emulators - skipping production storage test");
      return false;
    }
    
    console.log("======= FIREBASE STORAGE CONNECTION TEST =======");
    
    // Generate a test image (simple 1x1 pixel PNG)
    const testImageBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+P+/HgAFeAJ5jSQqpAAAAABJRU5ErkJggg==',
      'base64'
    );
    
    // Create a unique filename
    const timestamp = Date.now();
    const testImagePath = `test-uploads/storage-test-${timestamp}.png`;
    
    console.log(`1. Uploading test image to ${testImagePath}...`);
    
    // Upload the test file
    const bucket = adminStorage.bucket();
    const file = bucket.file(testImagePath);
    
    await file.save(testImageBuffer, {
      metadata: {
        contentType: 'image/png',
        metadata: {
          test: 'true',
          timestamp: timestamp.toString(),
          source: 'storage connection test'
        }
      }
    });
    
    console.log(`✓ Successfully uploaded test image`);
    
    // Verify the file exists
    console.log(`2. Verifying test image exists...`);
    const [exists] = await file.exists();
    
    if (exists) {
      console.log(`✓ File exists in storage`);
      console.log(`3. Getting file metadata...`);
      
      const [metadata] = await file.getMetadata();
      
      console.log(`✓ File metadata retrieved successfully`);
      console.log(`  - File name: ${metadata.name}`);
      console.log(`  - Content type: ${metadata.contentType}`);
      console.log(`  - Size: ${metadata.size} bytes`);
      console.log(`  - Creation time: ${metadata.timeCreated}`);
      console.log(`  - Download URL: ${metadata.mediaLink || '(Requires public access)'}`);
      
      // Get the public URL (if ACLs allow)
      try {
        // Generate a signed URL that expires in 1 hour
        const [signedUrl] = await file.getSignedUrl({
          action: 'read',
          expires: Date.now() + 1000 * 60 * 60, // 1 hour
        });
        
        console.log(`  - Signed URL (1hr): ${signedUrl}`);
      } catch (urlError) {
        console.error(`  ❌ Could not generate signed URL:`, urlError);
      }
      
      console.log(`4. Cleaning up - deleting test file...`);
      await file.delete();
      console.log(`✓ Test file deleted successfully`);
    } else {
      console.error(`❌ File does not exist after upload`);
      return false;
    }
    
    console.log(`======= END OF STORAGE CONNECTION TEST =======\n`);
    return true;
  } catch (error: any) {
    console.error(`❌ Error during storage test:`, error.message);
    return false;
  }
}

// This will run only when called directly from other modules
// ES modules don't have the require.main === module pattern
export async function runStorageTest() {
  const success = await testProductionStorage();
  console.log(`Storage test ${success ? 'PASSED' : 'FAILED'}`);
  return success;
}