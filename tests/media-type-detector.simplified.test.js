/**
 * Simplified Media Type Detector Tests
 * 
 * This file contains basic tests for the Media Type Detector functionality.
 */

const { MediaType } = require('../core/domain/media/media-type.cjs');

// Test MediaType enum constants
describe('MediaType', () => {
  test('should have correct constants', () => {
    expect(MediaType.IMAGE).toBe('image');
    expect(MediaType.VIDEO).toBe('video');
  });
  
  test('isValidMediaType should validate correctly', () => {
    const { isValidMediaType } = require('../core/domain/media/media-type.cjs');
    expect(isValidMediaType(MediaType.IMAGE)).toBe(true);
    expect(isValidMediaType(MediaType.VIDEO)).toBe(true);
    expect(isValidMediaType('invalid')).toBe(false);
    expect(isValidMediaType(null)).toBe(false);
  });
  
  test('MediaType.fromUrl should detect types correctly', () => {
    // Test image URLs
    expect(MediaType.fromUrl('https://example.com/image.jpg')).toBe(MediaType.IMAGE);
    expect(MediaType.fromUrl('https://example.com/image.png')).toBe(MediaType.IMAGE);
    
    // Test video URLs
    expect(MediaType.fromUrl('https://example.com/video.mp4')).toBe(MediaType.VIDEO);
    expect(MediaType.fromUrl('https://example.com/sample-SBV-123.mp4')).toBe(MediaType.VIDEO);
    
    // Test content type precedence
    expect(MediaType.fromUrl('https://example.com/video.mp4', 'image/jpeg')).toBe(MediaType.IMAGE);
    expect(MediaType.fromUrl('https://example.com/image.jpg', 'video/mp4')).toBe(MediaType.VIDEO);
  });
});

// Create basic tests for URL pattern detection
describe('URL Pattern Detection', () => {
  test('should identify relative URLs correctly', () => {
    const isRelative = (url) => !url.startsWith('http') && !url.startsWith('https');
    
    expect(isRelative('/images/logo.png')).toBe(true);
    expect(isRelative('images/logo.png')).toBe(true);
    expect(isRelative('./images/logo.png')).toBe(true);
    expect(isRelative('/yacht-placeholder.jpg')).toBe(true);
    
    expect(isRelative('https://example.com/image.jpg')).toBe(false);
    expect(isRelative('http://example.com/image.jpg')).toBe(false);
  });
  
  test('should detect video patterns in URLs', () => {
    const VIDEO_PATTERNS = ['-SBV-', 'Dynamic motion', '.mp4', '.mov', '.avi'];
    const isVideoUrl = (url) => VIDEO_PATTERNS.some(pattern => url.toLowerCase().includes(pattern.toLowerCase()));
    
    expect(isVideoUrl('https://example.com/video.mp4')).toBe(true);
    expect(isVideoUrl('https://storage.googleapis.com/path/to/Dynamic motion.mp4')).toBe(true);
    expect(isVideoUrl('https://example.com/sample-SBV-123.mp4')).toBe(true);
    
    expect(isVideoUrl('https://example.com/image.jpg')).toBe(false);
    expect(isVideoUrl('https://example.com/image.png')).toBe(false);
  });
});