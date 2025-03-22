/**
 * Media Validator Tests
 * 
 * Tests for the MediaValidator domain service.
 */

import { MediaType } from '../../../../../core/domain/media/media-type';
import { MediaValidator, MediaValidationOptions, DEFAULT_VALIDATION_OPTIONS } from '../../../../../core/domain/validation/media-validator';
import { ValidationResult } from '../../../../../core/domain/validation/validation-result';

describe('MediaValidator', () => {
  let validator: MediaValidator;
  
  beforeEach(() => {
    validator = new MediaValidator();
  });
  
  describe('constructor', () => {
    it('should create a validator with default options', () => {
      expect(validator.getOptions()).toEqual(DEFAULT_VALIDATION_OPTIONS);
    });
    
    it('should create a validator with custom options', () => {
      const options: MediaValidationOptions = {
        checkContentType: false,
        allowRelativeUrls: true,
        allowBlobUrls: true,
        expectedType: MediaType.VIDEO,
        maxRetries: 5,
        timeout: 20000,
        baseUrl: 'https://example.com'
      };
      
      validator = new MediaValidator(options);
      
      expect(validator.getOptions()).toEqual({
        ...DEFAULT_VALIDATION_OPTIONS,
        ...options
      });
    });
    
    it('should override only specified options', () => {
      const options: MediaValidationOptions = {
        allowRelativeUrls: true,
        timeout: 5000
      };
      
      validator = new MediaValidator(options);
      
      expect(validator.getOptions()).toEqual({
        ...DEFAULT_VALIDATION_OPTIONS,
        allowRelativeUrls: true,
        timeout: 5000
      });
    });
  });
  
  describe('setOptions method', () => {
    it('should update validation options', () => {
      validator.setOptions({
        allowRelativeUrls: true,
        maxRetries: 5
      });
      
      expect(validator.getOptions()).toEqual({
        ...DEFAULT_VALIDATION_OPTIONS,
        allowRelativeUrls: true,
        maxRetries: 5
      });
    });
    
    it('should maintain existing options when updating', () => {
      validator = new MediaValidator({
        checkContentType: false,
        allowBlobUrls: true
      });
      
      validator.setOptions({
        allowRelativeUrls: true,
        timeout: 15000
      });
      
      expect(validator.getOptions()).toEqual({
        ...DEFAULT_VALIDATION_OPTIONS,
        checkContentType: false,
        allowBlobUrls: true,
        allowRelativeUrls: true,
        timeout: 15000
      });
    });
  });
  
  describe('validateUrl method', () => {
    it('should invalidate empty URLs', async () => {
      const result = await validator.validateUrl('');
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Empty URL');
    });
    
    it('should invalidate relative URLs by default', async () => {
      const result = await validator.validateUrl('/path/to/image.jpg');
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Invalid URL');
    });
    
    it('should validate relative URLs when allowed', async () => {
      validator = new MediaValidator({ allowRelativeUrls: true });
      
      const result = await validator.validateUrl('/assets/images/placeholder.jpg');
      
      expect(result.getIsValid()).toBe(true);
    });
    
    it('should invalidate blob URLs by default', async () => {
      const result = await validator.validateUrl('blob:https://example.com/1234-5678-9abc');
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Blob URL not allowed');
    });
    
    it('should validate blob URLs when allowed', async () => {
      validator = new MediaValidator({ allowBlobUrls: true });
      
      const result = await validator.validateUrl('blob:https://example.com/1234-5678-9abc');
      
      // Even if allowed, the validator might not be able to validate content
      // We're just checking that it's not immediately rejected
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).not.toBe('Blob URL not allowed');
    });
    
    it('should validate valid absolute URLs', async () => {
      const result = await validator.validateUrl('https://example.com/image.jpg');
      
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBe('image/jpeg');
      expect(result.getStatus()).toBe(200);
      expect(result.getStatusText()).toBe('OK');
    });
    
    it('should invalidate URLs with invalid patterns', async () => {
      const result = await validator.validateUrl('https://example.com/broken-image.jpg');
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('URL validation failed');
      expect(result.getStatus()).toBe(404);
      expect(result.getStatusText()).toBe('Not Found');
    });
    
    it('should check media type matches when expected type is provided', async () => {
      // Test with expected image type but URL suggesting video
      const result = await validator.validateUrl(
        'https://example.com/video.mp4', 
        MediaType.IMAGE
      );
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Expected image, got video');
      expect(result.getStatus()).toBe(200);
      expect(result.getContentType()).toBe('video/mp4');
    });
    
    it('should validate when media type matches expected type', async () => {
      const result = await validator.validateUrl(
        'https://example.com/video.mp4', 
        MediaType.VIDEO
      );
      
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBe('video/mp4');
    });
    
    it('should handle exceptions during validation', async () => {
      // Mock the fetch to throw an error
      const originalValidateUrl = MediaValidator.prototype.validateUrl;
      MediaValidator.prototype.validateUrl = jest.fn().mockImplementation(async () => {
        throw new Error('Network error');
      });
      
      const result = await validator.validateUrl('https://example.com/image.jpg');
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toContain('Network error');
      
      // Restore the original method
      MediaValidator.prototype.validateUrl = originalValidateUrl;
    });
  });
});