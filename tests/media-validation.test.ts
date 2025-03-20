/**
 * Media Validation Test Suite
 * 
 * This file contains tests for the media validation service.
 */
import { MediaValidationService, DocumentValidationResult } from '../functions/media-validation/media-validation';
import { ValidationResult } from '../functions/media-validation/url-validator';

// Mock the URL validator to avoid actual network requests
jest.mock('../functions/media-validation/url-validator', () => {
  const originalModule = jest.requireActual('../functions/media-validation/url-validator');
  
  // Return the original functions but override the validation functions
  return {
    ...originalModule,
    validateUrl: jest.fn(async (url: string): Promise<ValidationResult> => {
      if (url === 'https://example.com/valid-image.jpg') {
        return {
          isValid: true,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'image/jpeg'
        };
      } else if (url === 'https://example.com/valid-video.mp4') {
        return {
          isValid: true,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'video/mp4'
        };
      } else if (url === 'https://example.com/not-found.jpg') {
        return {
          isValid: false,
          url,
          status: 404,
          statusText: 'Not Found',
          error: 'HTTP error: 404 Not Found'
        };
      } else if (url === 'https://example.com/wrong-type.jpg') {
        return {
          isValid: true,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'video/mp4'
        };
      } else if (url === '/relative/path/image.jpg') {
        return {
          isValid: false,
          url,
          error: 'Invalid URL'
        };
      } else {
        return {
          isValid: false,
          url,
          error: 'Request failed'
        };
      }
    }),
    validateImageUrl: jest.fn(async (url: string): Promise<ValidationResult> => {
      if (url === 'https://example.com/valid-image.jpg') {
        return {
          isValid: true,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'image/jpeg'
        };
      } else if (url === 'https://example.com/wrong-type.jpg') {
        return {
          isValid: false,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'video/mp4',
          error: 'Expected image, got video/mp4'
        };
      } else {
        return {
          isValid: false,
          url,
          error: 'Request failed'
        };
      }
    }),
    validateVideoUrl: jest.fn(async (url: string): Promise<ValidationResult> => {
      if (url === 'https://example.com/valid-video.mp4') {
        return {
          isValid: true,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'video/mp4'
        };
      } else if (url === 'https://example.com/valid-image.jpg') {
        return {
          isValid: false,
          url,
          status: 200,
          statusText: 'OK',
          contentType: 'image/jpeg',
          error: 'Expected video, got image/jpeg'
        };
      } else {
        return {
          isValid: false,
          url,
          error: 'Request failed'
        };
      }
    })
  };
});

describe('MediaValidationService', () => {
  let service: MediaValidationService;
  
  beforeEach(() => {
    service = new MediaValidationService();
  });
  
  describe('validateDocument', () => {
    it('should validate documents with image URLs', async () => {
      const document = {
        id: 'test1',
        title: 'Test Document',
        imageUrl: 'https://example.com/valid-image.jpg',
        media: [
          { type: 'image', url: 'https://example.com/valid-image.jpg' },
          { type: 'image', url: 'https://example.com/not-found.jpg' }
        ]
      };
      
      const result = await service.validateDocument(document, 'test1', 'documents');
      
      expect(result.id).toBe('test1');
      expect(result.collection).toBe('documents');
      expect(result.totalUrls).toBe(3); // 3 URLs found in the document
      expect(result.validUrls).toBe(2); // 2 valid URLs
      expect(result.invalidUrls).toBe(1); // 1 invalid URL
      
      // Check that URLs are properly identified
      const urls = result.results.map(r => r.url);
      expect(urls).toContain('https://example.com/valid-image.jpg');
      expect(urls).toContain('https://example.com/not-found.jpg');
      
      // Check validation results
      const validResults = result.results.filter(r => r.isValid);
      const invalidResults = result.results.filter(r => !r.isValid);
      
      expect(validResults.length).toBe(2);
      expect(invalidResults.length).toBe(1);
      expect(invalidResults[0].url).toBe('https://example.com/not-found.jpg');
    });
    
    it('should validate documents with video URLs', async () => {
      const document = {
        id: 'test2',
        title: 'Test Video Document',
        thumbnail: 'https://example.com/valid-image.jpg',
        videoUrl: 'https://example.com/valid-video.mp4'
      };
      
      const result = await service.validateDocument(document, 'test2', 'videos');
      
      expect(result.totalUrls).toBe(2);
      expect(result.validUrls).toBe(2);
      expect(result.invalidUrls).toBe(0);
      
      // Check that URLs are properly identified
      const urls = result.results.map(r => r.url);
      expect(urls).toContain('https://example.com/valid-image.jpg');
      expect(urls).toContain('https://example.com/valid-video.mp4');
    });
    
    it('should identify mismatched media types', async () => {
      const document = {
        id: 'test3',
        title: 'Test Mismatched Document',
        imageUrl: 'https://example.com/wrong-type.jpg', // This is a video but has image extension
        videoUrl: 'https://example.com/valid-image.jpg' // This is an image but expected to be video
      };
      
      const result = await service.validateDocument(document, 'test3', 'documents');
      
      expect(result.totalUrls).toBe(2);
      expect(result.validUrls).toBe(0); // Both are invalid due to type mismatch
      expect(result.invalidUrls).toBe(2);
      
      // Check error messages for type mismatches
      const imageFieldResult = result.results.find(r => r.field === 'imageUrl');
      const videoFieldResult = result.results.find(r => r.field === 'videoUrl');
      
      expect(imageFieldResult?.isValid).toBe(false);
      expect(imageFieldResult?.error).toContain('Expected image');
      
      expect(videoFieldResult?.isValid).toBe(false);
      expect(videoFieldResult?.error).toContain('Expected video');
    });
    
    it('should handle nested objects and arrays', async () => {
      const document = {
        id: 'test4',
        title: 'Test Nested Document',
        profile: {
          avatar: 'https://example.com/valid-image.jpg',
          gallery: [
            { title: 'Image 1', imageUrl: 'https://example.com/valid-image.jpg' },
            { title: 'Image 2', imageUrl: 'https://example.com/not-found.jpg' }
          ]
        }
      };
      
      const result = await service.validateDocument(document, 'test4', 'users');
      
      expect(result.totalUrls).toBe(3);
      expect(result.validUrls).toBe(2); 
      expect(result.invalidUrls).toBe(1);
      
      // Check that nested fields are identified correctly
      const fields = result.results.map(r => r.field);
      expect(fields).toContain('profile.avatar');
      expect(fields).toContain('profile.gallery.[0].imageUrl');
      expect(fields).toContain('profile.gallery.[1].imageUrl');
    });
  });
  
  describe('Report Generation', () => {
    it('should generate validation reports', () => {
      const startTime = new Date(2025, 2, 1, 10, 0, 0);
      const endTime = new Date(2025, 2, 1, 10, 5, 0);
      
      const results: DocumentValidationResult[] = [
        {
          id: 'doc1',
          collection: 'collection1',
          totalUrls: 3,
          validUrls: 2,
          invalidUrls: 1,
          results: [
            {
              field: 'imageUrl',
              url: 'https://example.com/valid-image.jpg',
              isValid: true,
              contentType: 'image/jpeg',
              status: 200,
              statusText: 'OK'
            },
            {
              field: 'thumbnail',
              url: 'https://example.com/valid-image.jpg',
              isValid: true,
              contentType: 'image/jpeg',
              status: 200,
              statusText: 'OK'
            },
            {
              field: 'media.[0].url',
              url: 'https://example.com/not-found.jpg',
              isValid: false,
              status: 404,
              statusText: 'Not Found',
              reason: 'Request failed',
              error: 'HTTP error: 404 Not Found'
            }
          ]
        },
        {
          id: 'doc2',
          collection: 'collection2',
          totalUrls: 2,
          validUrls: 1,
          invalidUrls: 1,
          results: [
            {
              field: 'imageUrl',
              url: 'https://example.com/valid-image.jpg',
              isValid: true,
              contentType: 'image/jpeg',
              status: 200,
              statusText: 'OK'
            },
            {
              field: 'videoUrl',
              url: 'https://example.com/wrong-type.mp4',
              isValid: false,
              contentType: 'image/jpeg',
              status: 200,
              statusText: 'OK',
              reason: 'Request failed',
              error: 'Expected video, got image/jpeg'
            }
          ]
        }
      ];
      
      const report = service.generateReport(results, startTime, endTime);
      
      // Check report metadata
      expect(report.startTime).toBe(startTime);
      expect(report.endTime).toBe(endTime);
      expect(report.duration).toBe(300000); // 5 minutes in milliseconds
      expect(report.totalDocuments).toBe(2);
      expect(report.totalFields).toBe(5);
      expect(report.validUrls).toBe(3);
      expect(report.invalidUrls).toBe(2);
      
      // Check collection summaries
      expect(report.collectionSummaries.length).toBe(2);
      
      const collection1Summary = report.collectionSummaries.find(s => s.collection === 'collection1');
      const collection2Summary = report.collectionSummaries.find(s => s.collection === 'collection2');
      
      expect(collection1Summary?.totalUrls).toBe(3);
      expect(collection1Summary?.validUrls).toBe(2);
      expect(collection1Summary?.invalidUrls).toBe(1);
      expect(collection1Summary?.validPercent).toBe(67); // 2/3 = ~67%
      
      expect(collection2Summary?.totalUrls).toBe(2);
      expect(collection2Summary?.validUrls).toBe(1);
      expect(collection2Summary?.invalidUrls).toBe(1);
      expect(collection2Summary?.validPercent).toBe(50); // 1/2 = 50%
      
      // Check invalid results
      expect(report.invalidResults.length).toBe(2);
    });
  });
  
  describe('URL Fixing', () => {
    it('should fix invalid URLs in documents', () => {
      const document = {
        id: 'test5',
        title: 'Test Document',
        imageUrl: 'https://example.com/not-found.jpg',
        media: [
          { type: 'image', url: 'https://example.com/valid-image.jpg' },
          { type: 'image', url: '/relative/path/image.jpg' }
        ],
        video: {
          url: 'https://example.com/wrong-type.mp4'
        }
      };
      
      const validation: DocumentValidationResult = {
        id: 'test5',
        collection: 'documents',
        totalUrls: 4,
        validUrls: 1,
        invalidUrls: 3,
        results: [
          {
            field: 'imageUrl',
            url: 'https://example.com/not-found.jpg',
            isValid: false,
            status: 404,
            statusText: 'Not Found',
            reason: 'Request failed',
            error: 'HTTP error: 404 Not Found'
          },
          {
            field: 'media.[0].url',
            url: 'https://example.com/valid-image.jpg',
            isValid: true,
            contentType: 'image/jpeg',
            status: 200,
            statusText: 'OK'
          },
          {
            field: 'media.[1].url',
            url: '/relative/path/image.jpg',
            isValid: false,
            reason: 'Request failed',
            error: 'Invalid URL'
          },
          {
            field: 'video.url',
            url: 'https://example.com/wrong-type.mp4',
            isValid: false,
            contentType: 'image/jpeg',
            status: 200,
            statusText: 'OK',
            reason: 'Request failed',
            error: 'Expected video, got image/jpeg'
          }
        ]
      };
      
      const { updatedDocument, fixes } = service.fixInvalidUrls(document, validation);
      
      // Check that the document was updated correctly
      expect(updatedDocument.imageUrl).toBe('/yacht-placeholder.jpg');
      expect(updatedDocument.media[0].url).toBe('https://example.com/valid-image.jpg'); // Not changed (valid)
      expect(updatedDocument.media[1].url).toBe('/yacht-placeholder.jpg');
      expect(updatedDocument.video.url).toBe('/yacht-video-placeholder.mp4');
      
      // Check the fix results
      expect(fixes.length).toBe(3); // 3 invalid URLs fixed
      
      const imageUrlFix = fixes.find(f => f.field === 'imageUrl');
      const relativeUrlFix = fixes.find(f => f.field === 'media.[1].url');
      const videoUrlFix = fixes.find(f => f.field === 'video.url');
      
      expect(imageUrlFix?.originalUrl).toBe('https://example.com/not-found.jpg');
      expect(imageUrlFix?.newUrl).toBe('/yacht-placeholder.jpg');
      expect(imageUrlFix?.fixed).toBe(true);
      
      expect(relativeUrlFix?.originalUrl).toBe('/relative/path/image.jpg');
      expect(relativeUrlFix?.newUrl).toBe('/yacht-placeholder.jpg');
      expect(relativeUrlFix?.fixed).toBe(true);
      
      expect(videoUrlFix?.originalUrl).toBe('https://example.com/wrong-type.mp4');
      expect(videoUrlFix?.newUrl).toBe('/yacht-video-placeholder.mp4');
      expect(videoUrlFix?.fixed).toBe(true);
    });
  });
});