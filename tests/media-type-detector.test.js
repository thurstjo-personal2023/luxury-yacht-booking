/**
 * Media Type Detector Tests
 * 
 * This file contains tests for the Media Type Detector.
 */

const { MediaTypeDetector } = require('../core/domain/media/media-type-detector.cjs');
const { MediaType } = require('../core/domain/media/media-type.cjs');

describe('MediaTypeDetector', () => {
  let detector;
  
  beforeEach(() => {
    detector = new MediaTypeDetector();
  });
  
  describe('detectMediaType', () => {
    test('should detect image types by URL', () => {
      expect(detector.detectMediaType({ url: 'https://example.com/image.jpg' })).toBe(MediaType.IMAGE);
      expect(detector.detectMediaType({ url: 'https://example.com/image.png' })).toBe(MediaType.IMAGE);
      expect(detector.detectMediaType({ url: 'https://example.com/image.jpeg' })).toBe(MediaType.IMAGE);
      expect(detector.detectMediaType({ url: 'https://storage.googleapis.com/path/to/image.webp' })).toBe(MediaType.IMAGE);
    });
    
    test('should detect video types by URL', () => {
      expect(detector.detectMediaType({ url: 'https://example.com/video.mp4' })).toBe(MediaType.VIDEO);
      expect(detector.detectMediaType({ url: 'https://example.com/video.mov' })).toBe(MediaType.VIDEO);
      expect(detector.detectMediaType({ url: 'https://storage.googleapis.com/path/to/Dynamic motion.mp4' })).toBe(MediaType.VIDEO);
      expect(detector.detectMediaType({ url: 'https://example.com/sample-SBV-123.mp4' })).toBe(MediaType.VIDEO);
    });
    
    test('should prioritize MIME type over URL patterns', () => {
      // Image MIME type with video-like URL should be detected as image
      expect(detector.detectMediaType({ 
        url: 'https://example.com/video.mp4', 
        mimeType: 'image/jpeg' 
      })).toBe(MediaType.IMAGE);
      
      // Video MIME type with image-like URL should be detected as video
      expect(detector.detectMediaType({ 
        url: 'https://example.com/image.jpg', 
        mimeType: 'video/mp4' 
      })).toBe(MediaType.VIDEO);
    });
    
    test('should handle edge cases', () => {
      expect(detector.detectMediaType({ url: '' })).toBe(MediaType.IMAGE); // Default
      expect(detector.detectMediaType({ url: null })).toBe(MediaType.IMAGE); // Default
      expect(detector.detectMediaType({ url: undefined })).toBe(MediaType.IMAGE); // Default
      expect(detector.detectMediaType({})).toBe(MediaType.IMAGE); // Default
    });
    
    test('should use fileName when available', () => {
      expect(detector.detectMediaType({ fileName: 'image.jpg' })).toBe(MediaType.IMAGE);
      expect(detector.detectMediaType({ fileName: 'video.mp4' })).toBe(MediaType.VIDEO);
    });
  });
  
  describe('isValidContentTypeForMediaType', () => {
    test('should validate image content types', () => {
      expect(detector.isValidContentTypeForMediaType('image/jpeg', MediaType.IMAGE)).toBe(true);
      expect(detector.isValidContentTypeForMediaType('image/png', MediaType.IMAGE)).toBe(true);
      expect(detector.isValidContentTypeForMediaType('video/mp4', MediaType.IMAGE)).toBe(false);
    });
    
    test('should validate video content types', () => {
      expect(detector.isValidContentTypeForMediaType('video/mp4', MediaType.VIDEO)).toBe(true);
      expect(detector.isValidContentTypeForMediaType('video/quicktime', MediaType.VIDEO)).toBe(true);
      expect(detector.isValidContentTypeForMediaType('image/jpeg', MediaType.VIDEO)).toBe(false);
    });
    
    test('should handle edge cases', () => {
      expect(detector.isValidContentTypeForMediaType('', MediaType.IMAGE)).toBe(false);
      expect(detector.isValidContentTypeForMediaType(null, MediaType.IMAGE)).toBe(false);
      expect(detector.isValidContentTypeForMediaType('image/jpeg', '')).toBe(false);
      expect(detector.isValidContentTypeForMediaType('image/jpeg', null)).toBe(false);
    });
  });
  
  describe('getMediaInfoFromFile', () => {
    test('should extract media info from file objects', () => {
      const imageFile = {
        name: 'image.jpg',
        type: 'image/jpeg',
        size: 12345
      };
      
      const videoFile = {
        name: 'video.mp4',
        type: 'video/mp4',
        size: 67890
      };
      
      const imageInfo = detector.getMediaInfoFromFile(imageFile);
      expect(imageInfo.mediaType).toBe(MediaType.IMAGE);
      expect(imageInfo.fileName).toBe('image.jpg');
      expect(imageInfo.mimeType).toBe('image/jpeg');
      expect(imageInfo.size).toBe(12345);
      
      const videoInfo = detector.getMediaInfoFromFile(videoFile);
      expect(videoInfo.mediaType).toBe(MediaType.VIDEO);
      expect(videoInfo.fileName).toBe('video.mp4');
      expect(videoInfo.mimeType).toBe('video/mp4');
      expect(videoInfo.size).toBe(67890);
    });
    
    test('should handle edge cases', () => {
      expect(detector.getMediaInfoFromFile(null)).toEqual({ mediaType: MediaType.IMAGE });
      expect(detector.getMediaInfoFromFile({})).toEqual({ 
        mediaType: MediaType.IMAGE, 
        fileName: '', 
        mimeType: '', 
        size: 0 
      });
    });
  });
  
  describe('processDocumentMediaTypes', () => {
    test('should add media type information to document fields', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: 'https://example.com/image.jpg',
        videoUrl: 'https://example.com/video.mp4',
        coverImage: {
          url: 'https://example.com/cover.jpg'
        },
        media: [
          { url: 'https://example.com/gallery1.jpg' },
          { url: 'https://example.com/sample-SBV-123.mp4' },
          { url: 'https://example.com/Dynamic motion.mp4' }
        ]
      };
      
      const mediaFields = ['imageUrl', 'videoUrl', 'coverImage.url', 'media'];
      const processed = detector.processDocumentMediaTypes(document, mediaFields);
      
      expect(processed.coverImage.mediaType).toBe(MediaType.IMAGE);
      expect(processed.media[0].mediaType).toBe(MediaType.IMAGE);
      expect(processed.media[1].mediaType).toBe(MediaType.VIDEO);
      expect(processed.media[2].mediaType).toBe(MediaType.VIDEO);
    });
    
    test('should not overwrite existing media type information', () => {
      const document = {
        media: [
          { 
            url: 'https://example.com/video.mp4', 
            mediaType: MediaType.IMAGE // Explicitly set as IMAGE even though URL suggests VIDEO
          }
        ]
      };
      
      const processed = detector.processDocumentMediaTypes(document, ['media']);
      
      // Should not change the explicit mediaType
      expect(processed.media[0].mediaType).toBe(MediaType.IMAGE);
    });
    
    test('should handle empty or invalid documents', () => {
      expect(detector.processDocumentMediaTypes(null)).toBe(null);
      expect(detector.processDocumentMediaTypes(undefined)).toBe(undefined);
      expect(detector.processDocumentMediaTypes({})).toEqual({});
      expect(detector.processDocumentMediaTypes('string')).toBe('string');
    });
  });
  
  describe('_getNestedValue and _setNestedValue', () => {
    test('should get and set nested values correctly', () => {
      const doc = {
        a: {
          b: {
            c: 'value'
          }
        },
        arr: [
          { id: 1 },
          { id: 2 }
        ]
      };
      
      // Test getting nested values
      expect(detector._getNestedValue(doc, 'a.b.c')).toBe('value');
      expect(detector._getNestedValue(doc, 'arr.[0].id')).toBe(1);
      expect(detector._getNestedValue(doc, 'nonexistent')).toBe(undefined);
      
      // Test setting nested values
      detector._setNestedValue(doc, 'a.b.c', 'newValue');
      expect(doc.a.b.c).toBe('newValue');
      
      detector._setNestedValue(doc, 'arr.[1].id', 3);
      expect(doc.arr[1].id).toBe(3);
      
      // Test creating nested paths
      detector._setNestedValue(doc, 'x.y.z', 'created');
      expect(doc.x.y.z).toBe('created');
    });
  });
});