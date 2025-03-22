/**
 * Document Validation Result Tests
 * 
 * Tests for the DocumentValidationResult value object in the domain layer.
 */

const { DocumentValidationResult } = require('../../../../../core/domain/validation/document-validation-result.cjs');

describe('DocumentValidationResult', () => {
  describe('create function', () => {
    test('should create a document validation result with all valid fields', () => {
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
      
      const result = DocumentValidationResult.create({
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
    
    test('should create a document validation result with some invalid fields', () => {
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
      
      const result = DocumentValidationResult.create({
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
    
    test('should use the provided validation timestamp', () => {
      const fields = new Map();
      fields.set('media.0.url', {
        url: 'https://example.com/image.jpg',
        isValid: true
      });
      
      const validatedAt = new Date(2023, 0, 1); // January 1, 2023
      
      const result = DocumentValidationResult.create({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields,
        validatedAt
      });
      
      expect(result.getValidatedAt()).toEqual(validatedAt);
    });
  });
  
  describe('getFields method', () => {
    test('should return all validation results', () => {
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
      
      const result = DocumentValidationResult.create({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      const resultsMap = result.getFields();
      
      expect(resultsMap.size).toBe(2);
      expect(resultsMap.get('media.0.url')).toBeDefined();
      expect(resultsMap.get('media.1.url')).toBeDefined();
      
      expect(resultsMap.get('media.0.url').isValid).toBe(true);
      expect(resultsMap.get('media.1.url').isValid).toBe(false);
    });
  });
  
  describe('getInvalidFields method', () => {
    test('should return an array of invalid field results', () => {
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
      
      const result = DocumentValidationResult.create({
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
    
    test('should return an empty array when there are no invalid fields', () => {
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image1.jpg',
        isValid: true
      });
      
      const result = DocumentValidationResult.create({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields
      });
      
      const invalidFields = result.getInvalidFields();
      
      expect(invalidFields).toEqual([]);
    });
  });
  
  describe('toObject method', () => {
    test('should return a plain object representation', () => {
      const validatedAt = new Date();
      const fields = new Map();
      
      fields.set('media.0.url', {
        url: 'https://example.com/image.jpg',
        isValid: true,
        status: 200
      });
      
      fields.set('media.1.url', {
        url: 'https://example.com/broken.jpg',
        isValid: false,
        status: 404,
        error: 'Not found'
      });
      
      const result = DocumentValidationResult.create({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields,
        validatedAt
      });
      
      const obj = result.toObject();
      
      expect(obj).toEqual({
        collection: 'yachts',
        documentId: 'yacht-123',
        validatedAt: validatedAt,
        totalUrls: 2,
        validUrls: 1,
        invalidUrls: 1,
        missingUrls: 0,
        fields: {
          'media.0.url': result.getFields().get('media.0.url'),
          'media.1.url': result.getFields().get('media.1.url')
        },
        invalidFields: [{
          field: 'media.1.url',
          url: 'https://example.com/broken.jpg',
          isValid: false,
          status: 404,
          error: 'Not found'
        }]
      });
    });
  });
  
  describe('fromObject method', () => {
    test('should recreate a document validation result from an object', () => {
      const originalFields = new Map();
      originalFields.set('media.0.url', {
        url: 'https://example.com/image.jpg',
        isValid: true
      });
      
      const original = DocumentValidationResult.create({
        collection: 'yachts',
        documentId: 'yacht-123',
        fields: originalFields
      });
      
      const obj = original.toObject();
      const recreated = DocumentValidationResult.fromObject(obj);
      
      expect(recreated.getCollection()).toBe(original.getCollection());
      expect(recreated.getDocumentId()).toBe(original.getDocumentId());
      expect(recreated.getTotalUrls()).toBe(original.getTotalUrls());
      expect(recreated.getValidUrls()).toBe(original.getValidUrls());
      expect(recreated.getInvalidUrls()).toBe(original.getInvalidUrls());
      expect(recreated.hasInvalidUrls()).toBe(original.hasInvalidUrls());
    });
  });
});