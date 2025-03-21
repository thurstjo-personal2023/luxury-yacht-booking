/**
 * Media Repository Interface
 * 
 * This interface defines the contract for media-related persistence operations.
 */

import { Media } from '../../../core/domain/media/media';
import { MediaValidationResult } from '../../../core/domain/media/media-validation-service';

/**
 * Media validation report interface
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
 * Media URL repair report interface
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
 * Document field path description
 */
export interface DocumentFieldPath {
  collection: string;
  documentId: string;
  fieldPath: string;
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
   * Get media URLs from all database collections
   */
  getAllMediaUrls(): Promise<{ 
    documentPaths: DocumentFieldPath[]; 
    totalDocuments: number; 
    totalFields: number;
  }>;
  
  /**
   * Validate a single media URL and return the result
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