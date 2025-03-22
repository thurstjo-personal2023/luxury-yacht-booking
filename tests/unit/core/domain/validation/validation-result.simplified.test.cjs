/**
 * Validation Result Tests (CommonJS Version)
 * 
 * Tests for the ValidationResult domain module.
 */

const { ValidationResult } = require('../../../../../core/domain/validation/validation-result.cjs');

describe('ValidationResult', () => {
  describe('valid function', () => {
    test('should create a valid result with correct structure', () => {
      const result = ValidationResult.valid(
        'https://example.com/image.jpg', 
        'media.url',
        'yachts',
        'yacht123'
      );
      
      expect(result).toEqual({
        url: 'https://example.com/image.jpg',
        field: 'media.url',
        collectionId: 'yachts',
        documentId: 'yacht123',
        isValid: true,
        status: 200,
        statusText: 'OK',
        error: null,
        contentType: null
      });
    });
  });
  
  describe('invalid function', () => {
    test('should create an invalid result with error details', () => {
      const result = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123',
        404,
        'Not Found',
        'Image not found',
        null
      );
      
      expect(result).toEqual({
        url: 'https://example.com/broken.jpg',
        field: 'media.url',
        collectionId: 'yachts',
        documentId: 'yacht123',
        isValid: false,
        status: 404,
        statusText: 'Not Found',
        error: 'Image not found',
        contentType: null
      });
    });
    
    test('should handle missing optional parameters', () => {
      const result = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Unknown error');
      expect(result.status).toBeNull();
      expect(result.statusText).toBeNull();
    });
  });
  
  describe('isValid function', () => {
    test('should return true for valid results', () => {
      const validResult = ValidationResult.valid(
        'https://example.com/image.jpg', 
        'media.url',
        'yachts',
        'yacht123'
      );
      
      expect(ValidationResult.isValid(validResult)).toBe(true);
    });
    
    test('should return false for invalid results', () => {
      const invalidResult = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123',
        404,
        'Not Found',
        'Image not found'
      );
      
      expect(ValidationResult.isValid(invalidResult)).toBe(false);
    });
    
    test('should handle null or undefined input', () => {
      expect(ValidationResult.isValid(null)).toBe(false);
      expect(ValidationResult.isValid(undefined)).toBe(false);
    });
  });
  
  describe('getErrorMessage function', () => {
    test('should return null for valid results', () => {
      const validResult = ValidationResult.valid(
        'https://example.com/image.jpg', 
        'media.url',
        'yachts',
        'yacht123'
      );
      
      expect(ValidationResult.getErrorMessage(validResult)).toBeNull();
    });
    
    test('should return formatted status message when available', () => {
      const invalidResult = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123',
        404,
        'Not Found',
        'Image not found'
      );
      
      expect(ValidationResult.getErrorMessage(invalidResult)).toBe('404 Not Found');
    });
    
    test('should return error message when status is not available', () => {
      const invalidResult = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123',
        null,
        null,
        'Content type mismatch'
      );
      
      expect(ValidationResult.getErrorMessage(invalidResult)).toBe('Content type mismatch');
    });
    
    test('should return unknown error when no details available', () => {
      const invalidResult = ValidationResult.invalid(
        'https://example.com/broken.jpg',
        'media.url',
        'yachts',
        'yacht123',
        null,
        null,
        null
      );
      
      expect(ValidationResult.getErrorMessage(invalidResult)).toBe('Unknown error');
    });
  });
});