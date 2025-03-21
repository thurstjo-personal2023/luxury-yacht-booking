/**
 * Media Validation Service
 * 
 * This application service coordinates media validation operations.
 * It uses the media validation worker and repository to perform validation
 * and repair operations on media URLs.
 */

import { IMediaRepository, MediaRepairReport, MediaValidationReport } from '../../../adapters/repositories/interfaces/media-repository';
import { MediaValidationWorker, MediaValidationWorkerConfig, ProcessingProgress } from './media-validation-worker';

/**
 * Media validation service configuration
 */
export interface MediaValidationServiceConfig {
  workerConfig: MediaValidationWorkerConfig;
  baseUrl: string; // Base URL for converting relative URLs to absolute
}

/**
 * Media validation service
 */
export class MediaValidationService {
  private mediaRepository: IMediaRepository;
  private worker: MediaValidationWorker;
  private config: MediaValidationServiceConfig;
  
  constructor(mediaRepository: IMediaRepository, config: MediaValidationServiceConfig) {
    this.mediaRepository = mediaRepository;
    this.config = config;
    this.worker = new MediaValidationWorker(mediaRepository, config.workerConfig);
  }
  
  /**
   * Get the current validation progress
   */
  getValidationProgress(): ProcessingProgress {
    return this.worker.getProgress();
  }
  
  /**
   * Start a validation process
   */
  async startValidation(): Promise<MediaValidationReport> {
    return this.worker.startValidation();
  }
  
  /**
   * Stop an ongoing validation process
   */
  stopValidation(): void {
    this.worker.stopValidation();
  }
  
  /**
   * Resume a paused validation process
   */
  async resumeValidation(): Promise<MediaValidationReport> {
    return this.worker.resumeValidation();
  }
  
  /**
   * Get the most recent validation report
   */
  async getLatestValidationReport(): Promise<MediaValidationReport | null> {
    return this.mediaRepository.getLatestValidationReport();
  }
  
  /**
   * Get a validation report by ID
   */
  async getValidationReportById(reportId: string): Promise<MediaValidationReport | null> {
    return this.mediaRepository.getValidationReportById(reportId);
  }
  
  /**
   * List validation reports with pagination
   */
  async listValidationReports(
    page: number = 1, 
    pageSize: number = 10
  ): Promise<{
    reports: MediaValidationReport[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;
    const { reports, total } = await this.mediaRepository.listValidationReports(pageSize, offset);
    
    return {
      reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
  
  /**
   * Repair invalid media URLs based on the latest validation report
   */
  async repairInvalidMediaUrls(): Promise<void> {
    await this.worker.repairInvalidUrls();
  }
  
  /**
   * Resolve blob URLs to permanent storage URLs
   */
  async resolveBlobUrls(): Promise<void> {
    await this.worker.resolveBlobUrls();
  }
  
  /**
   * Fix relative URLs by converting them to absolute URLs
   */
  async fixRelativeUrls(): Promise<void> {
    await this.worker.fixRelativeUrls(this.config.baseUrl);
  }
  
  /**
   * Get a repair report by ID
   */
  async getRepairReportById(reportId: string): Promise<MediaRepairReport | null> {
    return this.mediaRepository.getRepairReportById(reportId);
  }
  
  /**
   * List repair reports with pagination
   */
  async listRepairReports(
    page: number = 1, 
    pageSize: number = 10
  ): Promise<{
    reports: MediaRepairReport[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const offset = (page - 1) * pageSize;
    const { reports, total } = await this.mediaRepository.listRepairReports(pageSize, offset);
    
    return {
      reports,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize)
    };
  }
  
  /**
   * Run a comprehensive media validation pipeline:
   * 1. Validate all media URLs
   * 2. Resolve any blob URLs
   * 3. Fix relative URLs
   * 4. Repair invalid URLs
   */
  async runComprehensiveValidation(): Promise<{
    validationReport: MediaValidationReport;
    blobsResolved: boolean;
    relativesFixed: boolean;
    invalidRepaired: boolean;
  }> {
    // 1. Validate all media URLs
    const validationReport = await this.startValidation();
    
    // 2. Resolve blob URLs
    await this.resolveBlobUrls();
    
    // 3. Fix relative URLs
    await this.fixRelativeUrls();
    
    // 4. Repair invalid URLs
    await this.repairInvalidMediaUrls();
    
    return {
      validationReport,
      blobsResolved: true,
      relativesFixed: true,
      invalidRepaired: true
    };
  }
}