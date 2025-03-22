/**
 * Media Type Tests (CommonJS Version)
 * 
 * Tests for the MediaType domain module.
 */

const { MediaType, isValidMediaType } = require('../../../../../core/domain/media/media-type.cjs');

describe('MediaType', () => {
  describe('enum values', () => {
    test('should define the correct media types', () => {
      expect(MediaType.IMAGE).toBe('image');
      expect(MediaType.VIDEO).toBe('video');
      expect(MediaType.DOCUMENT).toBe('document');
      expect(MediaType.AUDIO).toBe('audio');
    });
  });
  
  describe('fromUrl function', () => {
    test('should detect image type from URL', () => {
      expect(MediaType.fromUrl('https://example.com/image.jpg')).toBe(MediaType.IMAGE);
      expect(MediaType.fromUrl('https://example.com/image.png')).toBe(MediaType.IMAGE);
      expect(MediaType.fromUrl('https://example.com/image.webp')).toBe(MediaType.IMAGE);
    });
    
    test('should detect video type from URL', () => {
      expect(MediaType.fromUrl('https://example.com/video.mp4')).toBe(MediaType.VIDEO);
      expect(MediaType.fromUrl('https://example.com/video-SBV-123.jpg')).toBe(MediaType.VIDEO);
      expect(MediaType.fromUrl('https://example.com/Dynamic motion.jpg')).toBe(MediaType.VIDEO);
    });
    
    test('should detect document type from URL', () => {
      expect(MediaType.fromUrl('https://example.com/document.pdf')).toBe(MediaType.DOCUMENT);
      expect(MediaType.fromUrl('https://example.com/document.docx')).toBe(MediaType.DOCUMENT);
    });
    
    test('should detect audio type from URL', () => {
      expect(MediaType.fromUrl('https://example.com/audio.mp3')).toBe(MediaType.AUDIO);
      expect(MediaType.fromUrl('https://example.com/audio.wav')).toBe(MediaType.AUDIO);
    });
    
    test('should respect content type over URL patterns', () => {
      // Image file with video extension
      expect(MediaType.fromUrl('https://example.com/image.mp4', 'image/jpeg')).toBe(MediaType.IMAGE);
      
      // Video file with image extension
      expect(MediaType.fromUrl('https://example.com/video.jpg', 'video/mp4')).toBe(MediaType.VIDEO);
    });
    
    test('should handle null or undefined input', () => {
      expect(MediaType.fromUrl(null)).toBeNull();
      expect(MediaType.fromUrl(undefined)).toBeNull();
    });
    
    test('should default to image when type cannot be determined', () => {
      expect(MediaType.fromUrl('https://example.com/unknown')).toBe(MediaType.IMAGE);
    });
  });
  
  describe('matches function', () => {
    test('should return true for matching types', () => {
      expect(MediaType.matches(MediaType.IMAGE, MediaType.IMAGE)).toBe(true);
      expect(MediaType.matches(MediaType.VIDEO, MediaType.VIDEO)).toBe(true);
    });
    
    test('should return false for non-matching types', () => {
      expect(MediaType.matches(MediaType.IMAGE, MediaType.VIDEO)).toBe(false);
      expect(MediaType.matches(MediaType.DOCUMENT, MediaType.AUDIO)).toBe(false);
    });
  });
});

describe('isValidMediaType', () => {
  test('should return true for valid media types', () => {
    expect(isValidMediaType(MediaType.IMAGE)).toBe(true);
    expect(isValidMediaType(MediaType.VIDEO)).toBe(true);
    expect(isValidMediaType(MediaType.DOCUMENT)).toBe(true);
    expect(isValidMediaType(MediaType.AUDIO)).toBe(true);
  });
  
  test('should return false for invalid media types', () => {
    expect(isValidMediaType('invalid')).toBe(false);
    expect(isValidMediaType('')).toBe(false);
    expect(isValidMediaType(null)).toBe(false);
    expect(isValidMediaType(undefined)).toBe(false);
  });
});