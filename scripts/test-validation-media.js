/**
 * Test Media Validation System
 * 
 * This script creates test documents with various media issues in a test collection
 * to verify our media validation and repair system.
 */

const admin = require('firebase-admin');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();
const TEST_COLLECTION = 'test_media_validation';

// Test URLs for various media issues
const TEST_URLS = {
  // Valid images
  validImage: 'https://storage.googleapis.com/etoile-yachts.appspot.com/test_media/valid-yacht-image.jpg',
  
  // Valid video
  validVideo: 'https://storage.googleapis.com/etoile-yachts.appspot.com/test_media/valid-yacht-video.mp4',
  
  // Invalid URLs - special cases
  relativeUrl: '/yacht-placeholder.jpg',
  blobUrl: 'blob:https://example.com/1234-5678-90ab-cdef',
  
  // Incorrect MIME type - video marked as image
  videoAsImage: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024835470_826b5a1fd71b2151_Dynamic%20motion.mp4',
  
  // Broken URL that should 404
  brokenUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/non-existent-image.jpg',
  
  // Malformed URL
  malformedUrl: 'htp:/invalid-url',
};

/**
 * Create test documents with various media issues
 */
async function createTestDocuments() {
  try {
    console.log('Creating test documents in collection:', TEST_COLLECTION);
    
    // Document 1: Valid media
    await db.collection(TEST_COLLECTION).doc('valid-media').set({
      title: 'Test Document with Valid Media',
      description: 'This document contains valid image and video media',
      media: [
        { type: 'image', url: TEST_URLS.validImage },
        { type: 'video', url: TEST_URLS.validVideo }
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Created document with valid media');
    
    // Document 2: Video incorrectly marked as image
    await db.collection(TEST_COLLECTION).doc('invalid-mime-type').set({
      title: 'Test Document with Invalid MIME Type',
      description: 'This document contains a video incorrectly marked as an image',
      media: [
        { type: 'image', url: TEST_URLS.videoAsImage } // Video incorrectly marked as image
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Created document with invalid MIME type');
    
    // Document 3: Relative and blob URLs
    await db.collection(TEST_COLLECTION).doc('relative-and-blob-urls').set({
      title: 'Test Document with Relative and Blob URLs',
      description: 'This document contains relative URLs and blob URLs',
      media: [
        { type: 'image', url: TEST_URLS.relativeUrl }, // Relative URL
        { type: 'image', url: TEST_URLS.blobUrl }      // Blob URL
      ],
      profilePhoto: TEST_URLS.relativeUrl, // Another relative URL in a different field
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Created document with relative and blob URLs');
    
    // Document 4: Broken URLs
    await db.collection(TEST_COLLECTION).doc('broken-urls').set({
      title: 'Test Document with Broken URLs',
      description: 'This document contains broken URLs that should 404',
      media: [
        { type: 'image', url: TEST_URLS.brokenUrl },   // Should 404
        { type: 'image', url: TEST_URLS.malformedUrl } // Malformed URL
      ],
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
    console.log('✓ Created document with broken URLs');
    
    console.log('\nSetup complete: Created 4 test documents in', TEST_COLLECTION);
    console.log('You can now run the validation tools on this collection.');
    
  } catch (error) {
    console.error('Error creating test documents:', error);
  }
}

/**
 * Clean up test collection
 */
async function cleanupTestCollection() {
  try {
    console.log(`Deleting all documents in ${TEST_COLLECTION} collection...`);
    
    const snapshot = await db.collection(TEST_COLLECTION).get();
    
    if (snapshot.empty) {
      console.log('No documents to delete.');
      return;
    }
    
    const batch = db.batch();
    
    snapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    console.log(`✓ Successfully deleted ${snapshot.size} documents`);
  } catch (error) {
    console.error('Error cleaning up test collection:', error);
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'create';
  
  if (command === 'create') {
    await createTestDocuments();
  } else if (command === 'cleanup') {
    await cleanupTestCollection();
  } else {
    console.log('Usage: node test-validation-media.js [create|cleanup]');
  }
  
  process.exit(0);
}

// Run the script
main().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});