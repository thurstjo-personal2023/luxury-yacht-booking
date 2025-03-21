/**
 * Media Validation Worker Service
 * 
 * This service manages the background processing of media validation tasks.
 * It uses the media validation domain service to validate media URLs and
 * updates the validation results through the media repository.
 */

import { MediaValidationService, MediaValidationResult } from '../../domain/media/media-validation-service';
import { DocumentFieldPath, IMediaRepository, MediaValidationReport } from '../../../adapters/repositories/interfaces/media-repository';

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  batchSize: number;          // Number of URLs to validate in a batch
  maxConcurrent: number;      // Maximum concurrent validations
  pauseBetweenBatches: number; // Pause in milliseconds between batches
  timeoutSeconds: number;     // Timeout for each validation request
  maxTotalUrls?: number;      // Maximum total URLs to validate (for testing)
  placeholderUrl: string;     // Placeholder URL for replacement of invalid media
}

/**
 * Media validation processing status
 */
export enum ProcessingStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Processing progress interface
 */
export interface ProcessingProgress {
  status: ProcessingStatus;
  totalUrls: number;
  processedUrls: number;
  validUrls: number;
  invalidUrls: number;
  startTime?: Date;
  estimatedTimeRemaining?: number;
  error?: string;
  currentCollection?: string;
  currentBatch?: number;
  totalBatches?: number;
}

/**
 * Media validation worker service
 */
export class MediaValidationWorker {
  private config: MediaValidationWorkerConfig;
  private mediaRepository: IMediaRepository;
  private progress: ProcessingProgress;
  private validationResults: MediaValidationResult[] = [];
  private documentPaths: DocumentFieldPath[] = [];
  private isStopRequested = false;
  
  constructor(mediaRepository: IMediaRepository, config: MediaValidationWorkerConfig) {
    this.mediaRepository = mediaRepository;
    this.config = {
      batchSize: 50,                     // Default batch size
      maxConcurrent: 5,                  // Default concurrent validations
      pauseBetweenBatches: 1000,         // Default pause between batches (1 second)
      timeoutSeconds: 10,                // Default timeout per request
      placeholderUrl: '/placeholder.jpg', // Default placeholder URL
      ...config
    };
    
    this.progress = {
      status: ProcessingStatus.IDLE,
      totalUrls: 0,
      processedUrls: 0,
      validUrls: 0,
      invalidUrls: 0
    };
  }
  
  /**
   * Get the current progress of the validation process
   */
  getProgress(): ProcessingProgress {
    return { ...this.progress };
  }
  
  /**
   * Start the validation process
   */
  async startValidation(): Promise<MediaValidationReport> {
    // Reset validation state
    this.isStopRequested = false;
    this.validationResults = [];
    this.documentPaths = [];
    
    // Initialize progress
    this.progress = {
      status: ProcessingStatus.RUNNING,
      totalUrls: 0,
      processedUrls: 0,
      validUrls: 0,
      invalidUrls: 0,
      startTime: new Date()
    };
    
    try {
      // Get all media URLs from the database
      const { documentPaths, totalDocuments, totalFields } = await this.mediaRepository.getAllMediaUrls();
      
      // Limit the total URLs for testing if configured
      this.documentPaths = this.config.maxTotalUrls 
        ? documentPaths.slice(0, this.config.maxTotalUrls) 
        : documentPaths;
      
      this.progress.totalUrls = this.documentPaths.length;
      this.progress.totalBatches = Math.ceil(this.progress.totalUrls / this.config.batchSize);
      
      // Process URLs in batches
      for (let i = 0; i < this.documentPaths.length; i += this.config.batchSize) {
        // Check if stop was requested
        if (this.isStopRequested) {
          this.progress.status = ProcessingStatus.PAUSED;
          break;
        }
        
        const batch = this.documentPaths.slice(i, i + this.config.batchSize);
        this.progress.currentBatch = Math.floor(i / this.config.batchSize) + 1;
        
        // Process batch concurrently
        await this.processBatch(batch);
        
        // Update estimated time remaining
        if (this.progress.processedUrls > 0 && this.progress.startTime) {
          const elapsedMs = new Date().getTime() - this.progress.startTime.getTime();
          const msPerUrl = elapsedMs / this.progress.processedUrls;
          const remainingUrls = this.progress.totalUrls - this.progress.processedUrls;
          this.progress.estimatedTimeRemaining = msPerUrl * remainingUrls;
        }
        
        // Pause between batches
        if (i + this.config.batchSize < this.documentPaths.length) {
          await new Promise(resolve => setTimeout(resolve, this.config.pauseBetweenBatches));
        }
      }
      
      // Generate and save validation report
      const endTime = new Date();
      const report = this.generateReport(
        this.validationResults, 
        this.progress.startTime || new Date(), 
        endTime,
        totalDocuments,
        totalFields
      );
      
      // Save report to repository
      const savedReport = await this.mediaRepository.saveValidationReport(report);
      
      // Update progress
      this.progress.status = ProcessingStatus.COMPLETED;
      
      return savedReport;
    } catch (error) {
      // Handle errors
      this.progress.status = ProcessingStatus.FAILED;
      this.progress.error = error instanceof Error ? error.message : String(error);
      throw error;
    }
  }
  
  /**
   * Stop the validation process
   */
  stopValidation(): void {
    this.isStopRequested = true;
  }
  
  /**
   * Resume a paused validation process
   */
  async resumeValidation(): Promise<MediaValidationReport> {
    if (this.progress.status !== ProcessingStatus.PAUSED) {
      throw new Error('Cannot resume validation that is not paused');
    }
    
    this.isStopRequested = false;
    this.progress.status = ProcessingStatus.RUNNING;
    
    return this.startValidation();
  }
  
  /**
   * Process a batch of URLs concurrently
   */
  private async processBatch(batch: DocumentFieldPath[]): Promise<void> {
    // Process URLs in chunks to limit concurrency
    const chunkSize = this.config.maxConcurrent;
    
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      
      // Process chunk concurrently
      const chunkPromises = chunk.map(documentPath => this.processUrl(documentPath));
      const chunkResults = await Promise.all(chunkPromises);
      
      // Update validation results and progress
      this.validationResults.push(...chunkResults);
      this.progress.processedUrls += chunkResults.length;
      this.progress.validUrls += chunkResults.filter(result => result.isValid).length;
      this.progress.invalidUrls += chunkResults.filter(result => !result.isValid).length;
    }
  }
  
  /**
   * Process a single URL
   */
  private async processUrl(documentPath: DocumentFieldPath): Promise<MediaValidationResult> {
    try {
      // Extract URL from document path
      const url = documentPath.fieldPath.split('.').reduce((obj, key) => obj?.[key], documentPath);
      
      if (!url || typeof url !== 'string') {
        return {
          isValid: false,
          url: 'undefined',
          type: 'image',
          error: 'Missing URL'
        };
      }
      
      // Update progress with current collection
      this.progress.currentCollection = documentPath.collection;
      
      // Validate the URL
      const result = await this.mediaRepository.validateMediaUrl(url);
      
      // Add document path information to the result
      return {
        ...result,
        documentPath
      };
    } catch (error) {
      // Handle validation errors
      return {
        isValid: false,
        url: documentPath.fieldPath,
        type: 'image',
        error: error instanceof Error ? error.message : String(error),
        documentPath
      };
    }
  }
  
  /**
   * Generate a validation report from the results
   */
  private generateReport(
    results: MediaValidationResult[], 
    startTime: Date, 
    endTime: Date,
    totalDocuments: number,
    totalFields: number
  ): Omit<MediaValidationReport, 'id'> {
    // Group results by collection
    const collectionGroups = results.reduce((groups, result) => {
      const documentPath = result.documentPath as DocumentFieldPath;
      const collection = documentPath?.collection || 'unknown';
      
      if (!groups[collection]) {
        groups[collection] = {
          collection,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0
        };
      }
      
      groups[collection].totalUrls++;
      
      if (!result.url) {
        groups[collection].missingUrls++;
      } else if (result.isValid) {
        groups[collection].validUrls++;
      } else {
        groups[collection].invalidUrls++;
      }
      
      return groups;
    }, {} as Record<string, {
      collection: string;
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }>);
    
    // Calculate collection summaries with percentages
    const collectionSummaries = Object.values(collectionGroups).map(group => {
      return {
        ...group,
        validPercent: group.totalUrls > 0 ? (group.validUrls / group.totalUrls) * 100 : 0,
        invalidPercent: group.totalUrls > 0 ? (group.invalidUrls / group.totalUrls) * 100 : 0,
        missingPercent: group.totalUrls > 0 ? (group.missingUrls / group.totalUrls) * 100 : 0
      };
    });
    
    // Format invalid results for the report
    const invalidResults = results
      .filter(result => !result.isValid)
      .map(result => {
        const documentPath = result.documentPath as DocumentFieldPath;
        return {
          field: documentPath?.fieldPath || 'unknown',
          url: result.url,
          isValid: result.isValid,
          status: result.status,
          statusText: result.statusText,
          error: result.error,
          collection: documentPath?.collection || 'unknown',
          documentId: documentPath?.documentId || 'unknown'
        };
      });
    
    // Calculate total counts
    const validUrls = results.filter(result => result.isValid).length;
    const invalidUrls = results.filter(result => !result.isValid).length;
    const missingUrls = results.filter(result => !result.url).length;
    
    // Calculate duration in milliseconds
    const duration = endTime.getTime() - startTime.getTime();
    
    return {
      startTime,
      endTime,
      duration,
      totalDocuments,
      totalFields,
      validUrls,
      invalidUrls,
      missingUrls,
      collectionSummaries,
      invalidResults
    };
  }
  
  /**
   * Repair invalid media URLs
   */
  async repairInvalidUrls(): Promise<void> {
    // Get the latest validation report
    const report = await this.mediaRepository.getLatestValidationReport();
    
    if (!report) {
      throw new Error('No validation report found');
    }
    
    // Extract invalid URLs from the report
    const invalidUrlPaths = report.invalidResults.map(result => {
      return {
        collection: result.collection,
        documentId: result.documentId,
        fieldPath: result.field
      };
    });
    
    // Repair invalid URLs
    await this.mediaRepository.repairMediaUrls(invalidUrlPaths, this.config.placeholderUrl);
  }
  
  /**
   * Resolve blob URLs
   */
  async resolveBlobUrls(): Promise<void> {
    // Get all media URLs
    const { documentPaths } = await this.mediaRepository.getAllMediaUrls();
    
    // Find blob URLs
    const blobUrls = documentPaths.filter(path => {
      const url = path.fieldPath.split('.').reduce((obj, key) => obj?.[key], path);
      return typeof url === 'string' && url.startsWith('blob:');
    });
    
    // Resolve blob URLs
    if (blobUrls.length > 0) {
      await this.mediaRepository.resolveBlobUrls(blobUrls);
    }
  }
  
  /**
   * Fix relative URLs
   */
  async fixRelativeUrls(baseUrl: string): Promise<void> {
    // Get all media URLs
    const { documentPaths } = await this.mediaRepository.getAllMediaUrls();
    
    // Find relative URLs
    const relativeUrls = documentPaths.filter(path => {
      const url = path.fieldPath.split('.').reduce((obj, key) => obj?.[key], path);
      return typeof url === 'string' && url.startsWith('/') && !url.startsWith('//');
    });
    
    // Fix relative URLs
    if (relativeUrls.length > 0) {
      await this.mediaRepository.fixRelativeUrls(relativeUrls, baseUrl);
    }
  }
}