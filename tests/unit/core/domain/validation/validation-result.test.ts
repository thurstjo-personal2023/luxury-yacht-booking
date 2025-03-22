/**
 * Validation Result Tests
 * 
 * Tests for the ValidationResult value object in the domain layer.
 */

import { ValidationResult } from '../../../../../core/domain/validation/validation-result';

describe('ValidationResult', () => {
  describe('constructor', () => {
    it('should create a valid validation result', () => {
      const props = {
        url: 'https://example.com/image.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/jpeg'
      };
      
      const result = new ValidationResult(props);
      
      expect(result.getUrl()).toBe(props.url);
      expect(result.getIsValid()).toBe(props.isValid);
      expect(result.getStatus()).toBe(props.status);
      expect(result.getStatusText()).toBe(props.statusText);
      expect(result.getContentType()).toBe(props.contentType);
      expect(result.getError()).toBeUndefined();
      expect(result.getValidatedAt()).toBeInstanceOf(Date);
    });
    
    it('should create an invalid validation result', () => {
      const props = {
        url: 'https://example.com/broken-image.jpg',
        isValid: false,
        status: 404,
        statusText: 'Not Found',
        error: 'Resource not found'
      };
      
      const result = new ValidationResult(props);
      
      expect(result.getUrl()).toBe(props.url);
      expect(result.getIsValid()).toBe(props.isValid);
      expect(result.getStatus()).toBe(props.status);
      expect(result.getStatusText()).toBe(props.statusText);
      expect(result.getContentType()).toBeUndefined();
      expect(result.getError()).toBe(props.error);
      expect(result.getValidatedAt()).toBeInstanceOf(Date);
    });
    
    it('should use the provided validation timestamp', () => {
      const validatedAt = new Date(2023, 0, 1); // January 1, 2023
      
      const result = new ValidationResult({
        url: 'https://example.com/image.jpg',
        isValid: true,
        validatedAt
      });
      
      expect(result.getValidatedAt()).toEqual(validatedAt);
    });
  });
  
  describe('createValid static method', () => {
    it('should create a valid validation result', () => {
      const url = 'https://example.com/image.jpg';
      const contentType = 'image/jpeg';
      const status = 200;
      const statusText = 'OK';
      
      const result = ValidationResult.createValid(url, contentType, status, statusText);
      
      expect(result.getUrl()).toBe(url);
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBe(contentType);
      expect(result.getStatus()).toBe(status);
      expect(result.getStatusText()).toBe(statusText);
      expect(result.getError()).toBeUndefined();
    });
    
    it('should create a valid validation result with minimal parameters', () => {
      const url = 'https://example.com/image.jpg';
      
      const result = ValidationResult.createValid(url);
      
      expect(result.getUrl()).toBe(url);
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBeUndefined();
      expect(result.getStatus()).toBeUndefined();
      expect(result.getStatusText()).toBeUndefined();
    });
  });
  
  describe('createInvalid static method', () => {
    it('should create an invalid validation result', () => {
      const url = 'https://example.com/broken-image.jpg';
      const error = 'Resource not found';
      const status = 404;
      const statusText = 'Not Found';
      
      const result = ValidationResult.createInvalid(url, error, status, statusText);
      
      expect(result.getUrl()).toBe(url);
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe(error);
      expect(result.getStatus()).toBe(status);
      expect(result.getStatusText()).toBe(statusText);
    });
    
    it('should create an invalid validation result with content type', () => {
      const url = 'https://example.com/wrong-type.jpg';
      const error = 'Content type mismatch';
      const contentType = 'application/pdf';
      
      const result = ValidationResult.createInvalid(url, error, undefined, undefined, contentType);
      
      expect(result.getUrl()).toBe(url);
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe(error);
      expect(result.getContentType()).toBe(contentType);
    });
    
    it('should create an invalid validation result with minimal parameters', () => {
      const url = 'https://example.com/broken-image.jpg';
      const error = 'Invalid URL';
      
      const result = ValidationResult.createInvalid(url, error);
      
      expect(result.getUrl()).toBe(url);
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe(error);
      expect(result.getStatus()).toBeUndefined();
      expect(result.getStatusText()).toBeUndefined();
      expect(result.getContentType()).toBeUndefined();
    });
  });
  
  describe('getter methods', () => {
    let result: ValidationResult;
    
    beforeEach(() => {
      result = new ValidationResult({
        url: 'https://example.com/image.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/jpeg',
        error: 'Some error',
        validatedAt: new Date(2023, 0, 1)
      });
    });
    
    it('should return the correct url', () => {
      expect(result.getUrl()).toBe('https://example.com/image.jpg');
    });
    
    it('should return the correct validity', () => {
      expect(result.getIsValid()).toBe(true);
    });
    
    it('should return the correct status', () => {
      expect(result.getStatus()).toBe(200);
    });
    
    it('should return the correct status text', () => {
      expect(result.getStatusText()).toBe('OK');
    });
    
    it('should return the correct content type', () => {
      expect(result.getContentType()).toBe('image/jpeg');
    });
    
    it('should return the correct error', () => {
      expect(result.getError()).toBe('Some error');
    });
    
    it('should return the correct validation timestamp', () => {
      expect(result.getValidatedAt()).toEqual(new Date(2023, 0, 1));
    });
  });
  
  describe('toObject method', () => {
    it('should return a plain object representation', () => {
      const validatedAt = new Date();
      const props = {
        url: 'https://example.com/image.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/jpeg',
        error: 'Some error',
        validatedAt
      };
      
      const result = new ValidationResult(props);
      const obj = result.toObject();
      
      expect(obj).toEqual(props);
    });
  });
});