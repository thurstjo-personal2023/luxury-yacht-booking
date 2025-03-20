/**
 * Media Validation Worker Test Suite
 * 
 * This file contains tests for the media validation worker.
 */
import { MediaValidationWorker, MediaValidationWorkerConfig } from '../functions/media-validation/worker';
import { ValidationReport } from '../functions/media-validation/media-validation';

// Mock the Firestore and media validation service
jest.mock('firebase/firestore', () => {
  // Create a mock implementation
  const mockDocs = [
    {
      id: 'doc1',
      data: () => ({
        id: 'doc1',
        title: 'Document 1',
        imageUrl: 'https://example.com/valid-image.jpg',
        media: [
          { type: 'image', url: 'https://example.com/valid-image.jpg' },
          { type: 'image', url: 'https://example.com/not-found.jpg' }
        ]
      })
    },
    {
      id: 'doc2',
      data: () => ({
        id: 'doc2',
        title: 'Document 2',
        thumbnail: 'https://example.com/valid-image.jpg',
        videoUrl: 'https://example.com/valid-video.mp4'
      })
    },
    {
      id: 'doc3',
      data: () => ({
        id: 'doc3',
        title: 'Document 3',
        imageUrl: 'https://example.com/wrong-type.jpg',
        videoUrl: 'https://example.com/valid-image.jpg'
      })
    }
  ];

  return {
    getFirestore: jest.fn().mockReturnValue({}),
    collection: jest.fn().mockReturnValue({}),
    query: jest.fn().mockReturnValue({}),
    limit: jest.fn().mockReturnValue({}),
    startAfter: jest.fn().mockReturnValue({}),
    doc: jest.fn().mockReturnValue({}),
    getDoc: jest.fn().mockResolvedValue({ exists: () => true, data: () => ({}) }),
    getDocs: jest.fn().mockResolvedValue({
      empty: false,
      size: 3,
      docs: mockDocs,
      forEach: (callback: (doc: any) => void) => mockDocs.forEach(callback)
    }),
    setDoc: jest.fn().mockResolvedValue({}),
    updateDoc: jest.fn().mockResolvedValue({})
  };
});

// Mock the media validation service
jest.mock('../functions/media-validation/media-validation', () => {
  return {
    MediaValidationService: jest.fn().mockImplementation(() => ({
      validateDocument: jest.fn().mockImplementation((document: any, id: string, collection: string) => {
        // For doc1
        if (id === 'doc1') {
          return Promise.resolve({
            id,
            collection,
            totalUrls: 3,
            validUrls: 2,
            invalidUrls: 1,
            results: [
              {
                field: 'imageUrl',
                url: 'https://example.com/valid-image.jpg',
                isValid: true,
                contentType: 'image/jpeg',
                status: 200,
                statusText: 'OK'
              },
              {
                field: 'media.[0].url',
                url: 'https://example.com/valid-image.jpg',
                isValid: true,
                contentType: 'image/jpeg',
                status: 200,
                statusText: 'OK'
              },
              {
                field: 'media.[1].url',
                url: 'https://example.com/not-found.jpg',
                isValid: false,
                status: 404,
                statusText: 'Not Found',
                reason: 'Request failed',
                error: 'HTTP error: 404 Not Found'
              }
            ]
          });
        }
        // For doc2
        else if (id === 'doc2') {
          return Promise.resolve({
            id,
            collection,
            totalUrls: 2,
            validUrls: 2,
            invalidUrls: 0,
            results: [
              {
                field: 'thumbnail',
                url: 'https://example.com/valid-image.jpg',
                isValid: true,
                contentType: 'image/jpeg',
                status: 200,
                statusText: 'OK'
              },
              {
                field: 'videoUrl',
                url: 'https://example.com/valid-video.mp4',
                isValid: true,
                contentType: 'video/mp4',
                status: 200,
                statusText: 'OK'
              }
            ]
          });
        }
        // For doc3
        else {
          return Promise.resolve({
            id,
            collection,
            totalUrls: 2,
            validUrls: 0,
            invalidUrls: 2,
            results: [
              {
                field: 'imageUrl',
                url: 'https://example.com/wrong-type.jpg',
                isValid: false,
                contentType: 'video/mp4',
                status: 200,
                statusText: 'OK',
                reason: 'Invalid content type',
                error: 'Expected image, got video/mp4'
              },
              {
                field: 'videoUrl',
                url: 'https://example.com/valid-image.jpg',
                isValid: false,
                contentType: 'image/jpeg',
                status: 200,
                statusText: 'OK',
                reason: 'Invalid content type',
                error: 'Expected video, got image/jpeg'
              }
            ]
          });
        }
      }),
      fixInvalidUrls: jest.fn().mockImplementation((document: any, validation: any) => {
        return {
          updatedDocument: { ...document, fixed: true },
          fixes: validation.results.filter((r: any) => !r.isValid).map((r: any) => ({
            id: validation.id,
            collection: validation.collection,
            field: r.field,
            originalUrl: r.url,
            newUrl: r.field.toLowerCase().includes('video') ? '/yacht-video-placeholder.mp4' : '/yacht-placeholder.jpg',
            fixed: true
          }))
        };
      }),
      generateReport: jest.fn().mockImplementation((results: any[], startTime: Date, endTime: Date) => {
        const report: ValidationReport = {
          startTime,
          endTime,
          duration: endTime.getTime() - startTime.getTime(),
          totalDocuments: results.length,
          totalFields: results.reduce((sum, r) => sum + r.totalUrls, 0),
          validUrls: results.reduce((sum, r) => sum + r.validUrls, 0),
          invalidUrls: results.reduce((sum, r) => sum + r.invalidUrls, 0),
          missingUrls: 0,
          collectionSummaries: [
            {
              collection: 'test_collection',
              totalUrls: 7,
              validUrls: 4,
              invalidUrls: 3,
              missingUrls: 0,
              validPercent: 57,
              invalidPercent: 43,
              missingPercent: 0
            }
          ],
          invalidResults: results
            .flatMap(r => r.results.filter((f: any) => !f.isValid).map((f: any) => ({
              ...f,
              field: `${r.collection} (${r.id}): ${f.field}`
            })))
        };
        return report;
      })
    }))
  };
});

describe('MediaValidationWorker', () => {
  let worker: MediaValidationWorker;
  let mockDb: any;
  let mockConfig: MediaValidationWorkerConfig;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create mock database and config
    mockDb = {};
    mockConfig = {
      batchSize: 10,
      maxItems: 100,
      fixInvalidUrls: true,
      collections: ['test_collection'],
      onProgress: jest.fn(),
      onComplete: jest.fn(),
      onError: jest.fn()
    };
    
    // Create worker
    worker = new MediaValidationWorker(mockDb, mockConfig);
  });
  
  describe('start', () => {
    it('should process all collections and generate a report', async () => {
      // Start validation
      const report = await worker.start();
      
      // Verify report is generated
      expect(report).toBeDefined();
      expect(report.totalDocuments).toBe(3);
      expect(report.validUrls).toBe(4);
      expect(report.invalidUrls).toBe(3);
      
      // Verify progress callback was called
      expect(mockConfig.onProgress).toHaveBeenCalled();
      
      // Verify complete callback was called with the report
      expect(mockConfig.onComplete).toHaveBeenCalledWith(report);
      
      // Verify error callback was not called
      expect(mockConfig.onError).not.toHaveBeenCalled();
    });
    
    it('should handle errors during processing', async () => {
      // Mock an error in the validation service
      const error = new Error('Test error');
      require('../functions/media-validation/media-validation').MediaValidationService.mockImplementationOnce(() => ({
        validateDocument: jest.fn().mockRejectedValue(error),
        fixInvalidUrls: jest.fn(),
        generateReport: jest.fn().mockReturnValue({
          startTime: new Date(),
          endTime: new Date(),
          duration: 0,
          totalDocuments: 0,
          totalFields: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          collectionSummaries: [],
          invalidResults: []
        })
      }));
      
      // Start validation
      try {
        await worker.start();
        fail('Should have thrown an error');
      } catch (err) {
        // Verify error callback was called
        expect(mockConfig.onError).toHaveBeenCalled();
      }
    });
  });
  
  describe('stop', () => {
    it('should stop processing', async () => {
      // Create a promise that resolves when progress is called
      const progressPromise = new Promise<void>(resolve => {
        mockConfig.onProgress = jest.fn().mockImplementation(() => {
          resolve();
        });
      });
      
      // Start validation in background
      const startPromise = worker.start();
      
      // Wait for progress to be called
      await progressPromise;
      
      // Stop validation
      worker.stop();
      
      // Wait for validation to complete
      const report = await startPromise;
      
      // Verify report was generated despite stopping
      expect(report).toBeDefined();
    });
  });
});