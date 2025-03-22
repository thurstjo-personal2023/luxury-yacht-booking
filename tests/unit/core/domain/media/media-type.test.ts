/**
 * Media Type Tests
 * 
 * Tests for the MediaType enum and related functions in the domain layer.
 */

import { 
  MediaType, 
  getMediaTypeFromMime, 
  getMediaTypeFromUrl, 
  isMediaTypeMatch,
  MediaTypeMimePatterns,
  VideoFileExtensions,
  VideoUrlPatterns
} from '../../../../../core/domain/media/media-type';

describe('MediaType', () => {
  describe('enum values', () => {
    it('should define all expected media types', () => {
      expect(MediaType.IMAGE).toBe('image');
      expect(MediaType.VIDEO).toBe('video');
      expect(MediaType.AUDIO).toBe('audio');
      expect(MediaType.DOCUMENT).toBe('document');
      expect(MediaType.UNKNOWN).toBe('unknown');
    });
  });

  describe('MediaTypeMimePatterns', () => {
    it('should define patterns for each media type', () => {
      expect(MediaTypeMimePatterns[MediaType.IMAGE]).toBeDefined();
      expect(MediaTypeMimePatterns[MediaType.VIDEO]).toBeDefined();
      expect(MediaTypeMimePatterns[MediaType.AUDIO]).toBeDefined();
      expect(MediaTypeMimePatterns[MediaType.DOCUMENT]).toBeDefined();
    });
    
    it('should include common image mime patterns', () => {
      const imagePatterns = MediaTypeMimePatterns[MediaType.IMAGE];
      expect(imagePatterns).toContain('image/');
      expect(imagePatterns).toContain('application/octet-stream');
    });
    
    it('should include common video mime patterns', () => {
      const videoPatterns = MediaTypeMimePatterns[MediaType.VIDEO];
      expect(videoPatterns).toContain('video/');
      expect(videoPatterns).toContain('application/mp4');
    });
  });
  
  describe('VideoFileExtensions', () => {
    it('should include common video file extensions', () => {
      expect(VideoFileExtensions).toContain('.mp4');
      expect(VideoFileExtensions).toContain('.mov');
      expect(VideoFileExtensions).toContain('.avi');
      expect(VideoFileExtensions).toContain('.webm');
    });
  });
  
  describe('VideoUrlPatterns', () => {
    it('should include common video URL patterns', () => {
      expect(VideoUrlPatterns).toContain('-SBV-');
      expect(VideoUrlPatterns).toContain('Dynamic motion');
    });
  });
  
  describe('getMediaTypeFromMime', () => {
    it('should correctly identify image mime types', () => {
      expect(getMediaTypeFromMime('image/jpeg')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromMime('image/png')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromMime('image/gif')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromMime('application/octet-stream')).toBe(MediaType.IMAGE);
    });
    
    it('should correctly identify video mime types', () => {
      expect(getMediaTypeFromMime('video/mp4')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromMime('video/mpeg')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromMime('application/mp4')).toBe(MediaType.VIDEO);
    });
    
    it('should correctly identify audio mime types', () => {
      expect(getMediaTypeFromMime('audio/mpeg')).toBe(MediaType.AUDIO);
      expect(getMediaTypeFromMime('audio/mp3')).toBe(MediaType.AUDIO);
      expect(getMediaTypeFromMime('application/ogg')).toBe(MediaType.AUDIO);
    });
    
    it('should correctly identify document mime types', () => {
      expect(getMediaTypeFromMime('application/pdf')).toBe(MediaType.DOCUMENT);
      expect(getMediaTypeFromMime('application/msword')).toBe(MediaType.DOCUMENT);
      expect(getMediaTypeFromMime('text/plain')).toBe(MediaType.DOCUMENT);
    });
    
    it('should handle case insensitivity', () => {
      expect(getMediaTypeFromMime('IMAGE/JPEG')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromMime('Video/MP4')).toBe(MediaType.VIDEO);
    });
    
    it('should handle null or undefined input', () => {
      expect(getMediaTypeFromMime(null as any)).toBe(MediaType.UNKNOWN);
      expect(getMediaTypeFromMime(undefined as any)).toBe(MediaType.UNKNOWN);
      expect(getMediaTypeFromMime('')).toBe(MediaType.UNKNOWN);
    });
    
    it('should return UNKNOWN for unrecognized mime types', () => {
      expect(getMediaTypeFromMime('application/unknown')).toBe(MediaType.UNKNOWN);
      expect(getMediaTypeFromMime('text/custom')).toBe(MediaType.UNKNOWN);
    });
  });
  
  describe('getMediaTypeFromUrl', () => {
    it('should correctly identify video URLs by extension', () => {
      expect(getMediaTypeFromUrl('https://example.com/video.mp4')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromUrl('https://example.com/movie.avi')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromUrl('https://example.com/video.webm?param=value')).toBe(MediaType.VIDEO);
    });
    
    it('should correctly identify video URLs by patterns', () => {
      expect(getMediaTypeFromUrl('https://example.com/video-SBV-123.jpg')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromUrl('https://example.com/Dynamic motion-clip.jpg')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromUrl('https://example.com/video-preview-123.jpg')).toBe(MediaType.VIDEO);
    });
    
    it('should default to IMAGE for URLs without video indicators', () => {
      expect(getMediaTypeFromUrl('https://example.com/photo.jpg')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromUrl('https://example.com/image.png')).toBe(MediaType.IMAGE);
      expect(getMediaTypeFromUrl('https://example.com/picture')).toBe(MediaType.IMAGE);
    });
    
    it('should handle case insensitivity', () => {
      expect(getMediaTypeFromUrl('https://example.com/VIDEO.MP4')).toBe(MediaType.VIDEO);
      expect(getMediaTypeFromUrl('https://example.com/dynamic-MOTION-video.jpg')).toBe(MediaType.VIDEO);
    });
    
    it('should handle null or undefined input', () => {
      expect(getMediaTypeFromUrl(null as any)).toBe(MediaType.UNKNOWN);
      expect(getMediaTypeFromUrl(undefined as any)).toBe(MediaType.UNKNOWN);
      expect(getMediaTypeFromUrl('')).toBe(MediaType.UNKNOWN);
    });
  });
  
  describe('isMediaTypeMatch', () => {
    it('should return true when types match', () => {
      expect(isMediaTypeMatch(MediaType.IMAGE, MediaType.IMAGE)).toBe(true);
      expect(isMediaTypeMatch(MediaType.VIDEO, MediaType.VIDEO)).toBe(true);
    });
    
    it('should return false when types do not match', () => {
      expect(isMediaTypeMatch(MediaType.IMAGE, MediaType.VIDEO)).toBe(false);
      expect(isMediaTypeMatch(MediaType.AUDIO, MediaType.DOCUMENT)).toBe(false);
    });
    
    it('should return true when expected type is UNKNOWN', () => {
      expect(isMediaTypeMatch(MediaType.IMAGE, MediaType.UNKNOWN)).toBe(true);
      expect(isMediaTypeMatch(MediaType.VIDEO, MediaType.UNKNOWN)).toBe(true);
    });
    
    it('should return true when expected type is null or undefined', () => {
      expect(isMediaTypeMatch(MediaType.IMAGE, null as any)).toBe(true);
      expect(isMediaTypeMatch(MediaType.VIDEO, undefined as any)).toBe(true);
    });
  });
});