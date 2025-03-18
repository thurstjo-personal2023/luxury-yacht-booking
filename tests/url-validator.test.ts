/**
 * URL Validator Test Suite
 * 
 * This file contains tests for the URL validation functionality.
 */

import { isRelativeUrl, resolveRelativeUrl, validateUrl } from '../scripts/url-validator';

// Define test URLs
const TEST_URLS = {
  valid: {
    absolute: [
      'https://storage.googleapis.com/etoile-yachts.appspot.com/yachts/yacht1.jpg',
      'https://firebasestorage.googleapis.com/v0/b/etoile-yachts.appspot.com/o/yachts%2Fyacht2.jpg',
      'https://www.example.com/images/test.png'
    ],
    relative: [
      '/assets/images/yacht-placeholder.jpg',
      '/images/profile-placeholder.jpg',
      '/static/media/logo.svg'
    ]
  },
  invalid: {
    blob: [
      'blob:https://etoile-yachts.replit.app/12345-67890',
      'blob://invalid-blob-url'
    ],
    missing: [
      'https://storage.googleapis.com/etoile-yachts.appspot.com/nonexistent.jpg',
      'https://invalid-domain.example/image.jpg',
      '/nonexistent/path.jpg'
    ],
    malformed: [
      'not-a-url',
      'http:/missing-slash.com',
      'ftp:only-scheme'
    ]
  }
};

// Mock fetch for URL validation
global.fetch = jest.fn().mockImplementation((url) => {
  // Absolute valid URLs
  if (TEST_URLS.valid.absolute.includes(url)) {
    return Promise.resolve({
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: {
        get: (name: string) => {
          if (name.toLowerCase() === 'content-type') {
            return url.endsWith('.jpg') || url.endsWith('.png') 
              ? 'image/jpeg' 
              : url.endsWith('.svg') 
                ? 'image/svg+xml' 
                : 'application/octet-stream';
          }
          return null;
        }
      }
    });
  }
  
  // Resolved relative URLs (with base URL)
  for (const relativeUrl of TEST_URLS.valid.relative) {
    if (url.endsWith(relativeUrl)) {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => {
            if (name.toLowerCase() === 'content-type') {
              return relativeUrl.endsWith('.jpg') || relativeUrl.endsWith('.png') 
                ? 'image/jpeg' 
                : relativeUrl.endsWith('.svg') 
                  ? 'image/svg+xml' 
                  : 'application/octet-stream';
            }
            return null;
          }
        }
      });
    }
  }
  
  // Invalid URLs - missing resources
  if (TEST_URLS.invalid.missing.includes(url) || 
      url.includes('nonexistent') || 
      url.includes('invalid-domain')) {
    return Promise.resolve({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: {
        get: () => null
      }
    });
  }
  
  // Blob URLs and malformed URLs
  if (TEST_URLS.invalid.blob.includes(url) || TEST_URLS.invalid.malformed.includes(url)) {
    return Promise.reject(new Error('Invalid URL'));
  }
  
  // Default - unknown URL
  return Promise.resolve({
    ok: false,
    status: 400,
    statusText: 'Bad Request',
    headers: {
      get: () => null
    }
  });
}) as jest.Mock;

describe('URL Validator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  describe('isRelativeUrl', () => {
    it('should correctly identify relative URLs', () => {
      // Test relative URLs
      TEST_URLS.valid.relative.forEach(url => {
        expect(isRelativeUrl(url)).toBe(true);
      });
      
      // Test absolute URLs (should not be identified as relative)
      TEST_URLS.valid.absolute.forEach(url => {
        expect(isRelativeUrl(url)).toBe(false);
      });
      
      // Test blob URLs (should not be identified as relative)
      TEST_URLS.invalid.blob.forEach(url => {
        expect(isRelativeUrl(url)).toBe(false);
      });
      
      // Test edge cases
      expect(isRelativeUrl(null as any)).toBe(false);
      expect(isRelativeUrl(undefined as any)).toBe(false);
      expect(isRelativeUrl('')).toBe(false);
      expect(isRelativeUrl('//protocol-relative.com')).toBe(false);
    });
  });
  
  describe('resolveRelativeUrl', () => {
    it('should resolve relative URLs to absolute URLs', () => {
      // Set up test base URL
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://etoile-yachts.replit.app';
      
      // Test relative URLs
      TEST_URLS.valid.relative.forEach(url => {
        const resolvedUrl = resolveRelativeUrl(url);
        expect(resolvedUrl).toBe(`https://etoile-yachts.replit.app${url}`);
      });
      
      // Test absolute URLs (should not be modified)
      TEST_URLS.valid.absolute.forEach(url => {
        const resolvedUrl = resolveRelativeUrl(url);
        expect(resolvedUrl).toBe(url);
      });
      
      // Clean up
      process.env.BASE_URL = originalBaseUrl;
    });
  });
  
  describe('validateUrl', () => {
    it('should validate URLs and return appropriate results', async () => {
      // Set up test base URL
      const originalBaseUrl = process.env.BASE_URL;
      process.env.BASE_URL = 'https://etoile-yachts.replit.app';
      
      // Test valid absolute URLs
      for (const url of TEST_URLS.valid.absolute) {
        const result = await validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.status).toContain('200');
      }
      
      // Test valid relative URLs
      for (const url of TEST_URLS.valid.relative) {
        const result = await validateUrl(url);
        expect(result.valid).toBe(true);
        expect(result.status).toContain('200');
        expect(result.url).toBe(`https://etoile-yachts.replit.app${url}`);
      }
      
      // Test invalid URLs - missing resources
      for (const url of TEST_URLS.invalid.missing) {
        const result = await validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.status).toContain('404');
      }
      
      // Test invalid URLs - blob URLs
      for (const url of TEST_URLS.invalid.blob) {
        const result = await validateUrl(url);
        expect(result.valid).toBe(false);
        expect(result.error).toBeTruthy();
      }
      
      // Test content type validation
      const imageUrl = TEST_URLS.valid.absolute[0]; // Image URL
      
      // Valid when expecting image
      const imageResult = await validateUrl(imageUrl, {
        allowedContentTypes: ['image/']
      });
      expect(imageResult.valid).toBe(true);
      
      // Invalid when expecting video
      const videoResult = await validateUrl(imageUrl, {
        allowedContentTypes: ['video/']
      });
      expect(videoResult.valid).toBe(false);
      expect(videoResult.contentTypeValid).toBe(false);
      
      // Clean up
      process.env.BASE_URL = originalBaseUrl;
    });
    
    it('should handle empty URLs', async () => {
      const result = await validateUrl('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('empty');
    });
    
    it('should handle fetch errors', async () => {
      // Mock fetch to throw an error
      (global.fetch as jest.Mock).mockImplementationOnce(() => {
        throw new Error('Network error');
      });
      
      const result = await validateUrl('https://error-url.com/image.jpg');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });
});