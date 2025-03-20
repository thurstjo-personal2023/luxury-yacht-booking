/**
 * URL Validator Test Suite
 * 
 * This file contains tests for the URL validation functionality.
 */
import {
  isValidURL,
  isAbsoluteURL,
  getMediaTypeFromURL,
  validateURL,
  convertRelativeToAbsoluteURL,
  fixRelativeURL,
  getMediaTypeFromContentType,
  MEDIA_TYPES,
  URLValidationResult
} from '../functions/media-validation/url-validator';

// Mock fetch for testing
jest.mock('node-fetch');
import fetch from 'node-fetch';
const { Response } = jest.requireActual('node-fetch');

describe('URL Validator', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('isValidURL', () => {
    it('should validate absolute URLs', () => {
      expect(isValidURL('https://example.com')).toBe(true);
      expect(isValidURL('http://localhost:3000')).toBe(true);
      expect(isValidURL('https://storage.googleapis.com/my-bucket/image.jpg')).toBe(true);
    });
    
    it('should validate relative URLs', () => {
      expect(isValidURL('/images/yacht.jpg')).toBe(true);
      expect(isValidURL('/yacht-placeholder.jpg')).toBe(true);
    });
    
    it('should reject invalid URLs', () => {
      expect(isValidURL('')).toBe(false);
      expect(isValidURL(null as any)).toBe(false);
      expect(isValidURL(undefined as any)).toBe(false);
      expect(isValidURL('not a url')).toBe(false);
      expect(isValidURL('http:/missing-slash')).toBe(false);
    });
    
    it('should reject relative URLs with invalid characters', () => {
      expect(isValidURL('/ spaced.jpg')).toBe(false);
      expect(isValidURL('/<script>.jpg')).toBe(false);
      expect(isValidURL('/"quoted".jpg')).toBe(false);
    });
  });
  
  describe('isAbsoluteURL', () => {
    it('should detect absolute URLs', () => {
      expect(isAbsoluteURL('https://example.com')).toBe(true);
      expect(isAbsoluteURL('http://localhost:3000')).toBe(true);
    });
    
    it('should detect relative URLs', () => {
      expect(isAbsoluteURL('/images/yacht.jpg')).toBe(false);
      expect(isAbsoluteURL('yacht.jpg')).toBe(false);
    });
    
    it('should handle edge cases', () => {
      expect(isAbsoluteURL('')).toBe(false);
      expect(isAbsoluteURL(null as any)).toBe(false);
      expect(isAbsoluteURL('https:')).toBe(false);
      expect(isAbsoluteURL('//example.com/image.jpg')).toBe(false);
    });
  });
  
  describe('getMediaTypeFromURL', () => {
    it('should detect image types from extension', () => {
      expect(getMediaTypeFromURL('https://example.com/image.jpg')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromURL('https://example.com/image.png')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromURL('https://example.com/image.webp')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromURL('/images/yacht.jpeg')).toBe(MEDIA_TYPES.IMAGE);
    });
    
    it('should detect video types from extension', () => {
      expect(getMediaTypeFromURL('https://example.com/video.mp4')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromURL('https://example.com/video.webm')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromURL('/videos/yacht-tour.mov')).toBe(MEDIA_TYPES.VIDEO);
    });
    
    it('should return unknown for other extensions', () => {
      expect(getMediaTypeFromURL('https://example.com/file.pdf')).toBe(MEDIA_TYPES.UNKNOWN);
      expect(getMediaTypeFromURL('https://example.com/file.txt')).toBe(MEDIA_TYPES.UNKNOWN);
      expect(getMediaTypeFromURL('https://example.com/page.html')).toBe(MEDIA_TYPES.UNKNOWN);
    });
    
    it('should use content type over extension when provided', () => {
      expect(getMediaTypeFromURL('https://example.com/file', 'image/jpeg')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromURL('https://example.com/file.txt', 'image/png')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromURL('https://example.com/file', 'video/mp4')).toBe(MEDIA_TYPES.VIDEO);
    });
  });
  
  describe('getMediaTypeFromContentType', () => {
    it('should detect image content types', () => {
      expect(getMediaTypeFromContentType('image/jpeg')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromContentType('image/png')).toBe(MEDIA_TYPES.IMAGE);
      expect(getMediaTypeFromContentType('image/svg+xml')).toBe(MEDIA_TYPES.IMAGE);
    });
    
    it('should detect video content types', () => {
      expect(getMediaTypeFromContentType('video/mp4')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromContentType('video/webm')).toBe(MEDIA_TYPES.VIDEO);
      expect(getMediaTypeFromContentType('video/ogg')).toBe(MEDIA_TYPES.VIDEO);
    });
    
    it('should return unknown for other content types', () => {
      expect(getMediaTypeFromContentType('application/pdf')).toBe(MEDIA_TYPES.UNKNOWN);
      expect(getMediaTypeFromContentType('text/html')).toBe(MEDIA_TYPES.UNKNOWN);
      expect(getMediaTypeFromContentType('')).toBe(MEDIA_TYPES.UNKNOWN);
      expect(getMediaTypeFromContentType(null as any)).toBe(MEDIA_TYPES.UNKNOWN);
    });
  });
  
  describe('convertRelativeToAbsoluteURL', () => {
    it('should convert relative URLs to absolute URLs', () => {
      expect(convertRelativeToAbsoluteURL('/images/yacht.jpg', 'https://example.com')).toBe('https://example.com/images/yacht.jpg');
      expect(convertRelativeToAbsoluteURL('images/yacht.jpg', 'https://example.com/')).toBe('https://example.com/images/yacht.jpg');
    });
    
    it('should handle base URLs with and without trailing slashes', () => {
      expect(convertRelativeToAbsoluteURL('/yacht.jpg', 'https://example.com')).toBe('https://example.com/yacht.jpg');
      expect(convertRelativeToAbsoluteURL('/yacht.jpg', 'https://example.com/')).toBe('https://example.com/yacht.jpg');
    });
    
    it('should return absolute URLs unchanged', () => {
      expect(convertRelativeToAbsoluteURL('https://other.com/image.jpg', 'https://example.com')).toBe('https://other.com/image.jpg');
    });
  });
  
  describe('fixRelativeURL', () => {
    it('should convert relative URLs to absolute URLs', () => {
      expect(fixRelativeURL('/images/yacht.jpg', 'https://example.com')).toBe('https://example.com/images/yacht.jpg');
    });
    
    it('should use placeholder for non-path relative URLs when provided', () => {
      expect(fixRelativeURL('yacht.jpg', 'https://example.com', 'https://placeholder.com/image.jpg')).toBe('https://placeholder.com/image.jpg');
    });
    
    it('should convert path-like URLs even when placeholder is provided', () => {
      expect(fixRelativeURL('/images/yacht.jpg', 'https://example.com', 'https://placeholder.com/image.jpg')).toBe('https://example.com/images/yacht.jpg');
    });
    
    it('should return absolute URLs unchanged', () => {
      expect(fixRelativeURL('https://other.com/image.jpg', 'https://example.com', 'https://placeholder.com/image.jpg')).toBe('https://other.com/image.jpg');
    });
  });
  
  describe('validateURL', () => {
    it('should validate a good URL', async () => {
      // Mock successful response
      (fetch as jest.Mock).mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'image/jpeg' }
        })
      );
      
      const result = await validateURL('https://example.com/image.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.IMAGE);
      expect(result.isAbsolute).toBe(true);
      expect(result.contentType).toBe('image/jpeg');
    });
    
    it('should detect invalid URLs', async () => {
      const result = await validateURL('not-a-url');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
    
    it('should detect relative URLs', async () => {
      const result = await validateURL('/images/yacht.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.isAbsolute).toBe(false);
      expect(result.error).toBe('Relative URL cannot be validated for content');
    });
    
    it('should detect blob URLs', async () => {
      const result = await validateURL('blob:https://example.com/123-456-789');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Blob URLs are not persistent and cannot be validated');
    });
    
    it('should handle failed requests', async () => {
      // Mock failed response
      (fetch as jest.Mock).mockResolvedValueOnce(
        new Response(null, { status: 404 })
      );
      
      const result = await validateURL('https://example.com/not-found.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain('Request failed with status');
    });
    
    it('should handle network errors', async () => {
      // Mock network error
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));
      
      const result = await validateURL('https://example.com/error.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
    
    it('should handle timeouts', async () => {
      // Mock timeout
      (fetch as jest.Mock).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          setTimeout(() => {
            const error = new Error('Timeout');
            error.name = 'AbortError';
            reject(error);
          }, 10);
        });
      });
      
      const result = await validateURL('https://example.com/timeout.jpg', { timeout: 5 });
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Request timed out');
    });
    
    it('should validate media type when expected type is provided', async () => {
      // Mock image response for video URL
      (fetch as jest.Mock).mockResolvedValueOnce(
        new Response(null, {
          status: 200,
          headers: { 'content-type': 'video/mp4' }
        })
      );
      
      const result = await validateURL('https://example.com/video.mp4', {
        expectedType: MEDIA_TYPES.IMAGE
      });
      
      expect(result.isValid).toBe(false);
      expect(result.mediaType).toBe(MEDIA_TYPES.VIDEO);
      expect(result.error).toContain('Expected image, got video');
    });
    
    it('should skip content validation when validateContent is false', async () => {
      const result = await validateURL('https://example.com/image.jpg', {
        validateContent: false
      });
      
      expect(result.isValid).toBe(true);
      expect(result.mediaType).toBe(MEDIA_TYPES.IMAGE);
      expect(fetch).not.toHaveBeenCalled();
    });
  });
});