/**
 * Document Validation Result Tests
 * 
 * Tests for the DocumentValidationResult value object in the domain layer.
 */

import { DocumentValidationResult } from '../../../../../core/domain/validation/document-validation-result';
import { ValidationResult } from '../../../../../core/domain/validation/validation-result';

describe('DocumentValidationResult', () => {
  describe('constructor', () => {
    it('should create a document validation result with all valid fields', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/jpeg'
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/image2.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/png'
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      expect(result.getCollection()).toBe('yachts');
      expect(result.getDocumentId()).toBe('yacht-123');
      expect(result.getTotalUrls()).toBe(2);
      expect(result.getValidUrls()).toBe(2);
      expect(result.getInvalidUrls()).toBe(0);
      expect(result.getMissingUrls()).toBe(0);
      expect(result.hasInvalidUrls()).toBe(false);
      expect(result.getInvalidFields()).toEqual([]);
      expect(result.getValidatedAt()).toBeInstanceOf(Date);
    });
    
    it('should create a document validation result with some invalid fields', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true,
        status: 200,
        statusText: 'OK',
        contentType: 'image/jpeg'
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/broken.jpg',
        isValid: false,
        status: 404,
        statusText: 'Not Found',
        error: 'Resource not found'
      });
      
      fields.set('coverImage.url', {
        url: 'https://example.com/video.mp4',
        isValid: false,
        status: 200,
        statusText: 'OK',
        contentType: 'video/mp4',
        error: 'Expected image, got video/mp4'
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      expect(result.getTotalUrls()).toBe(3);
      expect(result.getValidUrls()).toBe(1);
      expect(result.getInvalidUrls()).toBe(2);
      expect(result.getMissingUrls()).toBe(0);
      expect(result.hasInvalidUrls()).toBe(true);
      
      const invalidFields = result.getInvalidFields();
      expect(invalidFields).toHaveLength(2);
      expect(invalidFields[0].field).toBe('media.1.url');
      expect(invalidFields[0].url).toBe('https://example.com/broken.jpg');
      expect(invalidFields[0].error).toBe('Resource not found');
      
      expect(invalidFields[1].field).toBe('coverImage.url');
      expect(invalidFields[1].url).toBe('https://example.com/video.mp4');
      expect(invalidFields[1].contentType).toBe('video/mp4');
      expect(invalidFields[1].error).toBe('Expected image, got video/mp4');
    });
    
    it('should use the provided validation timestamp', () => {
      const fields = new Map();
      fields.set('media.0.url', {
        url: 'https://example.com/image.jpg',
        isValid: true
      });
      
      const validatedAt = new Date(2023, 0, 1); // January 1, 2023
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields,
        validatedAt
      });
      
      expect(result.getValidatedAt()).toEqual(validatedAt);
    });
  });
  
  describe('getFields method', () => {
    it('should return all validation results as ValidationResult objects', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true,
        status: 200
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/broken.jpg',
        isValid: false,
        error: 'Resource not found'
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      const resultsMap = result.getFields();
      
      expect(resultsMap.size).toBe(2);
      expect(resultsMap.get('media.0.url')).toBeInstanceOf(ValidationResult);
      expect(resultsMap.get('media.1.url')).toBeInstanceOf(ValidationResult);
      
      expect(resultsMap.get('media.0.url')?.getIsValid()).toBe(true);
      expect(resultsMap.get('media.1.url')?.getIsValid()).toBe(false);
    });
  });
  
  describe('getInvalidFields method', () => {
    it('should return an array of invalid field results', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/broken.jpg',
        isValid: false,
        status: 404,
        error: 'Resource not found'
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      const invalidFields = result.getInvalidFields();
      
      expect(invalidFields).toHaveLength(1);
      expect(invalidFields[0]).toEqual({
        field: 'media.1.url',
        url: 'https://example.com/broken.jpg',
        isValid: false,
        status: 404,
        error: 'Resource not found'
      });
    });
    
    it('should return an empty array when there are no invalid fields', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      const invalidFields = result.getInvalidFields();
      
      expect(invalidFields).toEqual([]);
    });
  });
  
  describe('toObject method', () => {
    it('should return a plain object representation', () => {
      const validatedAt = new Date();
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true,
        status: 200,
        contentType: 'image/jpeg'
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/broken.jpg',
        isValid: false,
        error: 'Resource not found'
      });
      
      const result = new DocumentValidationResult({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields,
        validatedAt
      });
      
      const obj = result.toObject();
      
      expect(obj.collection).toBe('yachts');
      expect(obj.documentId).toBe('yacht-123');
      expect(obj.validatedAt).toEqual(validatedAt);
      expect(obj.totalUrls).toBe(2);
      expect(obj.validUrls).toBe(1);
      expect(obj.invalidUrls).toBe(1);
      expect(obj.missingUrls).toBe(0);
      
      // Check that fields are transformed correctly
      expect(obj.fields).toHaveLength(2);
      expect(obj.fields[0]).toHaveProperty('field');
      expect(obj.fields[0]).toHaveProperty('url');
      expect(obj.fields[0]).toHaveProperty('isValid');
      
      // Check that invalidFields is populated correctly
      expect(obj.invalidFields).toHaveLength(1);
      expect(obj.invalidFields[0].field).toBe('media.1.url');
      expect(obj.invalidFields[0].url).toBe('https://example.com/broken.jpg');
      expect(obj.invalidFields[0].isValid).toBe(false);
      expect(obj.invalidFields[0].error).toBe('Resource not found');
    });
  });
});