/**
 * Media Validation Test Suite
 * 
 * This file contains tests for the media validation service functionality.
 */
import { MediaValidationService, ValidationReport, UrlFixReport } from '../functions/media-validation/media-validation';
import { validateURL, MEDIA_TYPES } from '../functions/media-validation/url-validator';
import * as admin from 'firebase-admin';

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  // Mock document
  class DocumentReference {
    id: string;
    path: string;
    
    constructor(id: string, path: string) {
      this.id = id;
      this.path = path;
    }
    
    collection(collectionPath: string) {
      return new CollectionReference(`${this.path}/${collectionPath}`);
    }
    
    get() {
      return Promise.resolve({
        exists: true,
        data: () => ({}),
        id: this.id
      });
    }
    
    set = jest.fn().mockResolvedValue({});
    update = jest.fn().mockResolvedValue({});
  }
  
  // Mock collection
  class CollectionReference {
    path: string;
    
    constructor(path: string) {
      this.path = path;
    }
    
    doc(docPath?: string) {
      const id = docPath || 'auto-id';
      return new DocumentReference(id, `${this.path}/${id}`);
    }
    
    limit = jest.fn().mockReturnThis();
    startAfter = jest.fn().mockReturnThis();
    
    get() {
      return Promise.resolve({
        empty: false,
        size: 2,
        docs: [
          {
            id: 'doc1',
            ref: new DocumentReference('doc1', `${this.path}/doc1`),
            data: () => ({
              media: [
                { url: 'https://example.com/image.jpg' },
                { url: '/relative/image.jpg' },
                { url: 'https://example.com/video.mp4' }
              ],
              imageUrl: 'https://example.com/cover.jpg',
              thumbnailUrl: '/thumbnail.jpg'
            }),
            exists: true
          },
          {
            id: 'doc2',
            ref: new DocumentReference('doc2', `${this.path}/doc2`),
            data: () => ({
              media: [
                { url: 'https://example.com/broken.jpg' },
                { url: 'blob:https://example.com/1234-5678' }
              ],
              profilePhoto: '/profiles/user.jpg'
            }),
            exists: true
          }
        ]
      });
    }
  }
  
  // Mock Firestore
  class Firestore {
    collection(collectionPath: string) {
      return new CollectionReference(collectionPath);
    }
    
    listCollections() {
      return Promise.resolve([
        { id: 'collection1' },
        { id: 'collection2' }
      ]);
    }
  }
  
  return {
    initializeApp: jest.fn(),
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn()
    },
    firestore: jest.fn(() => new Firestore())
  };
});

// Mock url-validator
jest.mock('../functions/media-validation/url-validator', () => {
  return {
    validateURL: jest.fn(),
    isAbsoluteURL: jest.fn((url: string) => url.startsWith('http')),
    fixRelativeURL: jest.fn((url: string, baseUrl: string, placeholder?: string) => {
      if (url.startsWith('http')) return url;
      return url.startsWith('/') ? `${baseUrl}${url.substring(1)}` : placeholder || `${baseUrl}${url}`;
    }),
    MEDIA_TYPES: {
      IMAGE: 'image',
      VIDEO: 'video',
      UNKNOWN: 'unknown'
    }
  };
});

describe('Media Validation Service', () => {
  let service: MediaValidationService;
  
  // Mock validation responses
  const mockValidationResponses: Record<string, any> = {
    'https://example.com/image.jpg': {
      url: 'https://example.com/image.jpg',
      isValid: true,
      isAbsolute: true,
      mediaType: MEDIA_TYPES.IMAGE,
      contentType: 'image/jpeg'
    },
    'https://example.com/video.mp4': {
      url: 'https://example.com/video.mp4',
      isValid: true,
      isAbsolute: true,
      mediaType: MEDIA_TYPES.VIDEO,
      contentType: 'video/mp4'
    },
    'https://example.com/broken.jpg': {
      url: 'https://example.com/broken.jpg',
      isValid: false,
      isAbsolute: true,
      mediaType: MEDIA_TYPES.IMAGE,
      error: 'Request failed with status: 404 Not Found',
      statusCode: 404
    },
    'blob:https://example.com/1234-5678': {
      url: 'blob:https://example.com/1234-5678',
      isValid: false,
      isAbsolute: true,
      mediaType: MEDIA_TYPES.UNKNOWN,
      error: 'Blob URLs are not persistent and cannot be validated'
    },
    'https://example.com/cover.jpg': {
      url: 'https://example.com/cover.jpg',
      isValid: true,
      isAbsolute: true,
      mediaType: MEDIA_TYPES.IMAGE,
      contentType: 'image/jpeg'
    }
  };
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new MediaValidationService({
      baseUrl: 'https://example.com/',
      placeholderImageUrl: 'https://example.com/placeholder.jpg',
      placeholderVideoUrl: 'https://example.com/placeholder.mp4'
    });
    
    // Mock validateURL implementation
    (validateURL as jest.Mock).mockImplementation((url: string) => {
      const response = mockValidationResponses[url];
      if (response) {
        return Promise.resolve(response);
      }
      
      // Default response for unknown URLs
      return Promise.resolve({
        url,
        isValid: url.startsWith('http'),
        isAbsolute: url.startsWith('http'),
        mediaType: url.endsWith('.mp4') ? MEDIA_TYPES.VIDEO : MEDIA_TYPES.IMAGE,
        contentType: url.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'
      });
    });
  });
  
  // Test cases
  describe('validateCollection', () => {
    it('should validate a collection', async () => {
      const report = await service.validateCollection('collection1');
      
      // Check report structure and counts
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.stats.documentCount).toBe(2);
      expect(report.stats.fieldCount).toBeGreaterThan(0);
      
      // Check invalid items
      expect(report.invalid.length).toBeGreaterThan(0);
      expect(report.invalid.some(item => item.url === 'https://example.com/broken.jpg')).toBe(true);
      expect(report.invalid.some(item => item.url === 'blob:https://example.com/1234-5678')).toBe(true);
      
      // Check relative items
      expect(report.relative.length).toBeGreaterThan(0);
      expect(report.relative.some(item => item.url === '/relative/image.jpg')).toBe(true);
      expect(report.relative.some(item => item.url === '/thumbnail.jpg')).toBe(true);
      
      // Check collection stats
      expect(report.stats.byCollection.collection1).toBeDefined();
      expect(report.stats.byCollection.collection1.documentCount).toBe(2);
    });
    
    it('should handle empty collections', async () => {
      // Mock empty collection
      (admin.firestore().collection('empty').get as jest.Mock).mockResolvedValueOnce({
        empty: true,
        size: 0,
        docs: []
      });
      
      const report = await service.validateCollection('empty');
      
      expect(report).toBeDefined();
      expect(report.stats.documentCount).toBe(0);
      expect(report.invalid.length).toBe(0);
      expect(report.relative.length).toBe(0);
    });
  });
  
  describe('validateAllCollections', () => {
    it('should validate all collections', async () => {
      const report = await service.validateAllCollections();
      
      // Check report structure and counts
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.stats.documentCount).toBe(4); // 2 documents in each of 2 collections
      expect(report.stats.byCollection.collection1).toBeDefined();
      expect(report.stats.byCollection.collection2).toBeDefined();
      
      // Check invalid and relative items
      expect(report.invalid.length).toBeGreaterThan(0);
      expect(report.relative.length).toBeGreaterThan(0);
    });
    
    it('should use provided collections when specified', async () => {
      // Create service with specific collections
      const customService = new MediaValidationService({
        collections: ['custom1', 'custom2']
      });
      
      const report = await customService.validateAllCollections();
      
      expect(report.stats.byCollection.custom1).toBeDefined();
      expect(report.stats.byCollection.custom2).toBeDefined();
    });
  });
  
  describe('fixCollectionRelativeUrls', () => {
    it('should fix relative URLs in a collection', async () => {
      const report = await service.fixCollectionRelativeUrls('collection1');
      
      // Check report structure and counts
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.stats.documentCount).toBe(2);
      expect(report.stats.fixedFieldCount).toBeGreaterThan(0);
      
      // Check fixes
      expect(report.fixes.length).toBeGreaterThan(0);
      
      // At least one document should be updated
      expect(report.stats.fixedDocumentCount).toBeGreaterThan(0);
      
      // Check collection stats
      expect(report.stats.byCollection.collection1).toBeDefined();
      expect(report.stats.byCollection.collection1.documentCount).toBe(2);
      expect(report.stats.byCollection.collection1.fixedCount).toBeGreaterThan(0);
    });
  });
  
  describe('fixAllRelativeUrls', () => {
    it('should fix relative URLs in all collections', async () => {
      const report = await service.fixAllRelativeUrls();
      
      // Check report structure and counts
      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.stats.documentCount).toBe(4); // 2 documents in each of 2 collections
      expect(report.stats.fixedFieldCount).toBeGreaterThan(0);
      
      // Check fixes
      expect(report.fixes.length).toBeGreaterThan(0);
      
      // At least one document should be updated
      expect(report.stats.fixedDocumentCount).toBeGreaterThan(0);
      
      // Check collection stats
      expect(report.stats.byCollection.collection1).toBeDefined();
      expect(report.stats.byCollection.collection2).toBeDefined();
    });
  });
  
  // Tests for edge cases and negative scenarios
  describe('Error handling', () => {
    it('should handle errors during URL validation', async () => {
      // Mock validateURL to throw an error
      (validateURL as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      // Service should not crash on validation errors
      const report = await service.validateCollection('collection1');
      
      expect(report).toBeDefined();
      expect(report.stats.documentCount).toBe(2);
      // There should be invalid items with errors
      expect(report.invalid.some(item => item.reason === 'Validation error')).toBe(true);
    });
    
    it('should handle Firestore errors gracefully', async () => {
      // Mock Firestore error
      const firestoreError = new Error('Firestore error');
      (admin.firestore().collection('error').get as jest.Mock).mockRejectedValueOnce(firestoreError);
      
      // Create a spy to check if error is logged
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      try {
        await service.validateCollection('error');
      } catch (error) {
        // We expect the error to be thrown
        expect(error).toBe(firestoreError);
      }
      
      // Check if error was logged
      expect(consoleSpy).toHaveBeenCalled();
      
      // Restore console.error
      consoleSpy.mockRestore();
    });
  });
});