/**
 * Media Repository Interface
 * 
 * This interface defines the contract for media repository implementations.
 * It specifies methods for storing, retrieving, and validating media.
 */

import { Media } from '../../../core/domain/media/media';
import { MediaValidationResult } from '../../../core/domain/media/media-validation-service';

/**
 * Document field path identifies a specific field in a document
 */
export interface DocumentFieldPath {
  collection: string;
  documentId: string;
  fieldPath: string;
}

/**
 * Collection summary in a media validation report
 */
export interface CollectionSummary {
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
 * Media validation report
 */
export interface MediaValidationReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalDocuments: number;
  totalFields: number;
  validUrls: number;
  invalidUrls: number;
  missingUrls: number;
  collectionSummaries: CollectionSummary[];
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
 * Media repair report
 */
export interface MediaRepairReport {
  id: string;
  startTime: Date;
  endTime: Date;
  duration: number;
  totalRepairedUrls: number;
  failedRepairs: number;
  collectionSummaries: {
    collection: string;
    repairedUrls: number;
    failedRepairs: number;
  }[];
  repairs: {
    collection: string;
    documentId: string;
    field: string;
    oldUrl: string;
    newUrl: string;
    success: boolean;
    error?: string;
  }[];
}

/**
 * Media repository interface
 */
export interface IMediaRepository {
  /**
   * Save a media entry
   */
  saveMedia(media: Media): Promise<Media>;
  
  /**
   * Find media by URL
   */
  findByUrl(url: string): Promise<Media | null>;
  
  /**
   * Delete media by URL
   */
  deleteByUrl(url: string): Promise<boolean>;
  
  /**
   * Get all media URLs from all database collections
   */
  getAllMediaUrls(): Promise<{ 
    documentPaths: DocumentFieldPath[]; 
    totalDocuments: number; 
    totalFields: number; 
  }>;
  
  /**
   * Validate a single media URL
   */
  validateMediaUrl(url: string, expectedType?: string): Promise<MediaValidationResult>;
  
  /**
   * Save a validation report
   */
  saveValidationReport(report: Omit<MediaValidationReport, 'id'>): Promise<MediaValidationReport>;
  
  /**
   * Get the most recent validation report
   */
  getLatestValidationReport(): Promise<MediaValidationReport | null>;
  
  /**
   * Get a validation report by ID
   */
  getValidationReportById(reportId: string): Promise<MediaValidationReport | null>;
  
  /**
   * List validation reports with pagination
   */
  listValidationReports(limit: number, offset: number): Promise<{
    reports: MediaValidationReport[];
    total: number;
  }>;
  
  /**
   * Repair invalid media URLs
   */
  repairMediaUrls(invalidUrls: DocumentFieldPath[], placeholderUrl: string): Promise<MediaRepairReport>;
  
  /**
   * Get repair report by ID
   */
  getRepairReportById(reportId: string): Promise<MediaRepairReport | null>;
  
  /**
   * List repair reports with pagination
   */
  listRepairReports(limit: number, offset: number): Promise<{
    reports: MediaRepairReport[];
    total: number;
  }>;
  
  /**
   * Resolve blob URLs to permanent storage URLs
   */
  resolveBlobUrls(blobUrls: DocumentFieldPath[]): Promise<MediaRepairReport>;
  
  /**
   * Fix relative URLs by converting them to absolute URLs
   */
  fixRelativeUrls(relativeUrls: DocumentFieldPath[], baseUrl: string): Promise<MediaRepairReport>;
}