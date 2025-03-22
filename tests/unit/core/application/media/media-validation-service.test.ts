/**
 * Media Validation Service Tests
 * 
 * Tests for the MediaValidationService in the application layer.
 */

import { MediaType } from '../../../../../core/domain/media/media-type';
import { ValidationResult } from '../../../../../core/domain/validation/validation-result';
import { DocumentValidationResult } from '../../../../../core/domain/validation/document-validation-result';
import { ValidationReport } from '../../../../../core/domain/validation/validation-report';
import { MediaValidationService, DEFAULT_SERVICE_OPTIONS } from '../../../../../core/application/media/media-validation-service';
import { IMediaRepository } from '../../../../../adapters/repositories/interfaces/media-repository';

// Mock the UUID library to return a consistent ID for testing
jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('test-uuid-1234')
}));

describe('MediaValidationService', () => {
  // Mock media repository
  let mockRepository: jest.Mocked<IMediaRepository>;
  let service: MediaValidationService;
  
  beforeEach(() => {
    // Create a mock repository
    mockRepository = {
      validateUrl: jest.fn(),
      validateDocument: jest.fn(),
      getCollections: jest.fn(),
      getDocumentIds: jest.fn(),
      saveValidationReport: jest.fn(),
      getValidationReport: jest.fn(),
      repairDocument: jest.fn()
    } as jest.Mocked<IMediaRepository>;
    
    // Create the service with the mock repository
    service = new MediaValidationService(mockRepository);
  });
  
  describe('constructor', () => {
    it('should create service with default options', () => {
      expect(service['options']).toEqual(DEFAULT_SERVICE_OPTIONS);
    });
    
    it('should create service with custom options', () => {
      const customOptions = {
        batchSize: 25,
        maxDocumentsPerCollection: 500,
        includeCollections: ['yachts', 'users'],
        excludeCollections: ['logs', 'temp']
      };
      
      service = new MediaValidationService(mockRepository, customOptions);
      
      expect(service['options']).toEqual({
        ...DEFAULT_SERVICE_OPTIONS,
        ...customOptions
      });
    });
  });
  
  describe('validateUrl', () => {
    it('should call repository validateUrl method', async () => {
      const url = 'https://example.com/image.jpg';
      const expectedValidation = ValidationResult.createValid(url, 'image/jpeg', 200, 'OK');
      
      mockRepository.validateUrl.mockResolvedValue(expectedValidation);
      
      const result = await service.validateUrl(url);
      
      expect(mockRepository.validateUrl).toHaveBeenCalledWith(url, MediaType.IMAGE);
      expect(result).toEqual(expectedValidation);
    });
    
    it('should handle errors during validation', async () => {
      const url = 'https://example.com/broken.jpg';
      
      mockRepository.validateUrl.mockRejectedValue(new Error('Network error'));
      
      const result = await service.validateUrl(url);
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Network error');
    });
  });
  
  describe('validateDocument', () => {
    it('should call repository validateDocument method', async () => {
      const collection = 'yachts';
      const documentId = 'yacht-123';
      
      const mockResult = {
        collection,
        documentId,
        fields: new Map(),
        validatedAt: new Date()
      };
      
      mockRepository.validateDocument.mockResolvedValue(new DocumentValidationResult(mockResult));
      
      const result = await service.validateDocument(collection, documentId);
      
      expect(mockRepository.validateDocument).toHaveBeenCalledWith(collection, documentId);
      expect(result).toBeInstanceOf(DocumentValidationResult);
      expect(result.getCollection()).toBe(collection);
      expect(result.getDocumentId()).toBe(documentId);
    });
    
    it('should handle errors during document validation', async () => {
      const collection = 'yachts';
      const documentId = 'yacht-123';
      
      mockRepository.validateDocument.mockRejectedValue(new Error('Validation error'));
      
      const result = await service.validateDocument(collection, documentId);
      
      expect(result).toBeInstanceOf(DocumentValidationResult);
      expect(result.getCollection()).toBe(collection);
      expect(result.getDocumentId()).toBe(documentId);
      expect(result.getTotalUrls()).toBe(0);
    });
  });
  
  describe('validateAllCollections', () => {
    beforeEach(() => {
      // Setup basic mocks
      mockRepository.getCollections.mockResolvedValue(['yachts', 'users', 'logs']);
      mockRepository.getDocumentIds.mockImplementation(async (collection) => {
        if (collection === 'yachts') return ['yacht-1', 'yacht-2'];
        if (collection === 'users') return ['user-1', 'user-2', 'user-3'];
        if (collection === 'logs') return ['log-1', 'log-2', 'log-3', 'log-4'];
        return [];
      });
      
      mockRepository.validateDocument.mockImplementation(async (collection, documentId) => {
        const fields = new Map();
        fields.set('coverImage', {
          url: 'https://example.com/image.jpg',
          isValid: true,
          status: 200,
          statusText: 'OK',
          contentType: 'image/jpeg'
        });
        
        return new DocumentValidationResult({
          collection,
          documentId,
          fields
        });
      });
      
      mockRepository.saveValidationReport.mockResolvedValue(true);
    });
    
    it('should validate all collections and documents', async () => {
      const report = await service.validateAllCollections();
      
      expect(mockRepository.getCollections).toHaveBeenCalled();
      expect(mockRepository.getDocumentIds).toHaveBeenCalledTimes(3);
      expect(mockRepository.validateDocument).toHaveBeenCalledTimes(9); // 2 + 3 + 4 = 9 documents
      expect(mockRepository.saveValidationReport).toHaveBeenCalled();
      
      expect(report).toBeInstanceOf(ValidationReport);
      expect(report.totalDocuments).toBe(9);
      expect(report.validUrls).toBe(9); // All validations return 1 valid URL
      expect(report.invalidUrls).toBe(0);
      expect(report.collectionSummaries).toHaveLength(3);
    });
    
    it('should respect includeCollections option', async () => {
      service = new MediaValidationService(mockRepository, {
        includeCollections: ['yachts']
      });
      
      const report = await service.validateAllCollections();
      
      expect(mockRepository.getDocumentIds).toHaveBeenCalledTimes(1);
      expect(mockRepository.getDocumentIds).toHaveBeenCalledWith('yachts', DEFAULT_SERVICE_OPTIONS.maxDocumentsPerCollection);
      expect(mockRepository.validateDocument).toHaveBeenCalledTimes(2); // Only 2 yacht documents
      
      expect(report.totalDocuments).toBe(2);
      expect(report.collectionSummaries).toHaveLength(1);
      expect(report.collectionSummaries[0].collection).toBe('yachts');
    });
    
    it('should respect excludeCollections option', async () => {
      service = new MediaValidationService(mockRepository, {
        excludeCollections: ['logs']
      });
      
      const report = await service.validateAllCollections();
      
      expect(mockRepository.getDocumentIds).toHaveBeenCalledTimes(2);
      expect(mockRepository.getDocumentIds).toHaveBeenCalledWith('yachts', DEFAULT_SERVICE_OPTIONS.maxDocumentsPerCollection);
      expect(mockRepository.getDocumentIds).toHaveBeenCalledWith('users', DEFAULT_SERVICE_OPTIONS.maxDocumentsPerCollection);
      expect(mockRepository.validateDocument).toHaveBeenCalledTimes(5); // 2 yachts + 3 users
      
      expect(report.totalDocuments).toBe(5);
      expect(report.collectionSummaries).toHaveLength(2);
    });
    
    it('should process documents in batches', async () => {
      // Setup repository to return lots of documents for one collection
      mockRepository.getDocumentIds.mockImplementation(async (collection) => {
        if (collection === 'yachts') {
          // Return more documents than the batch size
          return Array.from({ length: 120 }, (_, i) => `yacht-${i}`);
        }
        return [];
      });
      
      // Set a smaller batch size
      service = new MediaValidationService(mockRepository, {
        batchSize: 25,
        includeCollections: ['yachts']
      });
      
      const report = await service.validateAllCollections();
      
      expect(mockRepository.validateDocument).toHaveBeenCalledTimes(120);
      expect(report.totalDocuments).toBe(120);
    });
    
    it('should handle errors and still generate a partial report', async () => {
      // Make one collection fail
      mockRepository.getDocumentIds.mockImplementation(async (collection) => {
        if (collection === 'yachts') return ['yacht-1', 'yacht-2'];
        if (collection === 'users') throw new Error('Failed to get user documents');
        return [];
      });
      
      const report = await service.validateAllCollections();
      
      expect(mockRepository.validateDocument).toHaveBeenCalledTimes(2); // Only yacht documents
      expect(report).toBeInstanceOf(ValidationReport);
      expect(report.totalDocuments).toBe(2);
    });
  });
  
  describe('repairInvalidMediaUrls', () => {
    beforeEach(() => {
      // Setup mocks for report retrieval
      mockRepository.getValidationReport.mockResolvedValue({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 5000,
        totalDocuments: 10,
        totalFields: 20,
        validUrls: 15,
        invalidUrls: 5,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: [
          {
            field: 'coverImage',
            url: '/relative-image.jpg',
            isValid: false,
            error: 'Invalid URL',
            collection: 'yachts',
            documentId: 'yacht-123'
          },
          {
            field: 'gallery.0.url',
            url: 'blob:https://example.com/1234-5678',
            isValid: false,
            error: 'Blob URL not allowed',
            collection: 'yachts',
            documentId: 'yacht-123'
          },
          {
            field: 'media.1.url',
            url: 'https://example.com/video.mp4',
            isValid: false,
            status: 200,
            statusText: 'OK',
            contentType: 'video/mp4',
            error: 'Expected image, got video',
            collection: 'yachts', 
            documentId: 'yacht-456'
          }
        ]
      });
      
      // Setup mock for document repair
      mockRepository.repairDocument.mockResolvedValue(true);
    });
    
    it('should repair invalid media URLs', async () => {
      const result = await service.repairInvalidMediaUrls('report-123');
      
      expect(mockRepository.getValidationReport).toHaveBeenCalledWith('report-123');
      expect(mockRepository.repairDocument).toHaveBeenCalledTimes(2); // Two documents with issues
      
      // Check the repair details
      expect(result.repairResults).toHaveLength(2);
      expect(result.totalDocumentsRepaired).toBe(2);
      expect(result.totalFieldsRepaired).toBe(3);
      
      // Check that correct URL fixes were applied
      const yachtRepair = result.repairResults[0];
      expect(yachtRepair.collection).toBe('yachts');
      expect(yachtRepair.documentId).toBe('yacht-123');
      expect(yachtRepair.fields).toHaveLength(2);
      
      // Check for relative URL fix
      const relativeUrlFix = yachtRepair.fields.find(f => f.path === 'coverImage');
      expect(relativeUrlFix).toBeDefined();
      expect(relativeUrlFix?.repairType).toBe('RELATIVE_URL_FIX');
      
      // Check for blob URL resolve
      const blobUrlFix = yachtRepair.fields.find(f => f.path === 'gallery.0.url');
      expect(blobUrlFix).toBeDefined();
      expect(blobUrlFix?.repairType).toBe('BLOB_URL_RESOLVE');
    });
    
    it('should handle errors during repair', async () => {
      mockRepository.getValidationReport.mockRejectedValue(new Error('Failed to retrieve report'));
      
      const result = await service.repairInvalidMediaUrls('report-123');
      
      expect(result.repairResults).toHaveLength(0);
      expect(result.totalDocumentsRepaired).toBe(0);
      expect(result.totalFieldsRepaired).toBe(0);
    });
    
    it('should handle non-existent report', async () => {
      mockRepository.getValidationReport.mockResolvedValue(null);
      
      await expect(service.repairInvalidMediaUrls('non-existent')).rejects.toThrow('Validation report with ID non-existent not found');
    });
  });
});