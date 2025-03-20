/**
 * Media Validation Service Test Suite
 * 
 * This file contains tests for the media validation service functionality.
 */
import { MediaValidationService } from '../functions/media-validation/media-validation';
import { URLValidator } from '../functions/media-validation/url-validator';

// Mock the URL validator
jest.mock('../functions/media-validation/url-validator');

// Mock Firestore
const mockFirestore = {
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      set: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({
          id: 'test-doc',
          title: 'Test Document',
          media: [
            { type: 'image', url: 'https://example.com/valid-image.jpg' },
            { type: 'image', url: 'https://example.com/invalid-image.jpg' },
            { type: 'image', url: '/relative-path-image.jpg' }
          ]
        })
      })
    })),
    get: jest.fn().mockResolvedValue({
      empty: false,
      docs: [
        {
          id: 'doc1',
          ref: {
            id: 'doc1',
            path: 'collection/doc1'
          },
          data: () => ({
            id: 'doc1',
            title: 'Document 1',
            media: [
              { type: 'image', url: 'https://example.com/image1.jpg' }
            ]
          })
        },
        {
          id: 'doc2',
          ref: {
            id: 'doc2',
            path: 'collection/doc2'
          },
          data: () => ({
            id: 'doc2',
            title: 'Document 2',
            media: [
              { type: 'image', url: 'https://example.com/image2.jpg' },
              { type: 'image', url: 'https://example.com/image3.jpg' }
            ]
          })
        }
      ]
    })
  })
};

// Helper function to get a media validation service with mocks
function getMediaValidation() {
  // Mock the URL validator implementation
  const mockUrlValidator = {
    validateURL: jest.fn(async (url: string) => {
      if (url === 'https://example.com/valid-image.jpg') {
        return {
          isValid: true,
          url,
          status: 200,
          contentType: 'image/jpeg'
        };
      } else if (url === '/relative-path-image.jpg') {
        return {
          isValid: false,
          url,
          error: 'Relative URL'
        };
      } else {
        return {
          isValid: false,
          url,
          status: 404,
          error: 'Not Found'
        };
      }
    }),
    isRelativeURL: jest.fn((url: string) => url.startsWith('/')),
    isAbsoluteURL: jest.fn((url: string) => url.startsWith('http')),
    normalizePotentialRelativeURL: jest.fn((url: string, baseUrl: string) => {
      if (url.startsWith('/')) {
        return `${baseUrl}${url}`;
      }
      return url;
    })
  };
  
  (URLValidator as jest.Mock).mockImplementation(() => mockUrlValidator);
  
  return new MediaValidationService({
    firestore: mockFirestore as any,
    collectionNames: ['yacht_profiles', 'experience_packages'],
    baseUrl: 'https://example.com',
    logInfo: jest.fn(),
    logError: jest.fn(),
    logWarning: jest.fn(),
    batchSize: 10
  });
}

describe('MediaValidationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('validateDocument', () => {
    it('should validate document media fields correctly', async () => {
      const service = getMediaValidation();
      const document = {
        id: 'test-doc',
        media: [
          { type: 'image', url: 'https://example.com/valid-image.jpg' },
          { type: 'image', url: 'https://example.com/invalid-image.jpg' }
        ]
      };
      
      const results = await service.validateDocumentMedia('test_collection', document.id, document);
      
      // Verify results
      expect(results.valid.length).toBe(1);
      expect(results.invalid.length).toBe(1);
      expect(results.valid[0].url).toBe('https://example.com/valid-image.jpg');
      expect(results.invalid[0].url).toBe('https://example.com/invalid-image.jpg');
    });
    
    it('should handle nested media fields', async () => {
      const service = getMediaValidation();
      const document = {
        id: 'test-doc',
        // Nested media in arrays
        categories: [
          {
            name: 'Category 1',
            media: [
              { type: 'image', url: 'https://example.com/valid-image.jpg' }
            ]
          },
          {
            name: 'Category 2',
            media: [
              { type: 'image', url: 'https://example.com/invalid-image.jpg' }
            ]
          }
        ],
        // Nested media in objects
        featuredImage: {
          type: 'image',
          url: '/relative-path-image.jpg'
        }
      };
      
      const results = await service.validateDocumentMedia('test_collection', document.id, document);
      
      // Verify results
      expect(results.valid.length).toBe(1);
      expect(results.invalid.length).toBe(2);
      expect(results.invalid.some(i => i.url === '/relative-path-image.jpg')).toBe(true);
    });
  });
  
  describe('validateCollection', () => {
    it('should validate all documents in a collection', async () => {
      const service = getMediaValidation();
      
      const results = await service.validateCollection('yacht_profiles');
      
      // We expect 3 media items from 2 documents
      expect(results.totalDocuments).toBe(2);
      expect(results.totalMediaItems).toBe(3);
      
      // Verify Firestore collection was queried
      expect(mockFirestore.collection).toHaveBeenCalledWith('yacht_profiles');
    });
  });
  
  describe('fixRelativeUrls', () => {
    it('should fix relative URLs in documents', async () => {
      const service = getMediaValidation();
      const document = {
        id: 'test-doc',
        media: [
          { type: 'image', url: '/relative-path-image.jpg' }
        ],
        featuredImage: {
          type: 'image',
          url: '/another-relative.jpg'
        }
      };
      
      const result = await service.fixRelativeUrls('test_collection', document.id, document);
      
      // Verify both relative URLs were fixed
      expect(result.fixedUrls.length).toBe(2);
      expect(result.fixedDocument.media[0].url).toBe('https://example.com/relative-path-image.jpg');
      expect(result.fixedDocument.featuredImage.url).toBe('https://example.com/another-relative.jpg');
    });
  });
});