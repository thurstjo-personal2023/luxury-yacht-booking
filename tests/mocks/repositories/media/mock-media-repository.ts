/**
 * Mock Media Repository
 * 
 * This class provides a mock implementation of the IMediaRepository interface
 * for testing media validation and repair use cases without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IMediaRepository } from '../../../../core/application/ports/repositories/media-repository';
import { ValidationReport } from '../../../../core/domain/media/validation-report';
import { MediaCollection } from '../../../../core/domain/media/media-collection';
import { MediaField } from '../../../../core/domain/media/media-field';
import { DocumentValidationResult } from '../../../../core/domain/media/document-validation-result';
import { FieldValidationResult } from '../../../../core/domain/media/field-validation-result';
import { MediaQueryOptions, PagedResults } from '../../../../core/application/ports/repositories/media-repository';

export class MockMediaRepository extends BaseMockRepository implements IMediaRepository {
  // In-memory storage for media-related data
  private validationReports: Map<string, ValidationReport> = new Map();
  private collections: Map<string, MediaCollection> = new Map();
  private documentResults: Map<string, DocumentValidationResult[]> = new Map();
  private fieldResults: Map<string, FieldValidationResult[]> = new Map();
  
  /**
   * Save a validation report
   * @param report Validation report to save
   */
  async saveValidationReport(report: ValidationReport): Promise<string> {
    return this.executeMethod<string>('saveValidationReport', [report], () => {
      const id = report.id || `mock-report-${Date.now()}`;
      const newReport = { ...report, id };
      
      this.validationReports.set(id, newReport);
      return id;
    });
  }
  
  /**
   * Get a validation report by ID
   * @param id Report ID
   */
  async getValidationReport(id: string): Promise<ValidationReport | null> {
    return this.executeMethod<ValidationReport | null>('getValidationReport', [id], () => {
      return this.validationReports.has(id) ? this.validationReports.get(id) || null : null;
    });
  }
  
  /**
   * List validation reports
   * @param options Query options
   */
  async listValidationReports(options?: MediaQueryOptions): Promise<PagedResults<ValidationReport>> {
    return this.executeMethod<PagedResults<ValidationReport>>(
      'listValidationReports', 
      [options], 
      () => {
        const page = options?.page || 1;
        const pageSize = options?.pageSize || 10;
        
        let reports = Array.from(this.validationReports.values());
        
        // Apply sorting (most recent first by default)
        reports.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        const totalCount = reports.length;
        const startIndex = (page - 1) * pageSize;
        const items = reports.slice(startIndex, startIndex + pageSize);
        
        return {
          items,
          totalCount,
          hasMore: startIndex + pageSize < totalCount
        };
      }
    );
  }
  
  /**
   * Get the most recent validation report
   */
  async getMostRecentValidationReport(): Promise<ValidationReport | null> {
    return this.executeMethod<ValidationReport | null>(
      'getMostRecentValidationReport', 
      [], 
      () => {
        const reports = Array.from(this.validationReports.values());
        
        if (reports.length === 0) {
          return null;
        }
        
        // Sort by startTime (descending)
        reports.sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
        
        return reports[0];
      }
    );
  }
  
  /**
   * Get collections for validation
   */
  async getCollectionsForValidation(): Promise<MediaCollection[]> {
    return this.executeMethod<MediaCollection[]>(
      'getCollectionsForValidation', 
      [], 
      () => {
        return Array.from(this.collections.values());
      }
    );
  }
  
  /**
   * Get document validation results by report ID
   * @param reportId Report ID
   */
  async getDocumentResults(reportId: string): Promise<DocumentValidationResult[]> {
    return this.executeMethod<DocumentValidationResult[]>(
      'getDocumentResults', 
      [reportId], 
      () => {
        return this.documentResults.get(reportId) || [];
      }
    );
  }
  
  /**
   * Get field validation results by report ID
   * @param reportId Report ID
   */
  async getFieldResults(reportId: string): Promise<FieldValidationResult[]> {
    return this.executeMethod<FieldValidationResult[]>(
      'getFieldResults', 
      [reportId], 
      () => {
        return this.fieldResults.get(reportId) || [];
      }
    );
  }
  
  /**
   * Save document validation results
   * @param reportId Report ID
   * @param results Document validation results
   */
  async saveDocumentResults(reportId: string, results: DocumentValidationResult[]): Promise<boolean> {
    return this.executeMethod<boolean>(
      'saveDocumentResults', 
      [reportId, results], 
      () => {
        this.documentResults.set(reportId, results);
        return true;
      }
    );
  }
  
  /**
   * Save field validation results
   * @param reportId Report ID
   * @param results Field validation results
   */
  async saveFieldResults(reportId: string, results: FieldValidationResult[]): Promise<boolean> {
    return this.executeMethod<boolean>(
      'saveFieldResults', 
      [reportId, results], 
      () => {
        this.fieldResults.set(reportId, results);
        return true;
      }
    );
  }
  
  /**
   * Register a media collection for validation
   * @param collection Media collection to register
   */
  async registerCollection(collection: MediaCollection): Promise<boolean> {
    return this.executeMethod<boolean>(
      'registerCollection', 
      [collection], 
      () => {
        this.collections.set(collection.name, collection);
        return true;
      }
    );
  }
  
  /**
   * Update a document's media field
   * @param collection Collection name
   * @param documentId Document ID
   * @param field Field to update
   * @param newUrl New URL for the field
   */
  async updateMediaField(
    collection: string,
    documentId: string,
    field: MediaField,
    newUrl: string
  ): Promise<boolean> {
    return this.executeMethod<boolean>(
      'updateMediaField', 
      [collection, documentId, field, newUrl], 
      () => {
        // This is a mock, so we don't actually update any real documents
        // Just return success
        return true;
      }
    );
  }
  
  /**
   * Delete a validation report
   * @param id Report ID
   */
  async deleteValidationReport(id: string): Promise<boolean> {
    return this.executeMethod<boolean>(
      'deleteValidationReport', 
      [id], 
      () => {
        this.documentResults.delete(id);
        this.fieldResults.delete(id);
        return this.validationReports.delete(id);
      }
    );
  }
  
  /**
   * Count invalid media in a report
   * @param reportId Report ID
   */
  async countInvalidMedia(reportId: string): Promise<number> {
    return this.executeMethod<number>(
      'countInvalidMedia', 
      [reportId], 
      () => {
        const fields = this.fieldResults.get(reportId) || [];
        return fields.filter(field => !field.isValid).length;
      }
    );
  }
  
  /**
   * Set mock validation reports for testing
   * @param reports Array of validation reports to use as mock data
   */
  setMockValidationReports(reports: ValidationReport[]): void {
    this.validationReports.clear();
    for (const report of reports) {
      this.validationReports.set(report.id, report);
    }
  }
  
  /**
   * Set mock media collections for testing
   * @param collections Array of media collections to use as mock data
   */
  setMockCollections(collections: MediaCollection[]): void {
    this.collections.clear();
    for (const collection of collections) {
      this.collections.set(collection.name, collection);
    }
  }
  
  /**
   * Set mock document validation results for testing
   * @param reportId Report ID
   * @param results Document validation results
   */
  setMockDocumentResults(reportId: string, results: DocumentValidationResult[]): void {
    this.documentResults.set(reportId, results);
  }
  
  /**
   * Set mock field validation results for testing
   * @param reportId Report ID
   * @param results Field validation results
   */
  setMockFieldResults(reportId: string, results: FieldValidationResult[]): void {
    this.fieldResults.set(reportId, results);
  }
  
  /**
   * Clear all mock data
   */
  clearMockData(): void {
    this.validationReports.clear();
    this.collections.clear();
    this.documentResults.clear();
    this.fieldResults.clear();
  }
}