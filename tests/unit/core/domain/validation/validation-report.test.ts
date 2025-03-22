/**
 * Validation Report Tests
 * 
 * Tests for the ValidationReport value object in the domain layer.
 */

import { ValidationReport } from '../../../../../core/domain/validation/validation-report';
import { DocumentValidationResult } from '../../../../../core/domain/validation/document-validation-result';

describe('ValidationReport', () => {
  describe('constructor', () => {
    it('should create a validation report with basic properties', () => {
      const startTime = new Date(2023, 0, 1, 10, 0, 0);
      const endTime = new Date(2023, 0, 1, 10, 5, 0);
      
      const report = new ValidationReport({
        id: 'report-123',
        startTime,
        endTime,
        duration: 300000, // 5 minutes in milliseconds
        totalDocuments: 100,
        totalFields: 500,
        validUrls: 450,
        invalidUrls: 40,
        missingUrls: 10,
        collectionSummaries: [],
        invalidResults: []
      });
      
      expect(report.id).toBe('report-123');
      expect(report.startTime).toEqual(startTime);
      expect(report.endTime).toEqual(endTime);
      expect(report.duration).toBe(300000);
      expect(report.totalDocuments).toBe(100);
      expect(report.totalFields).toBe(500);
      expect(report.validUrls).toBe(450);
      expect(report.invalidUrls).toBe(40);
      expect(report.missingUrls).toBe(10);
      expect(report.collectionSummaries).toEqual([]);
      expect(report.invalidResults).toEqual([]);
    });
    
    it('should create validation report with collection summaries and invalid results', () => {
      const collectionSummaries = [
        {
          collection: 'yachts',
          totalUrls: 300,
          validUrls: 280,
          invalidUrls: 15,
          missingUrls: 5,
          validPercent: 93.33,
          invalidPercent: 5.0,
          missingPercent: 1.67
        },
        {
          collection: 'users',
          totalUrls: 200,
          validUrls: 170,
          invalidUrls: 25,
          missingUrls: 5,
          validPercent: 85.0,
          invalidPercent: 12.5,
          missingPercent: 2.5
        }
      ];
      
      const invalidResults = [
        {
          field: 'coverImage',
          url: 'https://example.com/broken.jpg',
          isValid: false,
          status: 404,
          statusText: 'Not Found',
          error: 'Resource not found',
          collection: 'yachts',
          documentId: 'yacht-123'
        },
        {
          field: 'profilePhoto',
          url: '/profile-pic.jpg',
          isValid: false,
          error: 'Invalid URL',
          collection: 'users',
          documentId: 'user-456'
        }
      ];
      
      const report = new ValidationReport({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000,
        totalDocuments: 100,
        totalFields: 500,
        validUrls: 450,
        invalidUrls: 40,
        missingUrls: 10,
        collectionSummaries,
        invalidResults
      });
      
      expect(report.collectionSummaries).toHaveLength(2);
      expect(report.invalidResults).toHaveLength(2);
      
      // Check that arrays are copied, not referenced
      expect(report.collectionSummaries).not.toBe(collectionSummaries);
      expect(report.invalidResults).not.toBe(invalidResults);
    });
  });
  
  describe('percentage methods', () => {
    it('should calculate correct percentages', () => {
      const report = new ValidationReport({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000,
        totalDocuments: 100,
        totalFields: 1000,
        validUrls: 800,
        invalidUrls: 150,
        missingUrls: 50,
        collectionSummaries: [],
        invalidResults: []
      });
      
      expect(report.getValidPercentage()).toBe(80);
      expect(report.getInvalidPercentage()).toBe(15);
      expect(report.getMissingPercentage()).toBe(5);
    });
    
    it('should handle edge case with zero total fields', () => {
      const report = new ValidationReport({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000,
        totalDocuments: 0,
        totalFields: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: []
      });
      
      expect(report.getValidPercentage()).toBe(100);
      expect(report.getInvalidPercentage()).toBe(0);
      expect(report.getMissingPercentage()).toBe(0);
    });
  });
  
  describe('collection methods', () => {
    let report: ValidationReport;
    
    beforeEach(() => {
      const collectionSummaries = [
        {
          collection: 'yachts',
          totalUrls: 300,
          validUrls: 280,
          invalidUrls: 15,
          missingUrls: 5,
          validPercent: 93.33,
          invalidPercent: 5.0,
          missingPercent: 1.67
        },
        {
          collection: 'users',
          totalUrls: 200,
          validUrls: 170,
          invalidUrls: 25,
          missingUrls: 5,
          validPercent: 85.0,
          invalidPercent: 12.5,
          missingPercent: 2.5
        }
      ];
      
      const invalidResults = [
        {
          field: 'coverImage',
          url: 'https://example.com/broken.jpg',
          isValid: false,
          status: 404,
          error: 'Resource not found',
          collection: 'yachts',
          documentId: 'yacht-123'
        },
        {
          field: 'profilePhoto',
          url: '/profile-pic.jpg',
          isValid: false,
          error: 'Invalid URL',
          collection: 'users',
          documentId: 'user-456'
        },
        {
          field: 'gallery.0.url',
          url: 'https://example.com/deleted.jpg',
          isValid: false,
          status: 410,
          error: 'Resource deleted',
          collection: 'yachts',
          documentId: 'yacht-789'
        }
      ];
      
      report = new ValidationReport({
        id: 'report-123',
        startTime: new Date(),
        endTime: new Date(),
        duration: 300000,
        totalDocuments: 100,
        totalFields: 500,
        validUrls: 450,
        invalidUrls: 40,
        missingUrls: 10,
        collectionSummaries,
        invalidResults
      });
    });
    
    it('should get summary for a specific collection', () => {
      const yachtSummary = report.getCollectionSummary('yachts');
      expect(yachtSummary).toBeDefined();
      expect(yachtSummary?.totalUrls).toBe(300);
      expect(yachtSummary?.validUrls).toBe(280);
      
      const userSummary = report.getCollectionSummary('users');
      expect(userSummary).toBeDefined();
      expect(userSummary?.totalUrls).toBe(200);
      expect(userSummary?.validUrls).toBe(170);
    });
    
    it('should return undefined for non-existent collection summary', () => {
      const summary = report.getCollectionSummary('non-existent');
      expect(summary).toBeUndefined();
    });
    
    it('should get invalid results for a specific collection', () => {
      const yachtResults = report.getInvalidResultsForCollection('yachts');
      expect(yachtResults).toHaveLength(2);
      expect(yachtResults[0].field).toBe('coverImage');
      expect(yachtResults[1].field).toBe('gallery.0.url');
      
      const userResults = report.getInvalidResultsForCollection('users');
      expect(userResults).toHaveLength(1);
      expect(userResults[0].field).toBe('profilePhoto');
    });
    
    it('should return empty array for non-existent collection invalid results', () => {
      const results = report.getInvalidResultsForCollection('non-existent');
      expect(results).toEqual([]);
    });
  });
  
  describe('generateFromResults static method', () => {
    it('should generate a validation report from document validation results', () => {
      // Mock document validation results
      const mockResults = [
        { 
          collection: 'yachts',
          documentId: 'yacht-123',
          totalUrls: 5,
          validUrls: 4,
          invalidUrls: 1,
          missingUrls: 0,
          getInvalidFields: () => [{
            path: 'coverImage',
            url: 'https://example.com/broken.jpg',
            isValid: false,
            statusCode: 404,
            statusText: 'Not Found',
            error: 'Resource not found'
          }]
        },
        {
          collection: 'yachts',
          documentId: 'yacht-456',
          totalUrls: 3,
          validUrls: 3,
          invalidUrls: 0,
          missingUrls: 0,
          getInvalidFields: () => []
        },
        {
          collection: 'users',
          documentId: 'user-789',
          totalUrls: 2,
          validUrls: 1,
          invalidUrls: 1,
          missingUrls: 0,
          getInvalidFields: () => [{
            path: 'profilePhoto',
            url: '/relative-photo.jpg',
            isValid: false,
            error: 'Invalid URL'
          }]
        }
      ] as unknown as DocumentValidationResult[];
      
      const startTime = new Date(2023, 0, 1, 10, 0, 0);
      const endTime = new Date(2023, 0, 1, 10, 5, 0);
      
      const report = ValidationReport.generateFromResults(
        'report-123',
        mockResults,
        startTime,
        endTime
      );
      
      // Check basic properties
      expect(report.id).toBe('report-123');
      expect(report.startTime).toEqual(startTime);
      expect(report.endTime).toEqual(endTime);
      expect(report.duration).toBe(300000); // 5 minutes
      expect(report.totalDocuments).toBe(3);
      expect(report.totalFields).toBe(10);
      expect(report.validUrls).toBe(8);
      expect(report.invalidUrls).toBe(2);
      expect(report.missingUrls).toBe(0);
      
      // Check collection summaries
      expect(report.collectionSummaries).toHaveLength(2);
      
      const yachtSummary = report.getCollectionSummary('yachts');
      expect(yachtSummary).toBeDefined();
      expect(yachtSummary?.totalUrls).toBe(8);
      expect(yachtSummary?.validUrls).toBe(7);
      expect(yachtSummary?.invalidUrls).toBe(1);
      expect(yachtSummary?.validPercent).toBe(87.5);
      
      const userSummary = report.getCollectionSummary('users');
      expect(userSummary).toBeDefined();
      expect(userSummary?.totalUrls).toBe(2);
      expect(userSummary?.validUrls).toBe(1);
      expect(userSummary?.invalidUrls).toBe(1);
      expect(userSummary?.validPercent).toBe(50);
      
      // Check invalid results
      expect(report.invalidResults).toHaveLength(2);
      expect(report.invalidResults[0].collection).toBe('yachts');
      expect(report.invalidResults[0].documentId).toBe('yacht-123');
      expect(report.invalidResults[0].field).toBe('coverImage');
      expect(report.invalidResults[0].url).toBe('https://example.com/broken.jpg');
      
      expect(report.invalidResults[1].collection).toBe('users');
      expect(report.invalidResults[1].documentId).toBe('user-789');
      expect(report.invalidResults[1].field).toBe('profilePhoto');
      expect(report.invalidResults[1].url).toBe('/relative-photo.jpg');
    });
  });
  
  describe('toObject method', () => {
    it('should convert to a plain object representation', () => {
      const startTime = new Date();
      const endTime = new Date();
      
      const reportProps = {
        id: 'report-123',
        startTime,
        endTime,
        duration: 300000,
        totalDocuments: 100,
        totalFields: 500,
        validUrls: 450,
        invalidUrls: 40,
        missingUrls: 10,
        collectionSummaries: [
          {
            collection: 'yachts',
            totalUrls: 300,
            validUrls: 280,
            invalidUrls: 15,
            missingUrls: 5,
            validPercent: 93.33,
            invalidPercent: 5.0,
            missingPercent: 1.67
          }
        ],
        invalidResults: [
          {
            field: 'coverImage',
            url: 'https://example.com/broken.jpg',
            isValid: false,
            status: 404,
            error: 'Resource not found',
            collection: 'yachts',
            documentId: 'yacht-123'
          }
        ]
      };
      
      const report = new ValidationReport(reportProps);
      const obj = report.toObject();
      
      expect(obj).toEqual(reportProps);
      
      // Check that arrays are copied
      expect(obj.collectionSummaries).not.toBe(report.collectionSummaries);
      expect(obj.invalidResults).not.toBe(report.invalidResults);
    });
  });
});