/**
 * Media Validation Application Service
 * 
 * Orchestrates media validation operations across the system.
 */

import { v4 as uuidv4 } from 'uuid';
import { MediaType } from '../../domain/media/media-type';
import { URL } from '../../domain/value-objects/url';
import { DocumentValidationResult, FieldValidationResult } from '../../domain/validation/document-validation-result';
import { MediaRepairType, DocumentRepairResult, FieldRepairResult, RepairReport } from '../../domain/validation/media-repair';
import { MediaValidator, MediaValidationOptions } from '../../domain/validation/media-validator';
import { ValidationReport } from '../../domain/validation/validation-report';
import { ValidationResult } from '../../domain/validation/validation-result';
import { IMediaRepository } from '../../../adapters/repositories/interfaces/media-repository';

/**
 * Common URL fields to check for media content
 */
export const COMMON_IMAGE_FIELDS = [
  "imageUrl",
  "coverImageUrl",
  "thumbnailUrl",
  "profilePhoto",
  "logoUrl",
  "bannerUrl",
  "featuredImageUrl"
];

/**
 * Media validation service options
 */
export interface MediaValidationServiceOptions {
  validationOptions?: MediaValidationOptions;
  batchSize?: number;
  includeCollections?: string[];
  excludeCollections?: string[];
  maxDocumentsPerCollection?: number;
}

/**
 * Media validation service default options
 */
export const DEFAULT_SERVICE_OPTIONS: MediaValidationServiceOptions = {
  batchSize: 50,
  maxDocumentsPerCollection: 1000
};

/**
 * Media validation application service
 */
export class MediaValidationService {
  private repository: IMediaRepository;
  private options: MediaValidationServiceOptions;

  constructor(
    repository: IMediaRepository, 
    options: MediaValidationServiceOptions = DEFAULT_SERVICE_OPTIONS
  ) {
    this.repository = repository;
    this.options = {
      ...DEFAULT_SERVICE_OPTIONS,
      ...options
    };
  }

  /**
   * Validate a media URL
   */
  async validateUrl(
    url: string | URL, 
    expectedType: MediaType = MediaType.IMAGE
  ): Promise<ValidationResult> {
    try {
      // Apply domain validation first
      const urlString = url instanceof URL ? url.value : url;
      const domainValidation = MediaValidator.validateUrl(
        urlString, 
        expectedType, 
        this.options.validationOptions
      );

      // If the domain validator found an issue that it fixed, return that result
      if (domainValidation.url !== urlString) {
        return domainValidation;
      }

      // Otherwise, perform repository validation (which may include HTTP requests)
      return await this.repository.validateUrl(url, expectedType);
    } catch (error) {
      return ValidationResult.createInvalid(
        url instanceof URL ? url.value : url,
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  /**
   * Validate media fields in a document
   */
  async validateDocument(
    collection: string, 
    documentId: string
  ): Promise<DocumentValidationResult> {
    try {
      return await this.repository.validateDocument(collection, documentId);
    } catch (error) {
      // Create a minimal validation result if the repository validation fails
      return new DocumentValidationResult({
        collection,
        documentId,
        fields: [],
        validatedAt: new Date()
      });
    }
  }

  /**
   * Run validation across all collections
   */
  async validateAllCollections(): Promise<ValidationReport> {
    const startTime = new Date();
    const allResults: DocumentValidationResult[] = [];
    const reportId = uuidv4();

    try {
      // Get all collections
      const collections = await this.repository.getCollections();
      
      // Filter collections if needed
      let collectionsToValidate = collections;
      
      if (this.options.includeCollections && this.options.includeCollections.length > 0) {
        collectionsToValidate = collections.filter(collection => 
          this.options.includeCollections!.includes(collection)
        );
      }
      
      if (this.options.excludeCollections && this.options.excludeCollections.length > 0) {
        collectionsToValidate = collectionsToValidate.filter(collection => 
          !this.options.excludeCollections!.includes(collection)
        );
      }
      
      // Process each collection
      for (const collection of collectionsToValidate) {
        // Get documents for this collection
        const documentIds = await this.repository.getDocumentIds(
          collection, 
          this.options.maxDocumentsPerCollection
        );
        
        // Process documents in batches
        const batchSize = this.options.batchSize || 50;
        for (let i = 0; i < documentIds.length; i += batchSize) {
          const batch = documentIds.slice(i, i + batchSize);
          
          // Process each document in the batch
          for (const documentId of batch) {
            const result = await this.validateDocument(collection, documentId);
            allResults.push(result);
          }
        }
      }
      
      // Generate the validation report
      const endTime = new Date();
      const report = ValidationReport.generateFromResults(
        reportId,
        allResults,
        startTime,
        endTime
      );
      
      // Save the report
      await this.repository.saveValidationReport(report.toObject());
      
      return report;
    } catch (error) {
      // If there's an error, still generate a partial report
      const endTime = new Date();
      const report = ValidationReport.generateFromResults(
        reportId,
        allResults,
        startTime,
        endTime
      );
      
      try {
        await this.repository.saveValidationReport(report.toObject());
      } catch {
        // Ignore errors when saving partial report
      }
      
      return report;
    }
  }

  /**
   * Repair invalid media URLs based on a validation report
   */
  async repairInvalidMediaUrls(reportId: string): Promise<RepairReport> {
    const startTime = new Date();
    const repairResults: DocumentRepairResult[] = [];
    const repairReportId = uuidv4();

    try {
      // Get the validation report
      const report = await this.repository.getValidationReport(reportId);
      
      if (!report) {
        throw new Error(`Validation report with ID ${reportId} not found`);
      }
      
      // Process each invalid result
      const groupedResults = this.groupInvalidResultsByDocument(report.invalidResults);
      
      for (const [collectionAndDocId, invalidFields] of groupedResults.entries()) {
        const [collection, documentId] = collectionAndDocId.split('||');
        
        // Prepare repairs for this document
        const fieldUpdates: Record<string, string> = {};
        const repairDetails: FieldRepairResult[] = [];
        
        for (const field of invalidFields) {
          // Determine the type of repair needed
          let repairType: MediaRepairType;
          let fixedUrl: string;
          
          if (field.url.startsWith('/')) {
            // Fix relative URL
            repairType = MediaRepairType.RELATIVE_URL_FIX;
            fixedUrl = `${this.options.validationOptions?.baseUrl || ''}${field.url}`;
          } else if (field.url.startsWith('blob:')) {
            // Replace blob URL
            repairType = MediaRepairType.BLOB_URL_RESOLVE;
            fixedUrl = this.options.validationOptions?.placeholderUrl || 
              'https://etoile-yachts.firebasestorage.app/yacht-placeholder.jpg';
          } else if (field.error && field.error.includes('Expected image, got video')) {
            // Fix media type mismatch
            repairType = MediaRepairType.MEDIA_TYPE_CORRECTION;
            // Just update media type, not URL
            fixedUrl = field.url;
          } else {
            // Use placeholder for other issues
            repairType = MediaRepairType.PLACEHOLDER_INSERTION;
            fixedUrl = this.options.validationOptions?.placeholderUrl || 
              'https://etoile-yachts.firebasestorage.app/yacht-placeholder.jpg';
          }
          
          // Add to updates
          fieldUpdates[field.field] = fixedUrl;
          
          // Record the repair details
          repairDetails.push({
            path: field.field,
            originalValue: field.url,
            newValue: fixedUrl,
            repairType
          });
        }
        
        // Apply the repairs to the document
        if (Object.keys(fieldUpdates).length > 0) {
          const success = await this.repository.repairDocument(
            collection,
            documentId,
            fieldUpdates
          );
          
          if (success) {
            repairResults.push(new DocumentRepairResult({
              collection,
              documentId,
              fields: repairDetails,
              repairedAt: new Date()
            }));
          }
        }
      }
      
      // Generate the repair report
      const endTime = new Date();
      const repairReport = RepairReport.generateFromResults(
        repairReportId,
        repairResults,
        startTime,
        endTime
      );
      
      // Save the report
      // Note: saveRepairReport method would need to be added to the repository interface
      // await this.repository.saveRepairReport(repairReport.toObject());
      
      return repairReport;
    } catch (error) {
      // If there's an error, still generate a partial report
      const endTime = new Date();
      const repairReport = RepairReport.generateFromResults(
        repairReportId,
        repairResults,
        startTime,
        endTime
      );
      
      return repairReport;
    }
  }

  /**
   * Group invalid results by document for efficient repair
   */
  private groupInvalidResultsByDocument(
    invalidResults: InvalidFieldResult[]
  ): Map<string, InvalidFieldResult[]> {
    const grouped = new Map<string, InvalidFieldResult[]>();
    
    for (const result of invalidResults) {
      const key = `${result.collection}||${result.documentId}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(result);
    }
    
    return grouped;
  }
}