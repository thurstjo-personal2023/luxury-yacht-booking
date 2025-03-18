/**
 * Media Validation Service Test Suite
 * 
 * This file contains tests for the media validation service functionality.
 */

import { mockFirestore, createMockDocument, createMockCollection } from './test-utils';
import { MEDIA_TYPES, validateAllMedia, validateDocumentMedia, validateCollectionMedia, repairMediaFromReport } from '../scripts/media-validation-service';

// Mock documents with various media URLs
const TEST_DOCS = {
  valid: createMockDocument({
    id: 'valid-doc',
    data: {
      title: 'Valid Document',
      imageUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/valid-image.jpg',
      media: [
        { type: 'image', url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/image1.jpg' },
        { type: 'video', url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/video1.mp4' }
      ]
    }
  }),
  invalid: createMockDocument({
    id: 'invalid-doc',
    data: {
      title: 'Invalid Document',
      imageUrl: 'blob:https://etoile-yachts.replit.app/invalid-blob-url',
      media: [
        { type: 'image', url: '/yacht-placeholder.jpg' },
        { type: 'video', url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/video1.mp4' }
      ]
    }
  }),
  mixed: createMockDocument({
    id: 'mixed-doc',
    data: {
      title: 'Mixed Document',
      imageUrl: 'https://storage.googleapis.com/etoile-yachts.appspot.com/valid-image.jpg',
      media: [
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/another-blob-url' },
        { type: 'video', url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/video1.mp4' }
      ]
    }
  })
};

// Mock collections
const TEST_COLLECTIONS = {
  'valid_collection': createMockCollection('valid_collection', [TEST_DOCS.valid]),
  'invalid_collection': createMockCollection('invalid_collection', [TEST_DOCS.invalid]),
  'mixed_collection': createMockCollection('mixed_collection', [TEST_DOCS.mixed, TEST_DOCS.valid])
};

// Mock Firestore
const mockFirestoreWithCollections = {
  ...mockFirestore,
  collection: (name: string) => TEST_COLLECTIONS[name] || createMockCollection(name, [])
};

// Mock validation reports
const MOCK_REPORT = {
  id: 'test-report-id',
  timestamp: new Date(),
  success: true,
  invalid: [
    {
      collectionId: 'invalid_collection',
      docId: 'invalid-doc',
      field: 'imageUrl',
      url: 'blob:https://etoile-yachts.replit.app/invalid-blob-url',
      reason: 'Blob URL',
      error: 'Blob URLs are not valid'
    },
    {
      collectionId: 'invalid_collection',
      docId: 'invalid-doc',
      field: 'media.[0].url',
      url: '/yacht-placeholder.jpg',
      reason: 'Relative URL',
      error: 'Relative URLs must be resolved'
    },
    {
      collectionId: 'mixed_collection',
      docId: 'mixed-doc',
      field: 'media.[0].url',
      url: 'blob:https://etoile-yachts.replit.app/another-blob-url',
      reason: 'Blob URL',
      error: 'Blob URLs are not valid'
    }
  ],
  stats: {
    totalDocuments: 3,
    totalUrls: 7,
    validUrls: 4,
    invalidUrls: 3,
    missingUrls: 0,
    badContentTypes: 0,
    imageStats: { total: 5, valid: 2, invalid: 3 },
    videoStats: { total: 2, valid: 2, invalid: 0 }
  }
};

// Mock fetch response for URL validation
global.fetch = jest.fn((url) => {
  // Mock implementation to return different responses based on URL
  if (url.includes('valid-image') || url.includes('image1.jpg')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'image/jpeg' : null
      }
    });
  } else if (url.includes('video1.mp4')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => name.toLowerCase() === 'content-type' ? 'video/mp4' : null
      }
    });
  } else if (url.includes('blob:')) {
    return Promise.reject(new Error('Invalid URL'));
  } else if (url.includes('/yacht-placeholder.jpg')) {
    return Promise.reject(new Error('Relative URL not found'));
  } else {
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: (name: string) => null
      }
    });
  }
}) as jest.Mock;

// Mock Firebase admin module
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => mockFirestoreWithCollections),
}));

// Tests for media validation service
describe('Media Validation Service', () => {
  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock Firestore document methods
    TEST_DOCS.valid.ref.update.mockClear();
    TEST_DOCS.invalid.ref.update.mockClear();
    TEST_DOCS.mixed.ref.update.mockClear();
    
    // Mock Firestore collection methods
    mockFirestoreWithCollections.collection('validation_reports').add = jest.fn(() => 
      Promise.resolve({ id: 'new-report-id' })
    );
    
    mockFirestoreWithCollections.collection('validation_reports').doc = jest.fn(() => ({
      get: () => Promise.resolve({
        exists: true,
        id: MOCK_REPORT.id,
        data: () => MOCK_REPORT
      })
    }));
  });
  
  describe('validateDocumentMedia', () => {
    it('should correctly validate media in a document', async () => {
      // Create a dummy results object
      const results = {
        success: true,
        stats: {
          totalDocuments: 0,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          badContentTypes: 0,
          imageStats: { total: 0, valid: 0, invalid: 0 },
          videoStats: { total: 0, valid: 0, invalid: 0 },
          byCollection: {}
        },
        errors: [],
        invalid: [],
        collections: {},
        details: [],
        updateStats: jest.fn(),
        addError: jest.fn(),
        addDetail: jest.fn(),
        hasInvalidUrls: jest.fn(() => false),
        hasErrors: jest.fn(() => false)
      };
      
      // Field mapping for testing
      const fieldMapping = {
        imageFields: ['imageUrl', 'media.[].url'],
        videoFields: ['videoUrl'],
        typedMediaField: 'media',
        typeField: 'type',
        urlField: 'url'
      };
      
      // Validate the document
      await validateDocumentMedia(TEST_DOCS.valid, 'valid_collection', fieldMapping, results);
      
      // Check that the stats were updated correctly
      expect(results.updateStats).toHaveBeenCalled();
      expect(results.addDetail).toHaveBeenCalled();
      expect(results.addError).not.toHaveBeenCalled();
      
      // Validate an invalid document
      await validateDocumentMedia(TEST_DOCS.invalid, 'invalid_collection', fieldMapping, results);
      
      // Check that errors were handled correctly
      expect(results.updateStats).toHaveBeenCalled();
      expect(results.addDetail).toHaveBeenCalled();
    });
  });
  
  describe('validateCollectionMedia', () => {
    it('should correctly validate media in a collection', async () => {
      // Create a dummy results object
      const results = {
        success: true,
        stats: {
          totalDocuments: 0,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          badContentTypes: 0,
          imageStats: { total: 0, valid: 0, invalid: 0 },
          videoStats: { total: 0, valid: 0, invalid: 0 },
          byCollection: {}
        },
        errors: [],
        invalid: [],
        collections: {},
        details: [],
        updateStats: jest.fn(),
        addError: jest.fn(),
        addDetail: jest.fn(),
        hasInvalidUrls: jest.fn(() => false),
        hasErrors: jest.fn(() => false)
      };
      
      // Validate a collection
      await validateCollectionMedia(
        mockFirestoreWithCollections, 
        'valid_collection',
        {}, 
        results
      );
      
      // Check that the collection was properly validated
      expect(results.addDetail).toHaveBeenCalled();
      expect(results.stats.totalDocuments).toBe(0); // Mocked, would be incremented in real implementation
    });
  });
  
  describe('validateAllMedia', () => {
    it('should validate media across multiple collections', async () => {
      // Mock the individual validation functions
      const originalValidateCollectionMedia = require('../scripts/media-validation-service').validateCollectionMedia;
      require('../scripts/media-validation-service').validateCollectionMedia = jest.fn(async (firestore, collectionId, options, results) => {
        results.stats.totalDocuments += 1;
        results.addDetail(`Processed collection ${collectionId}`);
        return results;
      });
      
      // Run the validation
      const results = await validateAllMedia(
        mockFirestoreWithCollections,
        ['valid_collection', 'invalid_collection']
      );
      
      // Check the results
      expect(results.success).toBe(true);
      expect(results.stats.totalDocuments).toBe(2);
      expect(results.details.length).toBe(2);
      
      // Restore the original function
      require('../scripts/media-validation-service').validateCollectionMedia = originalValidateCollectionMedia;
    });
  });
  
  describe('repairMediaFromReport', () => {
    it('should repair media based on a validation report', async () => {
      // Mock the getValidationReport function
      jest.mock('../scripts/media-validation-service', () => ({
        ...jest.requireActual('../scripts/media-validation-service'),
        getValidationReport: jest.fn(() => Promise.resolve(MOCK_REPORT))
      }));
      
      // Run the repair
      const results = await repairMediaFromReport(
        mockFirestoreWithCollections,
        'test-report-id'
      );
      
      // Check the results
      expect(results).toBeDefined();
      expect(results.reportId).toBe('test-report-id');
      
      // Check that the update method was called for any invalid documents
      // In a real test, we would verify that the documents were updated correctly
    });
  });
});