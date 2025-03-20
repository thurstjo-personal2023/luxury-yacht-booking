/**
 * URL Validator Test Suite
 * 
 * This file contains tests for the URL validation functionality.
 */
import axios from 'axios';
import { URLValidator } from '../functions/media-validation/url-validator';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Helper function to get a URL validator instance with mocked dependencies
function getUrlValidator() {
  return new URLValidator({
    logError: jest.fn(),
    logInfo: jest.fn(),
    isRelativeUrlPattern: /^\/[^\/].*/  // Matches URLs starting with a single slash
  });
}

describe('URLValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateURL', () => {
    it('should validate a good image URL', async () => {
      // Setup
      const validator = getUrlValidator();
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'image/jpeg' }
      });

      // Test
      const result = await validator.validateURL('https://example.com/image.jpg');

      // Verify
      expect(result.isValid).toBe(true);
      expect(result.status).toBe(200);
      expect(result.contentType).toBe('image/jpeg');
      expect(mockedAxios.get).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledWith('https://example.com/image.jpg', {
        responseType: 'arraybuffer',
        headers: expect.any(Object),
        validateStatus: expect.any(Function),
        timeout: expect.any(Number),
      });
    });

    it('should invalidate non-image content types', async () => {
      // Setup
      const validator = getUrlValidator();
      mockedAxios.get.mockResolvedValueOnce({
        status: 200,
        headers: { 'content-type': 'video/mp4' }
      });

      // Test
      const result = await validator.validateURL('https://example.com/video.mp4');

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Expected image');
      expect(result.status).toBe(200);
      expect(result.contentType).toBe('video/mp4');
    });

    it('should handle network errors', async () => {
      // Setup
      const validator = getUrlValidator();
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'));

      // Test
      const result = await validator.validateURL('https://example.com/broken-image.jpg');

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.status).toBeUndefined();
    });

    it('should handle HTTP errors', async () => {
      // Setup
      const validator = getUrlValidator();
      mockedAxios.get.mockResolvedValueOnce({
        status: 404,
        statusText: 'Not Found'
      });

      // Test
      const result = await validator.validateURL('https://example.com/missing-image.jpg');

      // Verify
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Not Found');
      expect(result.status).toBe(404);
    });
  });

  describe('isRelativeURL', () => {
    it('should identify relative URLs', () => {
      const validator = getUrlValidator();
      
      // Valid relative URLs
      expect(validator.isRelativeURL('/images/logo.png')).toBe(true);
      expect(validator.isRelativeURL('/assets/photos/beach.jpg')).toBe(true);
      
      // Invalid relative URLs (not starting with a single slash)
      expect(validator.isRelativeURL('//cdn.example.com/image.jpg')).toBe(false);
      expect(validator.isRelativeURL('https://example.com/image.jpg')).toBe(false);
      expect(validator.isRelativeURL('image.jpg')).toBe(false);
    });
  });

  describe('isAbsoluteURL', () => {
    it('should identify absolute URLs', () => {
      const validator = getUrlValidator();
      
      // Valid absolute URLs
      expect(validator.isAbsoluteURL('https://example.com/image.jpg')).toBe(true);
      expect(validator.isAbsoluteURL('http://subdomain.example.org/assets/logo.png')).toBe(true);
      
      // Invalid absolute URLs
      expect(validator.isAbsoluteURL('/images/logo.png')).toBe(false);
      expect(validator.isAbsoluteURL('image.jpg')).toBe(false);
    });
  });

  describe('normalizePotentialRelativeURL', () => {
    it('should convert relative URLs to absolute', () => {
      const validator = getUrlValidator();
      const baseUrl = 'https://example.com';
      
      // Convert relative to absolute
      expect(validator.normalizePotentialRelativeURL('/images/logo.png', baseUrl))
        .toBe('https://example.com/images/logo.png');
      
      // Leave absolute URLs unchanged
      expect(validator.normalizePotentialRelativeURL('https://cdn.example.org/logo.png', baseUrl))
        .toBe('https://cdn.example.org/logo.png');
    });
  });
});