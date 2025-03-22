/**
 * Extended MediaType Tests (CommonJS Version)
 * 
 * Comprehensive tests for the MediaType domain module with edge cases.
 */

const { MediaType, isValidMediaType } = require('../../../../../core/domain/media/media-type.cjs');

describe('MediaType Extended Tests', () => {
  // Test actual enum values
  describe('enum values', () => {
    test('should have the correct media type values', () => {
      expect(MediaType.IMAGE).toBe('image');
      expect(MediaType.VIDEO).toBe('video');
      expect(MediaType.DOCUMENT).toBe('document');
      expect(MediaType.AUDIO).toBe('audio');
    });
  });

  // Test URL type detection
  describe('fromUrl function', () => {
    // Image detection tests
    test('should detect common image formats correctly', () => {
      const imageUrls = [
        'https://example.com/photo.jpg',
        'https://example.com/image.jpeg',
        'https://example.com/graphic.png',
        'https://example.com/animation.gif',
        'https://example.com/vector.svg',
        'https://example.com/photo.webp',
        'https://example.com/image.tiff',
        'https://storage.googleapis.com/bucket/folder/image.jpg',
        'https://firebasestorage.googleapis.com/v0/b/project/o/images%2Fphoto.jpg'
      ];
      
      imageUrls.forEach(url => {
        expect(MediaType.fromUrl(url)).toBe(MediaType.IMAGE);
      });
    });
    
    // Video detection tests
    test('should detect video formats and indicators correctly', () => {
      const videoUrls = [
        'https://example.com/video.mp4',
        'https://example.com/clip.mov',
        'https://example.com/movie.avi',
        'https://example.com/recording.webm',
        'https://example.com/file.mkv',
        'https://example.com/video-SBV-123.jpg', // Special indicator
        'https://example.com/Dynamic motion.jpg', // Special indicator
        'https://example.com/animation-SBV-456.png',
        'https://storage.googleapis.com/bucket/folder/yacht_tour.mp4'
      ];
      
      videoUrls.forEach(url => {
        expect(MediaType.fromUrl(url)).toBe(MediaType.VIDEO);
      });
    });
    
    // Document detection tests
    test('should detect document formats correctly', () => {
      const documentUrls = [
        'https://example.com/document.pdf',
        'https://example.com/spreadsheet.xlsx',
        'https://example.com/presentation.pptx',
        'https://example.com/text.doc',
        'https://example.com/notes.txt',
        'https://example.com/data.csv',
        'https://storage.googleapis.com/bucket/folder/contract.pdf'
      ];
      
      documentUrls.forEach(url => {
        expect(MediaType.fromUrl(url)).toBe(MediaType.DOCUMENT);
      });
    });
    
    // Audio detection tests
    test('should detect audio formats correctly', () => {
      const audioUrls = [
        'https://example.com/music.mp3',
        'https://example.com/sound.wav',
        'https://example.com/audio.ogg',
        'https://example.com/podcast.m4a',
        'https://example.com/recording.flac',
        'https://storage.googleapis.com/bucket/folder/yacht_sounds.mp3'
      ];
      
      audioUrls.forEach(url => {
        expect(MediaType.fromUrl(url)).toBe(MediaType.AUDIO);
      });
    });
    
    // Content type override tests
    test('should respect content type headers over URL patterns', () => {
      // Content type overriding URL pattern
      expect(MediaType.fromUrl('https://example.com/video.jpg', 'video/mp4')).toBe(MediaType.VIDEO);
      expect(MediaType.fromUrl('https://example.com/document.jpg', 'application/pdf')).toBe(MediaType.DOCUMENT);
      expect(MediaType.fromUrl('https://example.com/audio.jpg', 'audio/mp3')).toBe(MediaType.AUDIO);
      expect(MediaType.fromUrl('https://example.com/movie.pdf', 'video/mp4')).toBe(MediaType.VIDEO);
      
      // Special case: image content type should override video pattern
      expect(MediaType.fromUrl('https://example.com/video-SBV-123.jpg', 'image/jpeg')).toBe(MediaType.IMAGE);
    });
    
    // Edge cases
    test('should handle edge cases properly', () => {
      // Null or undefined
      expect(MediaType.fromUrl(null)).toBeNull();
      expect(MediaType.fromUrl(undefined)).toBeNull();
      
      // Empty string
      expect(MediaType.fromUrl('')).toBe(MediaType.IMAGE); // Default to image
      
      // URL with no extension or indicators
      expect(MediaType.fromUrl('https://example.com/file')).toBe(MediaType.IMAGE); // Default to image
      
      // Relative URLs (these are often invalid in the validation system)
      expect(MediaType.fromUrl('/yacht-placeholder.jpg')).toBe(MediaType.IMAGE);
      
      // Case insensitivity
      expect(MediaType.fromUrl('https://example.com/IMAGE.JPG')).toBe(MediaType.IMAGE);
      expect(MediaType.fromUrl('https://example.com/VIDEO.MP4')).toBe(MediaType.VIDEO);
      
      // Mixed case in special indicators
      expect(MediaType.fromUrl('https://example.com/Video-SbV-123.jpg')).toBe(MediaType.VIDEO);
      expect(MediaType.fromUrl('https://example.com/Dynamic Motion.jpg')).toBe(MediaType.VIDEO);
    });
  });

  // Test type matching function
  describe('matches function', () => {
    test('should correctly compare media types', () => {
      // Same types
      expect(MediaType.matches(MediaType.IMAGE, MediaType.IMAGE)).toBe(true);
      expect(MediaType.matches(MediaType.VIDEO, MediaType.VIDEO)).toBe(true);
      expect(MediaType.matches(MediaType.DOCUMENT, MediaType.DOCUMENT)).toBe(true);
      expect(MediaType.matches(MediaType.AUDIO, MediaType.AUDIO)).toBe(true);
      
      // Different types
      expect(MediaType.matches(MediaType.IMAGE, MediaType.VIDEO)).toBe(false);
      expect(MediaType.matches(MediaType.VIDEO, MediaType.DOCUMENT)).toBe(false);
      expect(MediaType.matches(MediaType.DOCUMENT, MediaType.AUDIO)).toBe(false);
      expect(MediaType.matches(MediaType.AUDIO, MediaType.IMAGE)).toBe(false);
      
      // Edge cases
      expect(MediaType.matches(null, MediaType.IMAGE)).toBe(false);
      expect(MediaType.matches(MediaType.IMAGE, null)).toBe(false);
      expect(MediaType.matches(undefined, MediaType.VIDEO)).toBe(false);
      expect(MediaType.matches(MediaType.VIDEO, undefined)).toBe(false);
    });
  });
  
  // Test validation function
  describe('isValidMediaType function', () => {
    test('should validate correct media types', () => {
      expect(isValidMediaType(MediaType.IMAGE)).toBe(true);
      expect(isValidMediaType(MediaType.VIDEO)).toBe(true);
      expect(isValidMediaType(MediaType.DOCUMENT)).toBe(true);
      expect(isValidMediaType(MediaType.AUDIO)).toBe(true);
    });
    
    test('should reject invalid media types', () => {
      expect(isValidMediaType('invalid')).toBe(false);
      expect(isValidMediaType('')).toBe(false);
      expect(isValidMediaType(null)).toBe(false);
      expect(isValidMediaType(undefined)).toBe(false);
      expect(isValidMediaType(123)).toBe(false);
      expect(isValidMediaType({})).toBe(false);
    });
  });
});