/**
 * Firebase Media Repository Tests
 * 
 * Tests for the FirebaseMediaRepository in the adapters layer.
 */

import { Firestore, CollectionReference, DocumentReference, DocumentData, Query } from 'firebase/firestore';
import { MediaType } from '../../../../../core/domain/media/media-type';
import { ValidationResult } from '../../../../../core/domain/validation/validation-result';
import { DocumentValidationResult } from '../../../../../core/domain/validation/document-validation-result';
import { FirebaseMediaRepository, FirebaseMediaRepositoryConfig } from '../../../../../adapters/repositories/firebase/firebase-media-repository';

// Mock Firestore types and methods
jest.mock('firebase/firestore', () => {
  return {
    collection: jest.fn(),
    doc: jest.fn(),
    getDoc: jest.fn(),
    getDocs: jest.fn(),
    updateDoc: jest.fn(),
    setDoc: jest.fn(),
    query: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn()
  };
});

describe('FirebaseMediaRepository', () => {
  // Mock Firestore
  let mockFirestore: jest.Mocked<Firestore>;
  let repository: FirebaseMediaRepository;
  let config: FirebaseMediaRepositoryConfig;
  
  beforeEach(() => {
    // Create mock Firestore
    mockFirestore = {
      collection: jest.fn(),
      doc: jest.fn(),
      getDoc: jest.fn(),
      getDocs: jest.fn(),
      updateDoc: jest.fn(),
      setDoc: jest.fn()
    } as unknown as jest.Mocked<Firestore>;
    
    // Setup default config
    config = {
      validationReportsCollection: 'validation_reports',
      repairReportsCollection: 'repair_reports',
      fetchTimeout: 5000
    };
    
    // Create repository with mock Firestore
    repository = new FirebaseMediaRepository(mockFirestore, config);
  });
  
  describe('constructor', () => {
    it('should create repository with default config', () => {
      repository = new FirebaseMediaRepository(mockFirestore);
      
      expect(repository['db']).toBe(mockFirestore);
      expect(repository['config']).toEqual({
        validationReportsCollection: 'validation_reports',
        repairReportsCollection: 'repair_reports',
        fetchTimeout: 10000
      });
    });
    
    it('should create repository with custom config', () => {
      expect(repository['db']).toBe(mockFirestore);
      expect(repository['config']).toBe(config);
    });
  });
  
  describe('validateUrl method', () => {
    beforeEach(() => {
      // Mock fetch
      global.fetch = jest.fn();
    });
    
    afterEach(() => {
      jest.restoreAllMocks();
    });
    
    it('should validate a valid URL', async () => {
      // Mock fetch to return a successful response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'image/jpeg'
        })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await repository.validateUrl('https://example.com/image.jpg', MediaType.IMAGE);
      
      expect(global.fetch).toHaveBeenCalledWith('https://example.com/image.jpg', {
        method: 'HEAD',
        timeout: config.fetchTimeout
      });
      
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBe('image/jpeg');
      expect(result.getStatus()).toBe(200);
      expect(result.getStatusText()).toBe('OK');
    });
    
    it('should invalidate a URL that returns an error', async () => {
      // Mock fetch to throw an error
      (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));
      
      const result = await repository.validateUrl('https://example.com/broken.jpg', MediaType.IMAGE);
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getError()).toBe('Network error');
    });
    
    it('should invalidate a URL with non-matching content type', async () => {
      // Mock fetch to return a response with wrong content type
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'video/mp4'
        })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await repository.validateUrl('https://example.com/video.mp4', MediaType.IMAGE);
      
      expect(result.getIsValid()).toBe(false);
      expect(result.getContentType()).toBe('video/mp4');
      expect(result.getError()).toContain('Expected image, got video');
    });
    
    it('should validate a URL without checking content type if specified', async () => {
      // Configure repository to not check content type
      repository = new FirebaseMediaRepository(mockFirestore, {
        ...config,
        checkContentType: false
      });
      
      // Mock fetch to return a response with "wrong" content type
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: new Headers({
          'content-type': 'video/mp4'
        })
      };
      
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);
      
      const result = await repository.validateUrl('https://example.com/video.mp4', MediaType.IMAGE);
      
      expect(result.getIsValid()).toBe(true);
      expect(result.getContentType()).toBe('video/mp4');
    });
  });
  
  describe('validateDocument method', () => {
    it('should validate all media URLs in a document', async () => {
      // Mock document data
      const mockDocData = {
        title: 'Test Yacht',
        coverImage: 'https://example.com/cover.jpg',
        gallery: [
          { url: 'https://example.com/image1.jpg' },
          { url: 'https://example.com/image2.jpg' }
        ],
        media: [
          { type: 'image', url: 'https://example.com/media1.jpg' },
          { type: 'video', url: 'https://example.com/video.mp4' }
        ]
      };
      
      // Mock Firestore getDoc response
      const mockDocSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue(mockDocData),
        id: 'yacht-123'
      };
      
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc = jest.fn().mockResolvedValue(mockDocSnapshot);
      
      // Mock validateUrl to return appropriate results
      repository.validateUrl = jest.fn().mockImplementation((url, type) => {
        if (url.includes('video')) {
          return Promise.resolve(ValidationResult.createValid(url, 'video/mp4', 200, 'OK'));
        }
        return Promise.resolve(ValidationResult.createValid(url, 'image/jpeg', 200, 'OK'));
      });
      
      const result = await repository.validateDocument('yachts', 'yacht-123');
      
      // Check general properties
      expect(result).toBeInstanceOf(DocumentValidationResult);
      expect(result.getCollection()).toBe('yachts');
      expect(result.getDocumentId()).toBe('yacht-123');
      
      // Check that all URLs were validated
      expect(repository.validateUrl).toHaveBeenCalledTimes(5);
      
      // Check results for specific fields
      const fields = result.getFields();
      expect(fields.size).toBe(5);
      expect(fields.has('coverImage')).toBe(true);
      expect(fields.has('gallery.0.url')).toBe(true);
      expect(fields.has('gallery.1.url')).toBe(true);
      expect(fields.has('media.0.url')).toBe(true);
      expect(fields.has('media.1.url')).toBe(true);
      
      // Check all URLs are valid
      expect(result.getValidUrls()).toBe(5);
      expect(result.getInvalidUrls()).toBe(0);
    });
    
    it('should handle documents with no media fields', async () => {
      // Mock document with no media fields
      const mockDocData = {
        title: 'Test Document',
        description: 'No media here'
      };
      
      // Mock Firestore getDoc response
      const mockDocSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue(mockDocData),
        id: 'doc-123'
      };
      
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc = jest.fn().mockResolvedValue(mockDocSnapshot);
      
      const result = await repository.validateDocument('collection', 'doc-123');
      
      expect(result.getTotalUrls()).toBe(0);
      expect(result.getValidUrls()).toBe(0);
      expect(result.getInvalidUrls()).toBe(0);
    });
    
    it('should handle non-existent documents', async () => {
      // Mock Firestore getDoc response for non-existent document
      const mockDocSnapshot = {
        exists: jest.fn().mockReturnValue(false),
        data: jest.fn().mockReturnValue(null),
        id: 'missing-123'
      };
      
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc = jest.fn().mockResolvedValue(mockDocSnapshot);
      
      const result = await repository.validateDocument('collection', 'missing-123');
      
      expect(result.getTotalUrls()).toBe(0);
      expect(result.getValidUrls()).toBe(0);
      expect(result.getInvalidUrls()).toBe(0);
    });
  });
  
  describe('getCollections method', () => {
    it('should return list of collections from Firestore', async () => {
      // Mock Firestore listCollections response
      const mockCollections = [
        { id: 'yachts' },
        { id: 'users' },
        { id: 'products' }
      ];
      
      mockFirestore.listCollections = jest.fn().mockResolvedValue(mockCollections);
      
      const collections = await repository.getCollections();
      
      expect(collections).toEqual(['yachts', 'users', 'products']);
    });
  });
  
  describe('getDocumentIds method', () => {
    it('should return document IDs for a collection', async () => {
      // Mock Firestore collection and query response
      const mockDocs = [
        { id: 'doc-1' },
        { id: 'doc-2' },
        { id: 'doc-3' }
      ];
      
      const mockSnapshot = {
        docs: mockDocs,
        size: 3
      };
      
      const mockCollectionRef = {} as CollectionReference<DocumentData>;
      const mockQuery = {} as Query<DocumentData>;
      
      mockFirestore.collection.mockReturnValue(mockCollectionRef);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.limit.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      
      const docIds = await repository.getDocumentIds('collection', 10);
      
      expect(docIds).toEqual(['doc-1', 'doc-2', 'doc-3']);
      expect(mockFirestore.collection).toHaveBeenCalledWith('collection');
      expect(mockFirestore.limit).toHaveBeenCalledWith(10);
    });
    
    it('should handle empty collections', async () => {
      // Mock empty collection
      const mockSnapshot = {
        docs: [],
        size: 0
      };
      
      const mockCollectionRef = {} as CollectionReference<DocumentData>;
      const mockQuery = {} as Query<DocumentData>;
      
      mockFirestore.collection.mockReturnValue(mockCollectionRef);
      mockFirestore.query.mockReturnValue(mockQuery);
      mockFirestore.limit.mockReturnValue(mockQuery);
      mockFirestore.getDocs.mockResolvedValue(mockSnapshot);
      
      const docIds = await repository.getDocumentIds('empty_collection', 10);
      
      expect(docIds).toEqual([]);
    });
  });
  
  describe('saveValidationReport method', () => {
    it('should save validation report to Firestore', async () => {
      // Create report object
      const report = {
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
      
      // Mock Firestore methods
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.setDoc.mockResolvedValue(undefined);
      
      await repository.saveValidationReport(report);
      
      expect(mockFirestore.doc).toHaveBeenCalledWith(config.validationReportsCollection, report.id);
      expect(mockFirestore.setDoc).toHaveBeenCalledWith(mockDocRef, expect.any(Object));
    });
  });
  
  describe('getValidationReport method', () => {
    it('should retrieve validation report from Firestore', async () => {
      // Mock report data
      const mockReportData = {
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
      
      // Mock Firestore response
      const mockDocSnapshot = {
        exists: jest.fn().mockReturnValue(true),
        data: jest.fn().mockReturnValue(mockReportData),
        id: 'report-123'
      };
      
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(mockDocSnapshot);
      
      const report = await repository.getValidationReport('report-123');
      
      expect(report).toEqual(mockReportData);
      expect(mockFirestore.doc).toHaveBeenCalledWith(config.validationReportsCollection, 'report-123');
    });
    
    it('should return null for non-existent report', async () => {
      // Mock Firestore response for non-existent document
      const mockDocSnapshot = {
        exists: jest.fn().mockReturnValue(false),
        data: jest.fn().mockReturnValue(null),
        id: 'non-existent'
      };
      
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.getDoc.mockResolvedValue(mockDocSnapshot);
      
      const report = await repository.getValidationReport('non-existent');
      
      expect(report).toBeNull();
    });
  });
  
  describe('repairDocument method', () => {
    it('should update document fields with repaired URLs', async () => {
      // Create field updates
      const fieldUpdates = {
        'coverImage': 'https://example.com/fixed-cover.jpg',
        'gallery.0.url': 'https://example.com/fixed-gallery-1.jpg'
      };
      
      // Mock Firestore methods
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockResolvedValue(undefined);
      
      const result = await repository.repairDocument('yachts', 'yacht-123', fieldUpdates);
      
      expect(result).toBe(true);
      expect(mockFirestore.doc).toHaveBeenCalledWith('yachts', 'yacht-123');
      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(mockDocRef, {
        'coverImage': 'https://example.com/fixed-cover.jpg',
        'gallery.0.url': 'https://example.com/fixed-gallery-1.jpg'
      });
    });
    
    it('should handle errors during document update', async () => {
      // Create field updates
      const fieldUpdates = {
        'coverImage': 'https://example.com/fixed-cover.jpg'
      };
      
      // Mock Firestore to throw error
      const mockDocRef = {} as DocumentReference<DocumentData>;
      mockFirestore.doc.mockReturnValue(mockDocRef);
      mockFirestore.updateDoc.mockRejectedValue(new Error('Update failed'));
      
      const result = await repository.repairDocument('yachts', 'yacht-123', fieldUpdates);
      
      expect(result).toBe(false);
    });
  });
});