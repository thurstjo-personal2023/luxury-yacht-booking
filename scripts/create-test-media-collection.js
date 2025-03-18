/**
 * Create Test Media Collection Script
 * 
 * This script sets up a test collection in Firestore with various media URLs
 * to test our media validation and repair tools.
 */

const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Test collection name
const TEST_COLLECTION = 'test_media_validation';

// Array of test cases with different media URLs
const TEST_CASES = [
  // Valid external images
  {
    id: 'valid-external-image-1',
    name: 'Valid External Image 1',
    description: 'An image from a reliable external source',
    media: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1575224300306-1b8da36134ec?q=80&w=2940'
    }
  },
  {
    id: 'valid-external-image-2',
    name: 'Valid External Image 2',
    description: 'Another image from a reliable external source',
    media: {
      type: 'image',
      url: 'https://images.pexels.com/photos/163236/luxury-yacht-boat-speed-water-163236.jpeg?auto=compress&cs=tinysrgb'
    }
  },
  
  // Valid external videos
  {
    id: 'valid-external-video-1',
    name: 'Valid External Video 1',
    description: 'A video from a reliable external source',
    media: {
      type: 'video',
      url: 'https://player.vimeo.com/external/371833458.sd.mp4?s=dcc3bdec5c3726d70711f84a7cc0ae2b9a4b31b8&profile_id=139&oauth2_token_id=57447761'
    }
  },
  
  // Broken external URLs
  {
    id: 'broken-image-url',
    name: 'Broken Image URL',
    description: 'An image URL that 404s',
    media: {
      type: 'image',
      url: 'https://example.com/non-existent-image.jpg'
    }
  },
  {
    id: 'broken-video-url',
    name: 'Broken Video URL',
    description: 'A video URL that 404s',
    media: {
      type: 'video',
      url: 'https://example.com/non-existent-video.mp4'
    }
  },
  
  // Content type mismatches
  {
    id: 'content-mismatch-1',
    name: 'Content Type Mismatch 1',
    description: 'URL is for an image but type is set to video',
    media: {
      type: 'video', // Should be image
      url: 'https://images.unsplash.com/photo-1566935200184-0fe9747de7f8?q=80&w=2940'
    }
  },
  {
    id: 'content-mismatch-2',
    name: 'Content Type Mismatch 2',
    description: 'URL is for a video but type is set to image',
    media: {
      type: 'image', // Should be video
      url: 'https://player.vimeo.com/external/363625327.sd.mp4?s=31ceffc45621c36add51542024cf0d1956c6fe47&profile_id=139&oauth2_token_id=57447761'
    }
  },
  
  // Blob URLs
  {
    id: 'blob-url-1',
    name: 'Blob URL 1',
    description: 'A blob URL that should be replaced',
    media: {
      type: 'image',
      url: 'blob:https://etoile-yachts.replit.app/550e8400-e29b-41d4-a716-446655440000'
    }
  },
  {
    id: 'blob-url-2',
    name: 'Blob URL 2',
    description: 'Another blob URL that should be replaced',
    media: {
      type: 'video',
      url: 'blob:https://etoile-yachts.replit.app/b10b42b3-ad26-4b91-8431-98a41c57aabd'
    }
  },
  
  // Relative URLs
  {
    id: 'relative-url-1',
    name: 'Relative URL 1',
    description: 'A relative URL that should be fixed',
    media: {
      type: 'image',
      url: '/images/yachts/yacht-1.jpg'
    }
  },
  {
    id: 'relative-url-2',
    name: 'Relative URL 2',
    description: 'Another relative URL that should be fixed',
    media: {
      type: 'video',
      url: '/videos/tours/yacht-tour-1.mp4'
    }
  },
  
  // Multiple media fields
  {
    id: 'multiple-media-1',
    name: 'Multiple Media 1',
    description: 'Document with multiple media fields in different formats',
    thumbnail: {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1599772310251-ff3bf39f085d?q=80&w=2787'
    },
    media: [
      {
        type: 'image',
        url: 'blob:https://etoile-yachts.replit.app/c45b-465e-abd0-1bf1a522988f'
      },
      {
        type: 'video',
        url: '/videos/tours/yacht-tour-2.mp4'
      },
      {
        type: 'image',
        url: 'https://example.com/non-existent-image-2.jpg'
      }
    ]
  },
  
  // Google Drive direct links
  {
    id: 'google-drive-image',
    name: 'Google Drive Image',
    description: 'Image hosted on Google Drive',
    media: {
      type: 'image',
      url: 'https://drive.google.com/uc?export=view&id=1YHO6FiRa8OECmFtqY1wqsUxj5yigQAVv'
    }
  },
  {
    id: 'google-drive-video',
    name: 'Google Drive Video',
    description: 'Video hosted on Google Drive',
    media: {
      type: 'video',
      url: 'https://drive.google.com/uc?export=view&id=1tShh9ZFRfgGOnApK7ryD6itbAn85yEqj'
    }
  }
];

/**
 * Create test collection with various media URLs
 */
async function createTestCollection() {
  try {
    console.log(`Creating test collection: ${TEST_COLLECTION}...`);
    
    // Delete existing documents in the collection
    const existingDocs = await db.collection(TEST_COLLECTION).get();
    const batch = db.batch();
    
    existingDocs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    if (existingDocs.size > 0) {
      await batch.commit();
      console.log(`Deleted ${existingDocs.size} existing documents`);
    }
    
    // Create new test documents
    const writeBatch = db.batch();
    
    TEST_CASES.forEach(testCase => {
      const docRef = db.collection(TEST_COLLECTION).doc(testCase.id);
      writeBatch.set(docRef, {
        ...testCase,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    });
    
    await writeBatch.commit();
    
    console.log(`Created ${TEST_CASES.length} test documents in ${TEST_COLLECTION}`);
    
    return {
      collectionName: TEST_COLLECTION,
      documentCount: TEST_CASES.length
    };
  } catch (error) {
    console.error('Error creating test collection:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const result = await createTestCollection();
    console.log(`Test collection setup complete: ${result.documentCount} documents in ${result.collectionName}`);
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  createTestCollection,
  TEST_COLLECTION
};