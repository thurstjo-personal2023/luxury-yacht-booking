/**
 * Media Repository Interface
 * 
 * Defines the contract for media data persistence operations.
 */

import { Media } from '../../../core/domain/media/media';
import { MediaType } from '../../../core/domain/media/media-type';
import { URL } from '../../../core/domain/value-objects/url';

/**
 * Media validation result
 */
export interface MediaValidationResult {
  url: string;
  isValid: boolean;
  error?: string;
  statusCode?: number;
  mimeType?: string;
  size?: number;
  width?: number;
  height?: number;
  validatedAt: Date;
}

/**
 * Media search criteria
 */
export interface MediaSearchCriteria {
  type?: MediaType;
  isValid?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  validatedAfter?: Date;
  validatedBefore?: Date;
  limit?: number;
  offset?: number;
  collection?: string;
  documentId?: string;
  ownerId?: string;
  containsText?: string;
}

/**
 * Document validation result
 */
export interface DocumentValidationResult {
  collection: string;
  documentId: string;
  fields: {
    path: string;
    url: string;
    expectedType: MediaType;
    isValid: boolean;
    error?: string;
    statusCode?: number;
    mimeType?: string;
  }[];
  validatedAt: Date;
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
  collectionSummaries: {
    collection: string;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    validPercent: number;
    invalidPercent: number;
    missingPercent: number;
  }[];
  invalidResults: {
    field: string;
    url: string;
    isValid: boolean;
    status?: number;
    statusText?: string;
    error?: string;
    collection: string;
    documentId: string;
  }[];
}

/**
 * Media repository interface
 */
export interface IMediaRepository {
  /**
   * Find media by ID
   */
  findById(id: string): Promise<Media | null>;
  
  /**
   * Find media by URL
   */
  findByUrl(url: URL | string): Promise<Media | null>;
  
  /**
   * Find media by type
   */
  findByType(type: MediaType): Promise<Media[]>;
  
  /**
   * Search for media based on criteria
   */
  search(criteria: MediaSearchCriteria): Promise<Media[]>;
  
  /**
   * Count media matching criteria
   */
  count(criteria: MediaSearchCriteria): Promise<number>;
  
  /**
   * Save media (create or update)
   */
  save(media: Media): Promise<Media>;
  
  /**
   * Create new media
   */
  create(media: Media): Promise<Media>;
  
  /**
   * Update existing media
   */
  update(media: Media): Promise<Media>;
  
  /**
   * Delete media by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Validate a media URL
   */
  validateUrl(url: URL | string, expectedType?: MediaType): Promise<MediaValidationResult>;
  
  /**
   * Validate media in a document
   */
  validateDocument(collection: string, documentId: string): Promise<DocumentValidationResult>;
  
  /**
   * Get all collections in the database
   */
  getCollections(): Promise<string[]>;
  
  /**
   * Get document IDs for a collection
   */
  getDocumentIds(collection: string, limit?: number): Promise<string[]>;
  
  /**
   * Save a validation report
   */
  saveValidationReport(report: Omit<ValidationReport, 'id'>): Promise<ValidationReport>;
  
  /**
   * Get a validation report by ID
   */
  getValidationReport(reportId: string): Promise<ValidationReport | null>;
  
  /**
   * Get all validation reports
   */
  getValidationReports(limit?: number): Promise<ValidationReport[]>;
  
  /**
   * Update a document with repaired media URLs
   */
  repairDocument(
    collection: string,
    documentId: string,
    updates: Record<string, string>
  ): Promise<boolean>;
  
  /**
   * Get media URLs from a document
   */
  getMediaUrlsFromDocument(collection: string, documentId: string): Promise<{
    field: string;
    url: string;
    expectedType: MediaType;
  }[]>;
}