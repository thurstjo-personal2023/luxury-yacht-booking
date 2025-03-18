/**
 * Test Single Collection Blob URL Resolution
 * 
 * This script tests the blob URL resolution functionality on a single collection
 * with multiple test documents.
 * 
 * Usage: node scripts/test-single-collection.js [collection_name]
 */

import { 
  isBlobUrl,
  replaceBlobUrl,
  resolveBlobUrlsInCollection
} from './blob-url-resolver-test-exports.js';

// Mock documents for a test collection
const TEST_COLLECTION_DOCS = [
  {
    id: 'doc-1',
    data: {
      title: 'Yacht 1',
      description: 'Luxury yacht experience',
      mainImage: 'blob:https://etoile-yachts.replit.app/yacht1-main',
      media: [
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/yacht1-media1' },
        { type: 'image', url: 'https://storage.googleapis.com/valid-yacht-image.jpg' },
        { type: 'video', url: 'https://storage.googleapis.com/valid-yacht-video.mp4' }
      ]
    }
  },
  {
    id: 'doc-2',
    data: {
      title: 'Yacht 2',
      description: 'Premium yacht experience',
      mainImage: 'https://storage.googleapis.com/valid-yacht2-image.jpg',
      media: [
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/yacht2-media1' },
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/yacht2-media2' }
      ]
    }
  },
  {
    id: 'doc-3',
    data: {
      title: 'Yacht 3',
      description: 'Economy yacht experience',
      mainImage: 'blob://yacht3-invalid-blob',
      media: [
        { type: 'image', url: 'blob://yacht3-media1-invalid' },
        { type: 'image', url: '/relative/path/yacht3-image.jpg' }
      ]
    }
  }
];

// Create a mock Firestore implementation
const createMockFirestore = () => {
  const collections = new Map();
  
  // Add test collection
  collections.set('test_collection', {
    docs: TEST_COLLECTION_DOCS.map(doc => ({
      id: doc.id,
      data: () => ({ ...doc.data }),
      ref: {
        update: async (newData) => {
          console.log(`Mocked update for document ${doc.id}`);
          return Promise.resolve();
        }
      }
    }))
  });
  
  return {
    collection: (name) => {
      if (!collections.has(name)) {
        console.warn(`Collection "${name}" does not exist in mock Firestore`);
        return { get: () => Promise.resolve({ docs: [] }) };
      }
      
      return {
        get: () => Promise.resolve({
          docs: collections.get(name).docs,
          forEach: (callback) => collections.get(name).docs.forEach(callback)
        })
      };
    }
  };
};

// Run tests
async function runTests() {
  console.log('===== COLLECTION BLOB URL RESOLVER TEST =====\n');
  
  // Get collection name from command line args or use default
  const collectionName = process.argv[2] || 'test_collection';
  console.log(`Testing collection: ${collectionName}`);
  
  // Create mock Firestore
  const mockFirestore = createMockFirestore();
  
  // Print the test documents
  console.log('\nTest Documents:');
  mockFirestore.collection(collectionName).get()
    .then(snapshot => {
      snapshot.docs.forEach(doc => {
        console.log(`- Document ${doc.id}:`);
        console.log(`  Main Image: ${doc.data().mainImage}`);
        console.log(`  Media Count: ${doc.data().media?.length || 0}`);
        
        // Count blob URLs
        let blobCount = 0;
        if (isBlobUrl(doc.data().mainImage)) blobCount++;
        doc.data().media?.forEach(item => {
          if (isBlobUrl(item.url)) blobCount++;
        });
        
        console.log(`  Blob URLs: ${blobCount}`);
      });
    });
  
  // Process the collection
  console.log('\nProcessing collection...');
  try {
    const result = await resolveBlobUrlsInCollection(mockFirestore, collectionName);
    
    console.log('\nResults:');
    console.log(`- Success: ${result.success}`);
    console.log(`- Documents Processed: ${result.stats.processed}`);
    console.log(`- Documents Updated: ${result.stats.updated}`);
    console.log(`- Documents Skipped: ${result.stats.skipped}`);
    console.log(`- Errors: ${result.stats.errors}`);
    console.log(`- Total URLs Resolved: ${result.resolvedUrls}`);
    
    // Additional details if available
    if (result.details) {
      console.log('\nDetails:');
      result.details.forEach(detail => {
        console.log(`- ${detail}`);
      });
    }
    
  } catch (error) {
    console.error('Error processing collection:', error);
  }
  
  console.log('\n===== TEST COMPLETED =====');
}

// Execute tests
runTests().catch(error => {
  console.error('Test failed:', error);
});