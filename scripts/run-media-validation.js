/**
 * Media Validation Test Runner
 * 
 * This script runs a comprehensive media validation test suite
 * to verify that our validation, repair, and blob URL resolution
 * functionality works correctly.
 * 
 * Usage: node scripts/run-media-validation.js
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { 
  validateAllMedia, 
  createValidationReport, 
  repairMediaFromReport,
  createRepairReport,
  DEFAULT_COLLECTIONS,
  MEDIA_TYPES 
} from './media-validation-service.js';
import { resolveBlobUrlsInCollections } from './blob-url-resolver.mjs';

// Initialize Firebase Admin SDK
function initializeFirebaseAdmin() {
  try {
    // Initialize Firebase Admin with service account
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT 
      ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
      : require('../firebase-data-connect.json');
    
    if (!serviceAccount) {
      throw new Error('Firebase service account not found');
    }
    
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    console.log('Firebase Admin SDK initialized successfully');
    return app;
  } catch (error) {
    console.error('Failed to initialize Firebase Admin SDK:', error);
    throw error;
  }
}

// Create test data for validation
async function createTestData(firestore) {
  console.log('Creating test data for validation...');
  
  // Create a test collection
  const testCollection = 'media_validation_test';
  
  // Sample data for testing
  const testDocuments = [
    {
      id: 'valid-image',
      data: {
        title: 'Valid Image Test',
        description: 'This document contains a valid image URL',
        imageUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/yacht-placeholder.jpg',
        media: [
          { 
            type: 'image', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/yacht-placeholder.jpg' 
          }
        ]
      }
    },
    {
      id: 'valid-video',
      data: {
        title: 'Valid Video Test',
        description: 'This document contains a valid video URL',
        videoUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4',
        media: [
          { 
            type: 'video', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4' 
          }
        ]
      }
    },
    {
      id: 'blob-url',
      data: {
        title: 'Blob URL Test',
        description: 'This document contains a blob URL',
        imageUrl: 'blob:https://etoile-yachts.replit.app/test-blob-url',
        media: [
          { 
            type: 'image', 
            url: 'blob:https://etoile-yachts.replit.app/another-test-blob-url' 
          }
        ]
      }
    },
    {
      id: 'relative-url',
      data: {
        title: 'Relative URL Test',
        description: 'This document contains a relative URL',
        imageUrl: '/assets/images/yacht-placeholder.jpg',
        media: [
          { 
            type: 'image', 
            url: '/assets/images/profile-placeholder.jpg' 
          }
        ]
      }
    },
    {
      id: 'missing-url',
      data: {
        title: 'Missing URL Test',
        description: 'This document contains a URL that does not exist',
        imageUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/nonexistent-image.jpg',
        media: [
          { 
            type: 'image', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/another-nonexistent-image.jpg' 
          }
        ]
      }
    },
    {
      id: 'type-mismatch',
      data: {
        title: 'Type Mismatch Test',
        description: 'This document contains media with mismatched types',
        imageUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4',
        media: [
          { 
            type: 'image', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/video-placeholder.mp4' 
          },
          { 
            type: 'video', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/placeholders/yacht-placeholder.jpg' 
          }
        ]
      }
    },
    {
      id: 'mixed-issues',
      data: {
        title: 'Mixed Issues Test',
        description: 'This document contains multiple issues',
        imageUrl: 'blob:https://etoile-yachts.replit.app/mixed-blob-url',
        videoUrl: '/assets/videos/video-placeholder.mp4',
        media: [
          { 
            type: 'image', 
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/nonexistent-image.jpg' 
          },
          { 
            type: 'video', 
            url: 'blob:https://etoile-yachts.replit.app/mixed-video-blob-url' 
          },
          { 
            type: 'image', 
            url: '/assets/images/another-placeholder.jpg' 
          }
        ]
      }
    }
  ];
  
  // Create the test documents
  for (const doc of testDocuments) {
    await firestore.collection(testCollection).doc(doc.id).set(doc.data);
    console.log(`Created test document: ${testCollection}/${doc.id}`);
  }
  
  console.log(`Created ${testDocuments.length} test documents in collection: ${testCollection}`);
  return testCollection;
}

// Run media validation test
async function runMediaValidationTest() {
  console.log('\n===== MEDIA VALIDATION TEST =====\n');
  
  try {
    // Initialize Firebase Admin SDK
    const app = initializeFirebaseAdmin();
    const firestore = getFirestore(app);
    
    // Create test data
    const testCollection = await createTestData(firestore);
    
    // Step 1: Run validation
    console.log('\n==== Step 1: Running Media Validation ====\n');
    const validationResults = await validateAllMedia(firestore, [testCollection]);
    
    console.log('Validation Results:');
    console.log(`- Success: ${validationResults.success}`);
    console.log(`- Total Documents: ${validationResults.stats.totalDocuments}`);
    console.log(`- Total URLs: ${validationResults.stats.totalUrls}`);
    console.log(`- Valid URLs: ${validationResults.stats.validUrls}`);
    console.log(`- Invalid URLs: ${validationResults.stats.invalidUrls}`);
    console.log(`- Missing URLs: ${validationResults.stats.missingUrls}`);
    console.log(`- Bad Content Types: ${validationResults.stats.badContentTypes}`);
    
    console.log('\nImage Stats:');
    console.log(`- Total: ${validationResults.stats.imageStats.total}`);
    console.log(`- Valid: ${validationResults.stats.imageStats.valid}`);
    console.log(`- Invalid: ${validationResults.stats.imageStats.invalid}`);
    
    console.log('\nVideo Stats:');
    console.log(`- Total: ${validationResults.stats.videoStats.total}`);
    console.log(`- Valid: ${validationResults.stats.videoStats.valid}`);
    console.log(`- Invalid: ${validationResults.stats.videoStats.invalid}`);
    
    console.log('\nInvalid URLs:');
    validationResults.invalid.forEach((item, index) => {
      console.log(`${index + 1}. ${item.collectionId}/${item.docId}: ${item.field}`);
      console.log(`   URL: ${item.url}`);
      console.log(`   Reason: ${item.reason}`);
      console.log(`   Error: ${item.error}`);
    });
    
    // Save validation results
    const validationReportId = await createValidationReport(firestore, validationResults);
    console.log(`\nValidation report saved with ID: ${validationReportId}`);
    
    // Step 2: Run repair
    console.log('\n==== Step 2: Running Media Repair ====\n');
    const repairResults = await repairMediaFromReport(firestore, validationReportId);
    
    console.log('Repair Results:');
    console.log(`- Success: ${repairResults.success}`);
    console.log(`- Documents Scanned: ${repairResults.stats.documentsScanned}`);
    console.log(`- Documents Repaired: ${repairResults.stats.documentsRepaired}`);
    console.log(`- URLs Repaired: ${repairResults.stats.urlsRepaired}`);
    console.log(`- URLs Skipped: ${repairResults.stats.urlsSkipped}`);
    console.log(`- Errors: ${repairResults.stats.errors}`);
    
    // Save repair results
    const repairReportId = await createRepairReport(firestore, repairResults);
    console.log(`\nRepair report saved with ID: ${repairReportId}`);
    
    // Step 3: Resolve blob URLs
    console.log('\n==== Step 3: Resolving Blob URLs ====\n');
    const blobResults = await resolveBlobUrlsInCollections(firestore, [testCollection]);
    
    console.log('Blob URL Resolution Results:');
    console.log(`- Success: ${blobResults.success}`);
    console.log(`- Total Processed: ${blobResults.stats.totalProcessed}`);
    console.log(`- Total Updated: ${blobResults.stats.totalUpdated}`);
    console.log(`- Total Skipped: ${blobResults.stats.totalSkipped}`);
    console.log(`- Total Errors: ${blobResults.stats.totalErrors}`);
    console.log(`- Total Resolved URLs: ${blobResults.stats.totalResolved}`);
    
    // Step 4: Run validation again to verify fixes
    console.log('\n==== Step 4: Verifying Fixes ====\n');
    const verificationResults = await validateAllMedia(firestore, [testCollection]);
    
    console.log('Verification Results:');
    console.log(`- Success: ${verificationResults.success}`);
    console.log(`- Total Documents: ${verificationResults.stats.totalDocuments}`);
    console.log(`- Total URLs: ${verificationResults.stats.totalUrls}`);
    console.log(`- Valid URLs: ${verificationResults.stats.validUrls}`);
    console.log(`- Invalid URLs: ${verificationResults.stats.invalidUrls}`);
    
    // Calculate improvement
    const initialInvalidCount = validationResults.stats.invalidUrls;
    const finalInvalidCount = verificationResults.stats.invalidUrls;
    const improvement = initialInvalidCount - finalInvalidCount;
    const improvementPercentage = (improvement / initialInvalidCount) * 100;
    
    console.log('\nImprovement:');
    console.log(`- Initial Invalid URLs: ${initialInvalidCount}`);
    console.log(`- Final Invalid URLs: ${finalInvalidCount}`);
    console.log(`- URLs Fixed: ${improvement}`);
    console.log(`- Improvement: ${improvementPercentage.toFixed(2)}%`);
    
    // Save overall test results
    const testResults = {
      timestamp: new Date(),
      type: 'media-validation-test',
      success: true,
      steps: {
        validation: {
          reportId: validationReportId,
          stats: validationResults.stats
        },
        repair: {
          reportId: repairReportId,
          stats: repairResults.stats
        },
        blobResolution: {
          stats: blobResults.stats
        },
        verification: {
          stats: verificationResults.stats
        }
      },
      improvement: {
        initialInvalidCount,
        finalInvalidCount,
        urlsFixed: improvement,
        improvementPercentage
      }
    };
    
    const testReportRef = await firestore.collection('validation_reports').add(testResults);
    console.log(`\nTest results saved with ID: ${testReportRef.id}`);
    
    console.log('\n===== TEST COMPLETED SUCCESSFULLY =====\n');
    return {
      success: true,
      reportId: testReportRef.id
    };
  } catch (error) {
    console.error('Error running media validation test:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Run the test
runMediaValidationTest().then(result => {
  console.log(`Test ${result.success ? 'succeeded' : 'failed'}`);
  process.exit(result.success ? 0 : 1);
}).catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});