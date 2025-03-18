/**
 * Test Blob URL Resolver
 * 
 * This script tests the blob URL resolution functionality
 * by processing test documents and printing the results.
 * 
 * Usage: node scripts/test-blob-url-resolver.js
 */

import { 
  isBlobUrl,
  replaceBlobUrl,
  replaceBlobUrlsInObject,
  resolveBlobUrlsInDocument
} from './blob-url-resolver-test-exports.js';

// Test data with blob URLs
const TEST_DATA = {
  simpleDocument: {
    id: 'test-doc-1',
    data: {
      title: 'Test Yacht',
      description: 'A beautiful test yacht',
      imageUrl: 'blob:https://etoile-yachts.replit.app/12345-67890',
      galleryImages: [
        'blob:https://etoile-yachts.replit.app/abcde-fghij',
        'https://valid-images.com/yacht1.jpg',
        'blob:https://etoile-yachts.replit.app/klmno-pqrst'
      ]
    }
  },
  nestedDocument: {
    id: 'test-doc-2',
    data: {
      title: 'Nested Test Document',
      profile: {
        name: 'Test User',
        avatar: 'blob:https://etoile-yachts.replit.app/user-avatar-12345',
        details: {
          coverPhoto: 'blob:https://etoile-yachts.replit.app/cover-photo-67890'
        }
      },
      media: [
        {
          type: 'image',
          url: 'blob:https://etoile-yachts.replit.app/media-1'
        },
        {
          type: 'video',
          url: 'https://videos.example.com/yacht-tour.mp4'
        },
        {
          type: 'image',
          url: 'blob:https://etoile-yachts.replit.app/media-2'
        }
      ]
    }
  },
  invalidBlobDocument: {
    id: 'test-doc-3',
    data: {
      title: 'Invalid Blob URLs',
      images: [
        'blob://invalid-blob-url-1',
        'blob://invalid-blob-url-2',
        'https://valid-url.com/image.jpg'
      ]
    }
  },
  circularDocument: {
    id: 'test-doc-4',
    data: {
      title: 'Circular References Document',
      imageUrl: 'blob:https://etoile-yachts.replit.app/circular-test'
    }
  }
};

// Add circular reference for testing
TEST_DATA.circularDocument.data.self = TEST_DATA.circularDocument.data;

// Mock the update method for test documents
function createMockDocument(id, data) {
  return {
    id,
    data,
    ref: {
      update: async (newData) => {
        console.log(`Mocked update for document ${id}`);
        return Promise.resolve();
      }
    }
  };
}

// Run tests
async function runTests() {
  console.log('===== BLOB URL RESOLVER TEST =====\n');

  // Test isBlobUrl function
  console.log('Testing isBlobUrl function:');
  const urlTests = [
    'blob:https://etoile-yachts.replit.app/12345-67890',
    'blob://invalid-blob-url',
    'https://valid-url.com/image.jpg',
    '/relative/path/image.jpg',
    null,
    undefined,
    ''
  ];

  urlTests.forEach(url => {
    console.log(`  - "${url}": ${isBlobUrl(url)}`);
  });
  console.log();

  // Test replaceBlobUrl function
  console.log('Testing replaceBlobUrl function:');
  urlTests.forEach(url => {
    const result = replaceBlobUrl(url);
    console.log(`  - "${url}" → "${result}"`);
  });
  console.log();

  // Test replaceBlobUrlsInObject function
  console.log('Testing replaceBlobUrlsInObject function:');
  
  // Simple document
  const simpleDocCopy = JSON.parse(JSON.stringify(TEST_DATA.simpleDocument.data));
  const simpleCount = replaceBlobUrlsInObject(simpleDocCopy);
  console.log(`  - Simple document: ${simpleCount} URLs replaced`);
  console.log('    Before:', TEST_DATA.simpleDocument.data.imageUrl);
  console.log('    After:', simpleDocCopy.imageUrl);
  
  // Nested document
  const nestedDocCopy = JSON.parse(JSON.stringify(TEST_DATA.nestedDocument.data));
  const nestedCount = replaceBlobUrlsInObject(nestedDocCopy);
  console.log(`  - Nested document: ${nestedCount} URLs replaced`);
  console.log('    Before:', TEST_DATA.nestedDocument.data.profile.avatar);
  console.log('    After:', nestedDocCopy.profile.avatar);
  
  // Circular document
  const circularDoc = { ...TEST_DATA.circularDocument.data };
  const circularCount = replaceBlobUrlsInObject(circularDoc);
  console.log(`  - Circular document: ${circularCount} URLs replaced`);
  console.log('    Before:', TEST_DATA.circularDocument.data.imageUrl);
  console.log('    After:', circularDoc.imageUrl);
  console.log();

  // Test resolveBlobUrlsInDocument function
  console.log('Testing resolveBlobUrlsInDocument function:');
  
  // Create mock documents
  const mockDocs = [
    createMockDocument('test-doc-1', JSON.parse(JSON.stringify(TEST_DATA.simpleDocument.data))),
    createMockDocument('test-doc-2', JSON.parse(JSON.stringify(TEST_DATA.nestedDocument.data))),
    createMockDocument('test-doc-3', JSON.parse(JSON.stringify(TEST_DATA.invalidBlobDocument.data)))
  ];
  
  // Process each document
  for (const doc of mockDocs) {
    console.log(`  - Processing document ${doc.id}:`);
    console.log('    Before:', JSON.stringify(doc.data.imageUrl || doc.data.images?.[0] || doc.data.profile?.avatar).slice(0, 40) + '...');
    
    const processedDoc = await resolveBlobUrlsInDocument(doc);
    
    console.log('    After:', JSON.stringify(processedDoc.data.imageUrl || processedDoc.data.images?.[0] || processedDoc.data.profile?.avatar).slice(0, 40) + '...');
  }

  console.log('\n===== TEST COMPLETED =====');
}

// Execute tests
runTests().catch(error => {
  console.error('Test failed:', error);
});