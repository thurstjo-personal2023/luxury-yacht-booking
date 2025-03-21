/**
 * Media Repository Interface
 * 
 * This interface defines the contract for media repository implementations.
 * It is responsible for validating, storing, and retrieving media resources.
 */

import { Media } from '../../../core/domain/media/media';

/**
 * Media validation result
 */
export interface MediaValidationResult {
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  error?: string;
}

/**
 * Document field path
 */
export interface DocumentFieldPath {
  collection: string;
  documentId: string;
  field: string;
}

/**
 * Collection validation options
 */
export interface CollectionValidationOptions {
  collection: string;
  batchSize?: number;
  mediaFieldPaths?: string[];
  skipValidation?: boolean;
  limit?: number;
  validateNonImageUrls?: boolean;
}

/**
 * Media URL validation result with document context
 */
export interface DocumentUrlValidationResult extends MediaValidationResult {
  url: string;
  collection: string;
  documentId: string;
  field: string;
  mediaType: 'image' | 'video' | 'unknown';
  isValid: boolean;
  detectedType?: string;
  expectedType?: string;
}

/**
 * Document validation result
 */
export interface DocumentValidationResult {
  collection: string;
  documentId: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  results: DocumentUrlValidationResult[];
}

/**
 * Collection validation summary
 */
export interface CollectionValidationSummary {
  collection: string;
  totalUrls: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  validPercent: number;
  invalidPercent: number;
  missingPercent: number;
}

/**
 * Validation report
 */
export interface ValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionValidationSummary[];
  invalidResults: DocumentUrlValidationResult[];
}

/**
 * URL repair options
 */
export interface UrlRepairOptions {
  field: string;
  collection: string;
  documentId: string;
  oldUrl: string;
  newUrl: string;
}

/**
 * URL repair result
 */
export interface UrlRepairResult {
  success: boolean;
  field: string;
  collection: string;
  documentId: string;
  oldUrl: string;
  newUrl: string;
  error?: string;
}

/**
 * Repair report
 */
export interface RepairReport {
  id: string;
  timestamp: Date;
  totalAttempted: number;
  totalSuccess: number;
  totalFailed: number;
  results: UrlRepairResult[];
}

/**
 * Media repository interface
 */
export interface IMediaRepository {
  /**
   * Save a media resource
   */
  saveMedia(media: Media): Promise<Media>;
  
  /**
   * Get a media resource by ID
   */
  getMediaById(id: string): Promise<Media | null>;
  
  /**
   * Validate a media URL
   */
  validateMediaUrl(url: string, mediaType?: 'image' | 'video'): Promise<MediaValidationResult>;
  
  /**
   * Validate a document field containing a media URL
   */
  validateDocumentField(
    collection: string,
    documentId: string,
    field: string
  ): Promise<DocumentUrlValidationResult>;
  
  /**
   * Validate all media URLs in a document
   */
  validateDocument(
    collection: string,
    documentId: string
  ): Promise<DocumentValidationResult>;
  
  /**
   * Validate all media URLs in a collection
   */
  validateCollection(
    options: CollectionValidationOptions
  ): Promise<DocumentValidationResult[]>;
  
  /**
   * Generate a validation report
   */
  generateReport(
    results: DocumentValidationResult[],
    startTime: Date,
    endTime: Date
  ): Promise<ValidationReport>;
  
  /**
   * Save a validation report
   */
  saveReport(report: ValidationReport): Promise<string>;
  
  /**
   * Get a validation report by ID
   */
  getReportById(id: string): Promise<ValidationReport | null>;
  
  /**
   * Get all validation reports
   */
  getAllReports(): Promise<ValidationReport[]>;
  
  /**
   * Repair a broken URL
   */
  repairUrl(options: UrlRepairOptions): Promise<UrlRepairResult>;
  
  /**
   * Repair multiple broken URLs
   */
  repairUrls(options: UrlRepairOptions[]): Promise<UrlRepairResult[]>;
  
  /**
   * Save a repair report
   */
  saveRepairReport(report: RepairReport): Promise<string>;
  
  /**
   * Get a repair report by ID
   */
  getRepairReportById(id: string): Promise<RepairReport | null>;
  
  /**
   * Get all repair reports
   */
  getAllRepairReports(): Promise<RepairReport[]>;
  
  /**
   * Find all relative URLs in the database
   */
  findRelativeUrls(): Promise<DocumentUrlValidationResult[]>;
  
  /**
   * Find all blob URLs in the database
   */
  findBlobUrls(): Promise<DocumentUrlValidationResult[]>;
  
  /**
   * Fix relative URLs by adding base URL
   */
  fixRelativeUrls(baseUrl: string): Promise<UrlRepairResult[]>;
  
  /**
   * Resolve blob URLs by replacing with placeholder
   */
  resolveBlobUrls(placeholderUrl: string): Promise<UrlRepairResult[]>;
}