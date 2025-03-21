/**
 * Media Repository Interface
 * 
 * Defines the contract for media repository implementations.
 */

import { DocumentValidationResult } from '../../../core/domain/validation/document-validation-result';
import { Media } from '../../../core/domain/media/media';
import { MediaType } from '../../../core/domain/media/media-type';

/**
 * Media repository interface
 */
export interface IMediaRepository {
  /**
   * Get all collections
   */
  getCollections(): Promise<string[]>;
  
  /**
   * Get document IDs for a collection
   * Optionally limited by batch size and starting index for pagination
   */
  getDocumentIds(
    collection: string,
    limit?: number,
    startIndex?: number
  ): Promise<string[]>;
  
  /**
   * Get a document by ID
   */
  getDocument(
    collection: string,
    documentId: string
  ): Promise<Record<string, any>>;
  
  /**
   * Get all media URLs in a document
   * Returns a map of field paths to URLs
   */
  getMediaUrls(
    collection: string,
    documentId: string
  ): Promise<Map<string, string>>;
  
  /**
   * Get media type from URL or content
   */
  getMediaTypeFromUrl(url: string): Promise<MediaType>;
  
  /**
   * Check if a URL is valid and accessible
   */
  validateUrl(url: string, expectedType?: MediaType): Promise<{
    isValid: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
    error?: string;
  }>;
  
  /**
   * Save validation result
   */
  saveValidationResult(
    result: DocumentValidationResult,
    reportId: string
  ): Promise<void>;
  
  /**
   * Get summary of validation reports
   */
  getValidationReports(): Promise<{
    id: string;
    startTime: Date;
    endTime: Date;
    totalDocuments: number;
    validUrlsPercent: number;
    invalidUrlsPercent: number;
  }[]>;
  
  /**
   * Get details of a validation report
   */
  getValidationReport(reportId: string): Promise<{
    id: string;
    startTime: Date;
    endTime: Date;
    totalDocuments: number;
    totalFields: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    collectionSummaries: Array<{
      collection: string;
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }>;
    invalidResults: Array<{
      collection: string;
      documentId: string;
      field: string;
      url: string;
      error: string;
    }>;
  }>;
  
  /**
   * Update document fields
   */
  updateDocument(
    collection: string,
    documentId: string,
    updates: Record<string, any>
  ): Promise<void>;
  
  /**
   * Replace a field's value in a document
   */
  replaceFieldValue(
    collection: string,
    documentId: string,
    fieldPath: string,
    value: any
  ): Promise<void>;
  
  /**
   * Create a placeholder media object
   */
  createPlaceholderMedia(type: MediaType): Promise<Media>;
}