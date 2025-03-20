/**
 * Media Validation Test Suite
 * 
 * This file contains tests for the media validation service functionality.
 */
import { MediaValidationService } from '../functions/media-validation/media-validation';
import { URLValidator } from '../functions/media-validation/url-validator';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('MediaValidationService', () => {
  // Setup common test options
  const baseUrl = 'https://etoile-yachts.firebaseapp.com';
  const mockOptions = {
    baseUrl,
    logInfo: jest.fn(),
    logError: jest.fn(),
    logDebug: jest.fn(),
    timeout: 1000
  };
  
  // Test document with media fields
  const testDocument = {
    id: 'test-doc-1',
    title: 'Test Document',
    media: [
      { type: 'image', url: 'https://example.com/image1.jpg' },
      { type: 'video', url: 'https://example.com/video1.mp4' },
      { type: 'image', url: '/relative/image.jpg' }
    ],
    thumbnailUrl: 'https://example.com/thumbnail.jpg',
    profile: {
      avatar: 'https://example.com/avatar.png',
      backgroundImage: '/backgrounds/profile-bg.jpg'
    },
    nestedContent: {
      sections: [
        {
          title: 'Section 1',
          images: ['https://example.com/section1/image1.jpg', '/section1/image2.jpg']
        }
      ]
    }
  };
  
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup default mock responses
    mockedAxios.get.mockImplementation((url) => {
      // For valid image URLs
      if (url.includes('image') || url.includes('avatar') || url.includes('thumbnail')) {
        return Promise.resolve({
          status: 200,
          headers: { 'content-type': 'image/jpeg' }
        });
      }
      // For valid video URLs
      else if (url.includes('video')) {
        return Promise.resolve({
          status: 200,
          headers: { 'content-type': 'video/mp4' }
        });
      }
      // For 404 errors
      else if (url.includes('missing')) {
        return Promise.resolve({
          status: 404,
          statusText: 'Not Found'
        });
      }
      // Default fallback
      else {
        return Promise.resolve({
          status: 200,
          headers: { 'content-type': 'text/html' }
        });
      }
    });
  });
  
  describe('validateField', () => {
    it('should validate an image URL field successfully', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test
      const result = await service.validateField(
        testDocument,
        'media[0].url',
        'image'
      );
      
      // Verify
      expect(result.isValid).toBe(true);
      expect(result.path).toBe('media[0].url');
      expect(result.value).toBe('https://example.com/image1.jpg');
      expect(result.expectedType).toBe('image');
      expect(result.actualType).toBe('image');
      expect(result.isRelative).toBe(false);
    });
    
    it('should detect media type mismatches', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test - trying to validate a video URL as an image
      const result = await service.validateField(
        testDocument,
        'media[1].url',
        'image'
      );
      
      // Verify
      expect(result.isValid).toBe(false);
      expect(result.expectedType).toBe('image');
      expect(result.actualType).toBe('video');
      expect(result.error).toContain('Expected image');
    });
    
    it('should identify relative URLs', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test
      const result = await service.validateField(
        testDocument,
        'media[2].url',
        'image'
      );
      
      // Verify
      expect(result.isRelative).toBe(true);
      expect(result.originalValue).toBe('/relative/image.jpg');
      expect(result.value).toBe('https://etoile-yachts.firebaseapp.com/relative/image.jpg');
      expect(result.wasNormalized).toBe(true);
    });
    
    it('should handle nested paths correctly', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test
      const result = await service.validateField(
        testDocument,
        'profile.backgroundImage',
        'image'
      );
      
      // Verify
      expect(result.isRelative).toBe(true);
      expect(result.originalValue).toBe('/backgrounds/profile-bg.jpg');
    });
    
    it('should handle deeply nested array paths', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test
      const result = await service.validateField(
        testDocument,
        'nestedContent.sections[0].images[1]',
        'image'
      );
      
      // Verify
      expect(result.isRelative).toBe(true);
      expect(result.originalValue).toBe('/section1/image2.jpg');
    });
  });
  
  describe('validateDocument', () => {
    it('should validate all media fields in a document', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      
      // Test
      const result = await service.validateDocument(
        testDocument,
        'test-doc-1',
        'test-collection/test-doc-1'
      );
      
      // Verify
      expect(result.id).toBe('test-doc-1');
      expect(result.path).toBe('test-collection/test-doc-1');
      expect(result.fieldCount).toBeGreaterThan(0);
      expect(result.fieldResults.length).toBe(result.fieldCount);
      expect(result.relativeUrlCount).toBeGreaterThan(0);
      expect(result.hasRelativeUrls).toBe(true);
    });
    
    it('should handle empty documents gracefully', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      const emptyDoc = { id: 'empty-doc' };
      
      // Test
      const result = await service.validateDocument(
        emptyDoc,
        'empty-doc',
        'test-collection/empty-doc'
      );
      
      // Verify
      expect(result.fieldCount).toBe(0);
      expect(result.fieldResults.length).toBe(0);
      expect(result.invalidCount).toBe(0);
      expect(result.relativeUrlCount).toBe(0);
      expect(result.hasInvalidFields).toBe(false);
      expect(result.hasRelativeUrls).toBe(false);
    });
  });
  
  describe('fixDocumentUrls', () => {
    it('should fix relative URLs in a document', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      const docToFix = JSON.parse(JSON.stringify(testDocument));
      
      // First validate to get validation results
      const validationResult = await service.validateDocument(
        docToFix,
        'test-doc-1',
        'test-collection/test-doc-1'
      );
      
      // Test fixing
      const fixResult = await service.fixDocumentUrls(docToFix, validationResult);
      
      // Verify
      expect(fixResult.wasUpdated).toBe(true);
      expect(fixResult.fixedCount).toBeGreaterThan(0);
      expect(fixResult.fieldResults.length).toBeGreaterThan(0);
      
      // Find relative URL fixes
      const relativeUrlFixes = fixResult.fieldResults.filter(
        fix => fix.fixType === 'relative-to-absolute'
      );
      expect(relativeUrlFixes.length).toBeGreaterThan(0);
      
      // Check that relative URLs were converted to absolute
      for (const fix of relativeUrlFixes) {
        expect(fix.success).toBe(true);
        expect(fix.newValue).toContain(baseUrl);
        expect(fix.newValue).not.toEqual(fix.originalValue);
      }
    });
    
    it('should not update a document with no issues', async () => {
      // Setup
      const service = new MediaValidationService(mockOptions);
      const validDoc = {
        id: 'valid-doc',
        images: [
          'https://example.com/valid1.jpg',
          'https://example.com/valid2.jpg'
        ]
      };
      
      // First validate
      const validationResult = await service.validateDocument(
        validDoc,
        'valid-doc',
        'test-collection/valid-doc'
      );
      
      // Then try to fix
      const fixResult = await service.fixDocumentUrls(validDoc, validationResult);
      
      // Verify no changes were made
      expect(fixResult.wasUpdated).toBe(false);
      expect(fixResult.fixedCount).toBe(0);
    });
  });
});