/**
 * Media Validation Worker Tests
 * 
 * Tests for the MediaValidationWorker in the application layer.
 */

import { MediaValidationWorker, MediaValidationWorkerConfig } from '../../../../../core/application/media/media-validation-worker';
import { ValidationResult } from '../../../../../core/domain/validation/validation-result';
import { DocumentValidationResult } from '../../../../../core/domain/validation/document-validation-result';
import { ValidationReport } from '../../../../../core/domain/validation/validation-report';
import { IMediaRepository } from '../../../../../adapters/repositories/interfaces/media-repository';
import { IMediaValidationQueue } from '../../../../../core/application/interfaces/media-validation-queue';

describe('MediaValidationWorker', () => {
  // Mock dependencies
  let mockRepository: jest.Mocked<IMediaRepository>;
  let mockQueue: jest.Mocked<IMediaValidationQueue>;
  let worker: MediaValidationWorker;
  let mockConfig: MediaValidationWorkerConfig;
  
  beforeEach(() => {
    // Create mock repository
    mockRepository = {
      validateUrl: jest.fn(),
      validateDocument: jest.fn(),
      getCollections: jest.fn(),
      getDocumentIds: jest.fn(),
      saveValidationReport: jest.fn(),
      getValidationReport: jest.fn(),
      repairDocument: jest.fn()
    } as jest.Mocked<IMediaRepository>;
    
    // Create mock queue
    mockQueue = {
      sendMessage: jest.fn(),
      receiveMessages: jest.fn(),
      deleteMessage: jest.fn(),
      acknowledgeMessage: jest.fn()
    } as jest.Mocked<IMediaValidationQueue>;
    
    // Create default configuration
    mockConfig = {
      batchSize: 10,
      processingIntervalMs: 100,
      maxConcurrentBatches: 2,
      enabled: true
    };
    
    // Create worker with mock dependencies
    worker = new MediaValidationWorker(mockRepository, mockQueue, mockConfig);
  });
  
  describe('constructor', () => {
    it('should create worker with default configuration', () => {
      const defaultWorker = new MediaValidationWorker(mockRepository, mockQueue);
      
      expect(defaultWorker['config']).toEqual({
        batchSize: 50,
        processingIntervalMs: 5000,
        maxConcurrentBatches: 5,
        enabled: true
      });
    });
    
    it('should create worker with custom configuration', () => {
      expect(worker['config']).toEqual(mockConfig);
      expect(worker['repository']).toBe(mockRepository);
      expect(worker['queue']).toBe(mockQueue);
    });
  });
  
  describe('start and stop methods', () => {
    beforeEach(() => {
      // Mock the setInterval and clearInterval methods
      jest.useFakeTimers();
      jest.spyOn(global, 'setInterval');
      jest.spyOn(global, 'clearInterval');
    });
    
    afterEach(() => {
      jest.useRealTimers();
    });
    
    it('should start the worker with correct interval', () => {
      worker.start();
      
      expect(setInterval).toHaveBeenCalledTimes(1);
      expect(setInterval).toHaveBeenCalledWith(expect.any(Function), mockConfig.processingIntervalMs);
      expect(worker['isRunning']).toBe(true);
    });
    
    it('should not start the worker if already running', () => {
      worker.start();
      worker.start(); // Second call
      
      expect(setInterval).toHaveBeenCalledTimes(1);
    });
    
    it('should stop the worker', () => {
      worker.start();
      worker.stop();
      
      expect(clearInterval).toHaveBeenCalledTimes(1);
      expect(worker['isRunning']).toBe(false);
      expect(worker['processingInterval']).toBeUndefined();
    });
    
    it('should do nothing when stopping an inactive worker', () => {
      worker.stop();
      
      expect(clearInterval).not.toHaveBeenCalled();
    });
  });
  
  describe('processMessage method', () => {
    it('should process a validation request message', async () => {
      // Mock validation report
      const validationReport = {
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 5,
        totalFields: 10,
        validUrls: 8,
        invalidUrls: 2,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: []
      };
      
      // Mock the service method
      worker['validateAllCollections'] = jest.fn().mockResolvedValue(validationReport);
      
      // Call the process method
      const message = {
        id: 'msg-123',
        data: JSON.stringify({
          type: 'VALIDATE_ALL',
          payload: {
            includeCollections: ['yachts'],
            excludeCollections: ['logs']
          }
        })
      };
      
      await worker.processMessage(message);
      
      // Check if validation was called with correct parameters
      expect(worker['validateAllCollections']).toHaveBeenCalledWith({
        includeCollections: ['yachts'],
        excludeCollections: ['logs']
      });
      
      // Check if message was acknowledged
      expect(mockQueue.acknowledgeMessage).toHaveBeenCalledWith(message);
    });
    
    it('should process a repair request message', async () => {
      // Mock repair report
      const repairReport = {
        id: 'repair-123',
        reportId: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 500,
        totalDocumentsRepaired: 2,
        totalFieldsRepaired: 3,
        repairResults: []
      };
      
      // Mock the service method
      worker['repairInvalidMediaUrls'] = jest.fn().mockResolvedValue(repairReport);
      
      // Call the process method
      const message = {
        id: 'msg-456',
        data: JSON.stringify({
          type: 'REPAIR_ALL',
          payload: {
            reportId: 'report-123'
          }
        })
      };
      
      await worker.processMessage(message);
      
      // Check if repair was called with correct parameters
      expect(worker['repairInvalidMediaUrls']).toHaveBeenCalledWith('report-123');
      
      // Check if message was acknowledged
      expect(mockQueue.acknowledgeMessage).toHaveBeenCalledWith(message);
    });
    
    it('should handle invalid message format', async () => {
      const message = {
        id: 'msg-789',
        data: 'not-json-data'
      };
      
      await worker.processMessage(message);
      
      // Should acknowledge to avoid message getting stuck
      expect(mockQueue.acknowledgeMessage).toHaveBeenCalledWith(message);
    });
    
    it('should handle unknown message type', async () => {
      const message = {
        id: 'msg-789',
        data: JSON.stringify({
          type: 'UNKNOWN_TYPE',
          payload: {}
        })
      };
      
      await worker.processMessage(message);
      
      // Should acknowledge to avoid message getting stuck
      expect(mockQueue.acknowledgeMessage).toHaveBeenCalledWith(message);
    });
    
    it('should handle errors during message processing', async () => {
      worker['validateAllCollections'] = jest.fn().mockRejectedValue(new Error('Validation failed'));
      
      const message = {
        id: 'msg-123',
        data: JSON.stringify({
          type: 'VALIDATE_ALL',
          payload: {}
        })
      };
      
      await worker.processMessage(message);
      
      // Should still acknowledge the message to avoid it getting stuck
      expect(mockQueue.acknowledgeMessage).toHaveBeenCalledWith(message);
    });
  });
  
  describe('validateAllCollections method', () => {
    it('should call repository with correct options', async () => {
      // Setup mock to return successful report
      const mockReport = new ValidationReport({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 5,
        totalFields: 10,
        validUrls: 8,
        invalidUrls: 2,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: []
      });
      
      mockRepository.validateDocument.mockImplementation(async () => {
        return new DocumentValidationResult({
          collection: 'test',
          documentId: 'test-1',
          fields: new Map()
        });
      });
      
      // Spy on ValidationReport.generateFromResults
      const generateSpy = jest.spyOn(ValidationReport, 'generateFromResults')
        .mockReturnValue(mockReport);
      
      // Call the method
      const options = {
        includeCollections: ['yachts'],
        excludeCollections: ['logs']
      };
      
      await worker['validateAllCollections'](options);
      
      // Check if report was generated and saved
      expect(mockRepository.saveValidationReport).toHaveBeenCalledWith(expect.any(Object));
    });
  });
  
  describe('repairInvalidMediaUrls method', () => {
    it('should call repository with correct report ID', async () => {
      // Setup mock for getValidationReport
      const mockReport = {
        id: 'report-123',
        invalidResults: [
          {
            field: 'image',
            url: '/relative.jpg',
            collection: 'yachts',
            documentId: 'yacht-1',
            isValid: false,
            error: 'Invalid URL'
          }
        ]
      };
      
      mockRepository.getValidationReport.mockResolvedValue(mockReport);
      mockRepository.repairDocument.mockResolvedValue(true);
      
      // Call the method
      await worker['repairInvalidMediaUrls']('report-123');
      
      // Check if report was retrieved and repairs attempted
      expect(mockRepository.getValidationReport).toHaveBeenCalledWith('report-123');
      expect(mockRepository.repairDocument).toHaveBeenCalled();
    });
    
    it('should handle non-existent report', async () => {
      mockRepository.getValidationReport.mockResolvedValue(null);
      
      await expect(worker['repairInvalidMediaUrls']('non-existent')).rejects
        .toThrow('Validation report with ID non-existent not found');
    });
  });
});