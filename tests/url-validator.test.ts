/**
 * URL Validator Test Suite
 * 
 * This file contains tests for the URL validation functionality.
 */
import {
  validateUrl,
  validateImageUrl,
  validateVideoUrl,
  isValidUrlFormat,
  getPlaceholderUrl,
  ValidationResult
} from '../functions/media-validation/url-validator';

// Mock fetch to avoid actual network requests
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation((url: string, options: any) => {
    // Handle different test URLs
    if (url === 'https://example.com/valid-image.jpg') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'image/jpeg' : null
        }
      });
    } else if (url === 'https://example.com/valid-video.mp4') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'video/mp4' : null
        }
      });
    } else if (url === 'https://example.com/not-found.jpg') {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => null
        }
      });
    } else if (url === 'https://example.com/wrong-type.jpg') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'video/mp4' : null
        }
      });
    } else if (url === 'https://example.com/server-error.jpg') {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null
        }
      });
    } else if (url === 'https://example.com/timeout') {
      return Promise.reject(new Error('Network timeout'));
    } else {
      // Default response for other URLs
      return Promise.resolve({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        headers: {
          get: () => null
        }
      });
    }
  });
});

describe('URL Validator', () => {
  describe('isValidUrlFormat', () => {
    it('should validate proper URL formats', () => {
      expect(isValidUrlFormat('https://example.com/image.jpg')).toBe(true);
      expect(isValidUrlFormat('http://localhost:8080/image.jpg')).toBe(true);
      expect(isValidUrlFormat('https://sub.domain.com/path/to/image.jpg?param=value')).toBe(true);
    });

    it('should reject invalid URL formats', () => {
      expect(isValidUrlFormat('')).toBe(false);
      expect(isValidUrlFormat('not-a-url')).toBe(false);
      expect(isValidUrlFormat('/relative/path/image.jpg')).toBe(false);
    });
  });

  describe('validateUrl', () => {
    it('should validate accessible URLs', async () => {
      const result = await validateUrl('https://example.com/valid-image.jpg');
      expect(result.isValid).toBe(true);
      expect(result.url).toBe('https://example.com/valid-image.jpg');
      expect(result.status).toBe(200);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should reject inaccessible URLs', async () => {
      const result = await validateUrl('https://example.com/not-found.jpg');
      expect(result.isValid).toBe(false);
      expect(result.url).toBe('https://example.com/not-found.jpg');
      expect(result.status).toBe(404);
      expect(result.error).toContain('404');
    });

    it('should reject server errors', async () => {
      const result = await validateUrl('https://example.com/server-error.jpg');
      expect(result.isValid).toBe(false);
      expect(result.url).toBe('https://example.com/server-error.jpg');
      expect(result.status).toBe(500);
      expect(result.error).toContain('500');
    });

    it('should reject network errors', async () => {
      const result = await validateUrl('https://example.com/timeout');
      expect(result.isValid).toBe(false);
      expect(result.url).toBe('https://example.com/timeout');
      expect(result.error).toContain('Network timeout');
    });

    it('should reject invalid URL formats', async () => {
      const result = await validateUrl('/relative/path/image.jpg');
      expect(result.isValid).toBe(false);
      expect(result.url).toBe('/relative/path/image.jpg');
      expect(result.error).toContain('Invalid URL');
    });
  });

  describe('validateImageUrl', () => {
    it('should validate proper image URLs', async () => {
      const result = await validateImageUrl('https://example.com/valid-image.jpg');
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('image/jpeg');
    });

    it('should reject URLs with wrong content type', async () => {
      const result = await validateImageUrl('https://example.com/wrong-type.jpg');
      expect(result.isValid).toBe(false);
      expect(result.contentType).toBe('video/mp4');
      expect(result.error).toContain('Expected image');
    });

    it('should reject inaccessible URLs', async () => {
      const result = await validateImageUrl('https://example.com/not-found.jpg');
      expect(result.isValid).toBe(false);
    });
  });

  describe('validateVideoUrl', () => {
    it('should validate proper video URLs', async () => {
      const result = await validateVideoUrl('https://example.com/valid-video.mp4');
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should reject URLs with wrong content type', async () => {
      const result = await validateVideoUrl('https://example.com/valid-image.jpg');
      expect(result.isValid).toBe(false);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.error).toContain('Expected video');
    });

    it('should reject inaccessible URLs', async () => {
      const result = await validateVideoUrl('https://example.com/not-found.mp4');
      expect(result.isValid).toBe(false);
    });
  });

  describe('getPlaceholderUrl', () => {
    it('should return image placeholder for images', () => {
      const result = getPlaceholderUrl('https://example.com/broken.jpg', 'image');
      expect(result).toBe('/yacht-placeholder.jpg');
    });

    it('should return video placeholder for videos', () => {
      const result = getPlaceholderUrl('https://example.com/broken.mp4', 'video');
      expect(result).toBe('/yacht-video-placeholder.mp4');
    });
  });
});