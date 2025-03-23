/**
 * Media Repair Service Tests
 * 
 * This file contains tests for the Media Repair Service.
 */

const { MediaRepairService } = require('../core/domain/media/media-repair-service');
const { UrlResolverService } = require('../core/domain/media/url-resolver');
const { MediaTypeDetector } = require('../core/domain/media/media-type-detector.cjs');
const { MediaType } = require('../core/domain/media/media-type.cjs');

describe('MediaRepairService', () => {
  let service;
  let mockUrlResolver;
  let mockMediaTypeDetector;
  
  beforeEach(() => {
    // Create mock URL resolver
    mockUrlResolver = {
      resolveUrl: jest.fn(url => {
        if (!url || typeof url !== 'string') return url;
        if (url.startsWith('/')) {
          return `https://test.example.com${url}`;
        }
        return url;
      }),
      processDocument: jest.fn(doc => {
        if (!doc || typeof doc !== 'object') return doc;
        
        // Create a deep copy
        const processed = JSON.parse(JSON.stringify(doc));
        
        // Process imageUrl if it exists
        if (processed.imageUrl && typeof processed.imageUrl === 'string' && processed.imageUrl.startsWith('/')) {
          processed.imageUrl = `https://test.example.com${processed.imageUrl}`;
        }
        
        // Process coverImage.url if it exists
        if (processed.coverImage && processed.coverImage.url && processed.coverImage.url.startsWith('/')) {
          processed.coverImage.url = `https://test.example.com${processed.coverImage.url}`;
        }
        
        // Process media array if it exists
        if (Array.isArray(processed.media)) {
          processed.media = processed.media.map(item => {
            if (typeof item === 'string' && item.startsWith('/')) {
              return `https://test.example.com${item}`;
            } else if (item && typeof item === 'object' && item.url && item.url.startsWith('/')) {
              return { ...item, url: `https://test.example.com${item.url}` };
            }
            return item;
          });
        }
        
        return processed;
      }),
      isRelativeUrl: jest.fn(url => {
        if (!url || typeof url !== 'string') return false;
        return url.startsWith('/');
      })
    };
    
    // Create mock media type detector
    mockMediaTypeDetector = {
      detectMediaType: jest.fn(options => {
        const { url, mimeType } = options || {};
        
        if (mimeType) {
          if (mimeType.startsWith('image/')) return MediaType.IMAGE;
          if (mimeType.startsWith('video/')) return MediaType.VIDEO;
        }
        
        if (url) {
          if (url.includes('.mp4') || url.includes('-SBV-') || url.includes('Dynamic motion')) {
            return MediaType.VIDEO;
          }
        }
        
        return MediaType.IMAGE;
      }),
      processDocumentMediaTypes: jest.fn(doc => {
        if (!doc || typeof doc !== 'object') return doc;
        
        // Create a deep copy
        const processed = JSON.parse(JSON.stringify(doc));
        
        // Add mediaType to coverImage if it exists
        if (processed.coverImage && processed.coverImage.url) {
          processed.coverImage.mediaType = MediaType.IMAGE;
        }
        
        // Process media array if it exists
        if (Array.isArray(processed.media)) {
          processed.media = processed.media.map(item => {
            if (typeof item === 'object' && item.url) {
              if (!item.mediaType) {
                if (item.url.includes('.mp4') || item.url.includes('-SBV-') || item.url.includes('Dynamic motion')) {
                  item.mediaType = MediaType.VIDEO;
                } else {
                  item.mediaType = MediaType.IMAGE;
                }
              }
            }
            return item;
          });
        }
        
        return processed;
      }),
      isValidContentTypeForMediaType: jest.fn((contentType, mediaType) => {
        if (!contentType || !mediaType) return false;
        
        if (mediaType === MediaType.IMAGE) {
          return contentType.startsWith('image/');
        }
        
        if (mediaType === MediaType.VIDEO) {
          return contentType.startsWith('video/');
        }
        
        return false;
      })
    };
    
    // Create the service with mock dependencies
    service = new MediaRepairService({
      urlResolver: mockUrlResolver,
      mediaTypeDetector: mockMediaTypeDetector
    });
  });
  
  describe('repairDocument', () => {
    test('should repair relative URLs and add media type information', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: '/images/yacht.jpg',
        coverImage: {
          url: '/images/cover.jpg'
        },
        media: [
          { url: '/images/gallery1.jpg' },
          { url: 'https://example.com/gallery2.jpg' },
          { url: 'https://example.com/sample-SBV-123.mp4' },
          { url: 'https://example.com/Dynamic motion.mp4' }
        ]
      };
      
      const mediaFields = ['imageUrl', 'coverImage.url', 'media'];
      const repaired = service.repairDocument(document, mediaFields);
      
      // Verify URL resolver was called
      expect(mockUrlResolver.processDocument).toHaveBeenCalledWith(document, mediaFields);
      
      // Verify media type detector was called
      expect(mockMediaTypeDetector.processDocumentMediaTypes).toHaveBeenCalled();
      
      // Verify result has both resolved URLs and media types
      expect(repaired.coverImage.mediaType).toBe(MediaType.IMAGE);
      expect(repaired.media[2].mediaType).toBe(MediaType.VIDEO);
      expect(repaired.media[3].mediaType).toBe(MediaType.VIDEO);
    });
    
    test('should auto-detect media fields if none provided', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: '/images/yacht.jpg',
        coverImage: {
          url: '/images/cover.jpg'
        }
      };
      
      service._detectMediaFields = jest.fn().mockReturnValue(['imageUrl', 'coverImage.url']);
      
      service.repairDocument(document);
      
      expect(service._detectMediaFields).toHaveBeenCalledWith(document);
    });
    
    test('should handle empty or invalid documents', () => {
      expect(service.repairDocument(null)).toBe(null);
      expect(service.repairDocument(undefined)).toBe(undefined);
      expect(service.repairDocument({})).toEqual({});
      expect(service.repairDocument('string')).toBe('string');
    });
  });
  
  describe('repairDocuments', () => {
    test('should repair an array of documents', () => {
      const documents = [
        {
          id: 'yacht-1',
          imageUrl: '/images/yacht1.jpg'
        },
        {
          id: 'yacht-2',
          imageUrl: '/images/yacht2.jpg'
        }
      ];
      
      // Spy on repairDocument method
      const spyRepairDocument = jest.spyOn(service, 'repairDocument');
      
      service.repairDocuments(documents, ['imageUrl']);
      
      expect(spyRepairDocument).toHaveBeenCalledTimes(2);
      expect(spyRepairDocument).toHaveBeenCalledWith(documents[0], ['imageUrl']);
      expect(spyRepairDocument).toHaveBeenCalledWith(documents[1], ['imageUrl']);
    });
    
    test('should handle non-array input', () => {
      expect(service.repairDocuments(null)).toEqual([]);
      expect(service.repairDocuments({})).toEqual([]);
      expect(service.repairDocuments('string')).toEqual([]);
    });
  });
  
  describe('repairMediaUrl', () => {
    test('should repair a single URL and detect its media type', () => {
      const relativeUrl = '/images/yacht.jpg';
      const repaired = service.repairMediaUrl(relativeUrl);
      
      expect(mockUrlResolver.resolveUrl).toHaveBeenCalledWith(relativeUrl);
      expect(mockMediaTypeDetector.detectMediaType).toHaveBeenCalled();
      
      expect(repaired.url).toBe('https://test.example.com/images/yacht.jpg');
      expect(repaired.mediaType).toBe(MediaType.IMAGE);
      
      // Test video URL
      const videoUrl = '/videos/sample-SBV-123.mp4';
      const repairedVideo = service.repairMediaUrl(videoUrl);
      
      expect(repairedVideo.url).toBe('https://test.example.com/videos/sample-SBV-123.mp4');
      expect(repairedVideo.mediaType).toBe(MediaType.VIDEO);
    });
    
    test('should handle edge cases', () => {
      expect(service.repairMediaUrl(null)).toEqual({ url: null, mediaType: 'unknown' });
      expect(service.repairMediaUrl('')).toEqual({ url: '', mediaType: 'unknown' });
      expect(service.repairMediaUrl(undefined)).toEqual({ url: undefined, mediaType: 'unknown' });
    });
  });
  
  describe('_detectMediaFields', () => {
    test('should detect common media fields in documents', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: '/images/yacht.jpg',
        coverImage: {
          url: '/images/cover.jpg'
        },
        media: [
          { url: '/images/gallery1.jpg' },
          { url: '/videos/sample.mp4' }
        ],
        unrelatedField: 'value'
      };
      
      const fields = service._detectMediaFields(document);
      
      expect(fields).toContain('imageUrl');
      expect(fields).toContain('coverImage');
      expect(fields).toContain('media');
      expect(fields).not.toContain('id');
      expect(fields).not.toContain('name');
      expect(fields).not.toContain('unrelatedField');
    });
  });
});