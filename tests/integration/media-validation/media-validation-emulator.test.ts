/**
 * Media Validation Emulator Integration Tests
 * 
 * These tests verify the media validation system against Firebase emulators.
 * They test the interaction between the media validation services and
 * Firestore using real Firebase emulator instances.
 */

import * as admin from 'firebase-admin';
import { getFirestore, connectFirestoreEmulator, Firestore } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, Auth } from 'firebase/auth';
import { initializeApp } from 'firebase/app';
import { MediaType } from '../../../core/domain/media/media-type';
import { ValidationResult } from '../../../core/domain/validation/validation-result';
import { DocumentValidationResult } from '../../../core/domain/validation/document-validation-result';
import { FirebaseMediaRepository } from '../../../adapters/repositories/firebase/firebase-media-repository';
import { MediaValidationService } from '../../../core/application/media/media-validation-service';
import { EMULATOR_HOST, EMULATOR_PORTS } from '../../emulator-setup';

describe('Media Validation Integration with Firebase Emulators', () => {
  let firestore: Firestore;
  let auth: Auth;
  let adminFirestore: admin.firestore.Firestore;
  let repository: FirebaseMediaRepository;
  let service: MediaValidationService;
  let testCollectionName: string;
  let testDocumentId: string;
  
  beforeAll(async () => {
    // Initialize Firebase app for client SDK
    const app = initializeApp({
      projectId: 'etoile-yachts-test',
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
    });
    
    // Connect to emulators
    firestore = getFirestore(app);
    connectFirestoreEmulator(firestore, EMULATOR_HOST, EMULATOR_PORTS.firestore);
    
    auth = getAuth(app);
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:${EMULATOR_PORTS.auth}`);
    
    // Get admin firestore instance
    adminFirestore = admin.firestore();
    
    // Initialize repository and service
    repository = new FirebaseMediaRepository(firestore, {
      validationReportsCollection: 'validation_reports_test',
      repairReportsCollection: 'repair_reports_test',
      fetchTimeout: 2000
    });
    
    service = new MediaValidationService(repository, {
      batchSize: 10,
      maxDocumentsPerCollection: 100
    });
    
    // Generate unique collection and document names for testing
    const timestamp = Date.now();
    testCollectionName = `test_media_collection_${timestamp}`;
    testDocumentId = `test_doc_${timestamp}`;
  });
  
  beforeEach(async () => {
    // Clear any previous test data
    try {
      const snapshot = await adminFirestore.collection(testCollectionName).get();
      const batch = adminFirestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      // Also clear validation reports
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      const reportsBatch = adminFirestore.batch();
      reportsSnapshot.docs.forEach(doc => reportsBatch.delete(doc.ref));
      await reportsBatch.commit();
    } catch (error) {
      // Ignore errors if collections don't exist
    }
  });
  
  afterAll(async () => {
    // Clean up any remaining test data
    try {
      const snapshot = await adminFirestore.collection(testCollectionName).get();
      const batch = adminFirestore.batch();
      snapshot.docs.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      
      const reportsSnapshot = await adminFirestore.collection('validation_reports_test').get();
      const reportsBatch = adminFirestore.batch();
      reportsSnapshot.docs.forEach(doc => reportsBatch.delete(doc.ref));
      await reportsBatch.commit();
    } catch (error) {
      // Ignore errors if collections don't exist
    }
  });
  
  describe('Repository integration tests', () => {
    it('should validate a document in Firestore', async () => {
      // Create a test document with various media fields
      await adminFirestore.collection(testCollectionName).doc(testDocumentId).set({
        title: 'Test Document',
        coverImage: 'https://example.com/image.jpg',
        gallery: [
          { url: 'https://example.com/gallery1.jpg' },
          { url: 'https://example.com/gallery2.jpg' }
        ],
        media: [
          { type: 'image', url: 'https://example.com/media1.jpg' },
          { type: 'video', url: 'https://example.com/video.mp4' }
        ],
        logo: '/logo.png' // Relative URL that should be detected as invalid
      });
      
      // Override the validateUrl method for testing purposes
      // In a real environment, we would set up an HTTP mock server
      repository.validateUrl = jest.fn().mockImplementation((url, expectedType) => {
        if (url.startsWith('/')) {
          return Promise.resolve(ValidationResult.createInvalid(url, 'Invalid URL'));
        }
        
        if (url.includes('video') && expectedType === MediaType.IMAGE) {
          return Promise.resolve(ValidationResult.createInvalid(
            url, 
            'Expected image, got video', 
            200, 
            'OK',
            'video/mp4'
          ));
        }
        
        return Promise.resolve(ValidationResult.createValid(
          url, 
          url.includes('video') ? 'video/mp4' : 'image/jpeg',
          200,
          'OK'
        ));
      });
      
      // Validate the test document
      const result = await repository.validateDocument(testCollectionName, testDocumentId);
      
      // Verify validation results
      expect(result).toBeInstanceOf(DocumentValidationResult);
      expect(result.getCollection()).toBe(testCollectionName);
      expect(result.getDocumentId()).toBe(testDocumentId);
      expect(result.getTotalUrls()).toBe(6); // 5 URLs + 1 relative path
      expect(result.getValidUrls()).toBe(4); // 4 valid image URLs
      expect(result.getInvalidUrls()).toBe(2); // 1 invalid video URL and 1 relative URL
      
      // Check that validateUrl was called correct number of times
      expect(repository.validateUrl).toHaveBeenCalledTimes(6);
      
      // Check for specific field validations
      const fields = result.getFields();
      expect(fields.get('coverImage')?.getIsValid()).toBe(true);
      expect(fields.get('gallery.0.url')?.getIsValid()).toBe(true);
      expect(fields.get('gallery.1.url')?.getIsValid()).toBe(true);
      expect(fields.get('media.0.url')?.getIsValid()).toBe(true);
      
      // Video URL should be invalid when expected type is image
      expect(fields.get('media.1.url')?.getIsValid()).toBe(false);
      expect(fields.get('media.1.url')?.getContentType()).toBe('video/mp4');
      expect(fields.get('media.1.url')?.getError()).toContain('Expected image, got video');
      
      // Relative URL should be invalid
      expect(fields.get('logo')?.getIsValid()).toBe(false);
      expect(fields.get('logo')?.getError()).toBe('Invalid URL');
    });
    
    it('should repair document URLs in Firestore', async () => {
      // Create a test document with invalid URLs
      await adminFirestore.collection(testCollectionName).doc(testDocumentId).set({
        title: 'Test Document',
        coverImage: '/invalid-cover.jpg', // Relative URL
        gallery: [
          { url: 'blob:https://example.com/12345' }, // Blob URL
          { url: 'https://example.com/gallery2.jpg' } // Valid URL
        ]
      });
      
      // Prepare field updates
      const fieldUpdates = {
        'coverImage': 'https://etoile-yachts.replit.app/images/cover-placeholder.jpg',
        'gallery.0.url': 'https://etoile-yachts.replit.app/images/gallery-placeholder.jpg'
      };
      
      // Repair the document
      const success = await repository.repairDocument(testCollectionName, testDocumentId, fieldUpdates);
      
      // Verify the updates were applied
      expect(success).toBe(true);
      
      // Retrieve the document directly to check changes
      const docRef = await adminFirestore.collection(testCollectionName).doc(testDocumentId).get();
      const data = docRef.data();
      
      expect(data?.coverImage).toBe('https://etoile-yachts.replit.app/images/cover-placeholder.jpg');
      expect(data?.gallery[0].url).toBe('https://etoile-yachts.replit.app/images/gallery-placeholder.jpg');
      expect(data?.gallery[1].url).toBe('https://example.com/gallery2.jpg'); // Unchanged
    });
    
    it('should save and retrieve validation reports', async () => {
      // Create a validation report
      const report = {
        id: `test-report-${Date.now()}`,
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 5,
        totalFields: 10,
        validUrls: 8,
        invalidUrls: 2,
        missingUrls: 0,
        collectionSummaries: [
          {
            collection: testCollectionName,
            totalUrls: 10,
            validUrls: 8,
            invalidUrls: 2,
            missingUrls: 0,
            validPercent: 80,
            invalidPercent: 20,
            missingPercent: 0
          }
        ],
        invalidResults: [
          {
            field: 'coverImage',
            url: '/relative-cover.jpg',
            isValid: false,
            error: 'Invalid URL',
            collection: testCollectionName,
            documentId: testDocumentId
          },
          {
            field: 'media.0.url',
            url: 'https://example.com/video.mp4',
            isValid: false,
            status: 200,
            statusText: 'OK',
            error: 'Expected image, got video',
            collection: testCollectionName,
            documentId: testDocumentId
          }
        ]
      };
      
      // Save the report
      await repository.saveValidationReport(report);
      
      // Retrieve the report
      const retrievedReport = await repository.getValidationReport(report.id);
      
      // Verify the retrieved report
      expect(retrievedReport).not.toBeNull();
      expect(retrievedReport?.id).toBe(report.id);
      expect(retrievedReport?.totalDocuments).toBe(report.totalDocuments);
      expect(retrievedReport?.validUrls).toBe(report.validUrls);
      expect(retrievedReport?.invalidUrls).toBe(report.invalidUrls);
      expect(retrievedReport?.collectionSummaries).toHaveLength(1);
      expect(retrievedReport?.invalidResults).toHaveLength(2);
    });
  });
  
  describe('Service integration tests', () => {
    it('should validate documents across collections', async () => {
      // Create multiple test documents across collections
      const collections = ['test_collection_1', 'test_collection_2'];
      const docsPerCollection = 3;
      
      for (const collection of collections) {
        for (let i = 0; i < docsPerCollection; i++) {
          await adminFirestore.collection(collection).doc(`doc-${i}`).set({
            title: `Test Document ${i}`,
            coverImage: i % 2 === 0 ? 'https://example.com/valid.jpg' : '/invalid.jpg',
            description: `Document in ${collection}`
          });
        }
      }
      
      // Override the validateUrl method for testing
      repository.validateUrl = jest.fn().mockImplementation((url) => {
        if (url.startsWith('/')) {
          return Promise.resolve(ValidationResult.createInvalid(url, 'Invalid URL'));
        }
        return Promise.resolve(ValidationResult.createValid(url, 'image/jpeg', 200, 'OK'));
      });
      
      // Run validation across collections
      const report = await service.validateAllCollections();
      
      // Verify the report
      expect(report.totalDocuments).toBe(collections.length * docsPerCollection);
      expect(report.totalFields).toBe(collections.length * docsPerCollection); // 1 image field per doc
      expect(report.validUrls).toBe(collections.length * (docsPerCollection / 2)); // Half the URLs are valid
      expect(report.invalidUrls).toBe(collections.length * (docsPerCollection / 2)); // Half the URLs are invalid
      
      // Check that the report was saved to Firestore
      expect(repository.saveValidationReport).toHaveBeenCalled();
      
      // Verify collection summaries
      expect(report.collectionSummaries).toHaveLength(collections.length);
      for (const collection of collections) {
        const summary = report.getCollectionSummary(collection);
        expect(summary).toBeDefined();
        expect(summary?.totalUrls).toBe(docsPerCollection);
        expect(summary?.validUrls).toBe(docsPerCollection / 2);
        expect(summary?.invalidUrls).toBe(docsPerCollection / 2);
      }
      
      // Verify invalid results
      const invalidResults = report.invalidResults;
      expect(invalidResults).toHaveLength(collections.length * (docsPerCollection / 2));
      for (const result of invalidResults) {
        expect(result.url).toBe('/invalid.jpg');
        expect(result.isValid).toBe(false);
        expect(result.error).toBe('Invalid URL');
      }
    });
    
    it('should repair invalid URLs based on a validation report', async () => {
      // Create a test document with invalid URLs
      await adminFirestore.collection(testCollectionName).doc(testDocumentId).set({
        title: 'Test Document',
        coverImage: '/invalid-cover.jpg', // Relative URL
        media: [
          { url: 'blob:https://example.com/12345' }, // Blob URL
          { url: 'https://example.com/video.mp4', type: 'video' } // Media type mismatch
        ]
      });
      
      // Create and save a mock validation report
      const reportId = `repair-test-report-${Date.now()}`;
      const report = {
        id: reportId,
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 1,
        totalFields: 3,
        validUrls: 0,
        invalidUrls: 3,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: [
          {
            field: 'coverImage',
            url: '/invalid-cover.jpg',
            isValid: false,
            error: 'Invalid URL',
            collection: testCollectionName,
            documentId: testDocumentId
          },
          {
            field: 'media.0.url',
            url: 'blob:https://example.com/12345',
            isValid: false,
            error: 'Blob URL not allowed',
            collection: testCollectionName,
            documentId: testDocumentId
          },
          {
            field: 'media.1.url',
            url: 'https://example.com/video.mp4',
            isValid: false,
            status: 200,
            statusText: 'OK',
            contentType: 'video/mp4',
            error: 'Expected image, got video',
            collection: testCollectionName,
            documentId: testDocumentId
          }
        ]
      };
      
      await repository.saveValidationReport(report);
      
      // Mock the expected behavior for repairDocument
      repository.repairDocument = jest.fn().mockResolvedValue(true);
      
      // Run repair based on the report
      const repairReport = await service.repairInvalidMediaUrls(reportId);
      
      // Verify the repair was attempted
      expect(repository.repairDocument).toHaveBeenCalledTimes(1);
      expect(repository.repairDocument).toHaveBeenCalledWith(
        testCollectionName,
        testDocumentId,
        expect.any(Object) // Field updates
      );
      
      // Verify the repair report details
      expect(repairReport.reportId).toBe(reportId);
      expect(repairReport.totalDocumentsRepaired).toBe(1);
      expect(repairReport.totalFieldsRepaired).toBe(3);
      expect(repairReport.repairResults).toHaveLength(1); // 1 document
      
      // Verify repair types
      const docRepair = repairReport.repairResults[0];
      expect(docRepair.fields).toHaveLength(3); // 3 fields repaired
      
      const coverImageRepair = docRepair.fields.find(f => f.path === 'coverImage');
      expect(coverImageRepair?.repairType).toBe('RELATIVE_URL_FIX');
      
      const blobUrlRepair = docRepair.fields.find(f => f.path === 'media.0.url');
      expect(blobUrlRepair?.repairType).toBe('BLOB_URL_RESOLVE');
      
      const videoUrlRepair = docRepair.fields.find(f => f.path === 'media.1.url');
      expect(videoUrlRepair?.repairType).toBe('MEDIA_TYPE_CORRECTION');
    });
  });
});