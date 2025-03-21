/**
 * Media Validation Worker Implementation
 * 
 * This module implements a worker for validating media resources across collections.
 * It processes validation tasks in the background using a queue.
 */

import { DocumentValidationResult, ValidationReport } from '../../../adapters/repositories/interfaces/media-repository';
import { IMediaRepository } from '../../../adapters/repositories/interfaces/media-repository';
import { IMediaValidationService } from '../../domain/media/media-validation-service';

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  batchSize: number;
  validateNonImageUrls: boolean;
  placeholderImageUrl: string;
  placeholderVideoUrl: string;
  autoRepairInvalidUrls: boolean;
  collections: string[];
  baseUrl: string;
}

/**
 * Media validation task input
 */
export interface MediaValidationTask {
  reportId?: string;
  collections?: string[];
  validateNonImageUrls?: boolean;
  autoRepair?: boolean;
}

/**
 * Media validation task result
 */
export interface MediaValidationTaskResult {
  reportId: string;
  success: boolean;
  error?: string;
}

/**
 * URL repair task input
 */
export interface UrlRepairTask {
  reportId: string;
  urls?: string[];
  repairAll?: boolean;
}

/**
 * URL repair task result
 */
export interface UrlRepairTaskResult {
  reportId: string;
  success: boolean;
  repairedCount: number;
  failedCount: number;
  error?: string;
}

/**
 * Media validation worker interface
 */
export interface IMediaValidationWorker {
  /**
   * Start the worker
   */
  start(): Promise<void>;
  
  /**
   * Stop the worker
   */
  stop(): Promise<void>;
  
  /**
   * Process a validation task
   */
  processValidationTask(task: MediaValidationTask): Promise<MediaValidationTaskResult>;
  
  /**
   * Process a URL repair task
   */
  processRepairTask(task: UrlRepairTask): Promise<UrlRepairTaskResult>;
  
  /**
   * Validate all collections
   */
  validateAllCollections(options?: {
    validateNonImageUrls?: boolean;
    collections?: string[];
  }): Promise<ValidationReport>;
  
  /**
   * Validate a specific collection
   */
  validateCollection(
    collection: string,
    options?: {
      validateNonImageUrls?: boolean;
      batchSize?: number;
    }
  ): Promise<DocumentValidationResult[]>;
  
  /**
   * Process documents in batches
   */
  processBatch(
    collection: string,
    startAfter: string | null,
    batchSize: number,
    validateNonImageUrls: boolean
  ): Promise<{
    results: DocumentValidationResult[];
    lastDocId: string | null;
    done: boolean;
  }>;
  
  /**
   * Queue a validation task
   */
  queueValidationTask(task: MediaValidationTask): Promise<string>;
  
  /**
   * Queue a repair task
   */
  queueRepairTask(task: UrlRepairTask): Promise<string>;
  
  /**
   * Repair invalid URLs from a report
   */
  repairUrlsFromReport(reportId: string, urls?: string[]): Promise<UrlRepairTaskResult>;
  
  /**
   * Fix relative URLs
   */
  fixRelativeUrls(): Promise<UrlRepairTaskResult>;
  
  /**
   * Resolve blob URLs
   */
  resolveBlobUrls(): Promise<UrlRepairTaskResult>;
  
  /**
   * Get the status of the worker
   */
  getStatus(): {
    isRunning: boolean;
    pendingTasks: number;
    processingTask: boolean;
    lastProcessedTaskTime?: Date;
  };
}

/**
 * Media validation worker implementation
 */
export class MediaValidationWorker implements IMediaValidationWorker {
  private isRunning: boolean = false;
  private processingTask: boolean = false;
  private lastProcessedTaskTime?: Date;
  
  constructor(
    private readonly mediaRepository: IMediaRepository,
    private readonly mediaValidationService: IMediaValidationService,
    private readonly config: MediaValidationWorkerConfig
  ) {}
  
  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    console.log('Media validation worker started');
  }
  
  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    console.log('Media validation worker stopped');
  }
  
  /**
   * Process a validation task
   */
  async processValidationTask(task: MediaValidationTask): Promise<MediaValidationTaskResult> {
    try {
      this.processingTask = true;
      
      const collections = task.collections || this.config.collections;
      const validateNonImageUrls = task.validateNonImageUrls !== undefined 
        ? task.validateNonImageUrls 
        : this.config.validateNonImageUrls;
      
      const startTime = new Date();
      const results: DocumentValidationResult[] = [];
      
      for (const collection of collections) {
        const collectionResults = await this.validateCollection(collection, {
          validateNonImageUrls,
          batchSize: this.config.batchSize
        });
        
        results.push(...collectionResults);
      }
      
      const endTime = new Date();
      const report = await this.mediaRepository.generateReport(results, startTime, endTime);
      const reportId = await this.mediaRepository.saveReport(report);
      
      if (task.autoRepair) {
        await this.repairUrlsFromReport(reportId);
      }
      
      this.lastProcessedTaskTime = new Date();
      this.processingTask = false;
      
      return {
        reportId,
        success: true
      };
    } catch (error) {
      this.processingTask = false;
      
      return {
        reportId: task.reportId || '',
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Process a URL repair task
   */
  async processRepairTask(task: UrlRepairTask): Promise<UrlRepairTaskResult> {
    try {
      this.processingTask = true;
      
      const result = await this.repairUrlsFromReport(task.reportId, task.urls);
      
      this.lastProcessedTaskTime = new Date();
      this.processingTask = false;
      
      return result;
    } catch (error) {
      this.processingTask = false;
      
      return {
        reportId: task.reportId,
        success: false,
        repairedCount: 0,
        failedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Validate all collections
   */
  async validateAllCollections(options?: {
    validateNonImageUrls?: boolean;
    collections?: string[];
  }): Promise<ValidationReport> {
    const collections = options?.collections || this.config.collections;
    const validateNonImageUrls = options?.validateNonImageUrls !== undefined 
      ? options.validateNonImageUrls 
      : this.config.validateNonImageUrls;
    
    const startTime = new Date();
    const results: DocumentValidationResult[] = [];
    
    for (const collection of collections) {
      const collectionResults = await this.validateCollection(collection, {
        validateNonImageUrls,
        batchSize: this.config.batchSize
      });
      
      results.push(...collectionResults);
    }
    
    const endTime = new Date();
    const report = await this.mediaRepository.generateReport(results, startTime, endTime);
    await this.mediaRepository.saveReport(report);
    
    return report;
  }
  
  /**
   * Validate a specific collection
   */
  async validateCollection(
    collection: string,
    options?: {
      validateNonImageUrls?: boolean;
      batchSize?: number;
    }
  ): Promise<DocumentValidationResult[]> {
    const validateNonImageUrls = options?.validateNonImageUrls !== undefined 
      ? options.validateNonImageUrls 
      : this.config.validateNonImageUrls;
    
    const batchSize = options?.batchSize || this.config.batchSize;
    let lastDocId: string | null = null;
    let done = false;
    const results: DocumentValidationResult[] = [];
    
    while (!done) {
      const batchResult = await this.processBatch(
        collection,
        lastDocId,
        batchSize,
        validateNonImageUrls
      );
      
      results.push(...batchResult.results);
      lastDocId = batchResult.lastDocId;
      done = batchResult.done;
    }
    
    return results;
  }
  
  /**
   * Process documents in batches
   */
  async processBatch(
    collection: string,
    startAfter: string | null,
    batchSize: number,
    validateNonImageUrls: boolean
  ): Promise<{
    results: DocumentValidationResult[];
    lastDocId: string | null;
    done: boolean;
  }> {
    // Implementation details will depend on the repository implementation
    throw new Error('Method not implemented');
  }
  
  /**
   * Queue a validation task
   */
  async queueValidationTask(task: MediaValidationTask): Promise<string> {
    // Implementation details will depend on the messaging/queue implementation
    throw new Error('Method not implemented');
  }
  
  /**
   * Queue a repair task
   */
  async queueRepairTask(task: UrlRepairTask): Promise<string> {
    // Implementation details will depend on the messaging/queue implementation
    throw new Error('Method not implemented');
  }
  
  /**
   * Repair invalid URLs from a report
   */
  async repairUrlsFromReport(reportId: string, urls?: string[]): Promise<UrlRepairTaskResult> {
    try {
      const report = await this.mediaRepository.getReportById(reportId);
      
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }
      
      const invalidResults = urls 
        ? report.invalidResults.filter(result => urls.includes(result.url)) 
        : report.invalidResults;
      
      const repairOptions = invalidResults.map(result => {
        const isVideo = result.mediaType === 'video' || 
          result.detectedType === 'video/mp4' || 
          result.url.includes('.mp4') ||
          result.url.includes('-SBV-') ||
          result.url.includes('Dynamic motion');
        
        const placeholderUrl = isVideo 
          ? this.config.placeholderVideoUrl 
          : this.config.placeholderImageUrl;
        
        return {
          field: result.field,
          collection: result.collection,
          documentId: result.documentId,
          oldUrl: result.url,
          newUrl: placeholderUrl
        };
      });
      
      const results = await this.mediaRepository.repairUrls(repairOptions);
      
      const successCount = results.filter(result => result.success).length;
      const failedCount = results.length - successCount;
      
      const repairReport = {
        id: '',
        timestamp: new Date(),
        totalAttempted: results.length,
        totalSuccess: successCount,
        totalFailed: failedCount,
        results
      };
      
      await this.mediaRepository.saveRepairReport(repairReport);
      
      return {
        reportId,
        success: true,
        repairedCount: successCount,
        failedCount
      };
    } catch (error) {
      return {
        reportId,
        success: false,
        repairedCount: 0,
        failedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Fix relative URLs
   */
  async fixRelativeUrls(): Promise<UrlRepairTaskResult> {
    try {
      const results = await this.mediaRepository.fixRelativeUrls(this.config.baseUrl);
      
      const successCount = results.filter(result => result.success).length;
      const failedCount = results.length - successCount;
      
      const repairReport = {
        id: '',
        timestamp: new Date(),
        totalAttempted: results.length,
        totalSuccess: successCount,
        totalFailed: failedCount,
        results
      };
      
      const reportId = await this.mediaRepository.saveRepairReport(repairReport);
      
      return {
        reportId,
        success: true,
        repairedCount: successCount,
        failedCount
      };
    } catch (error) {
      return {
        reportId: '',
        success: false,
        repairedCount: 0,
        failedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Resolve blob URLs
   */
  async resolveBlobUrls(): Promise<UrlRepairTaskResult> {
    try {
      const results = await this.mediaRepository.resolveBlobUrls(this.config.placeholderImageUrl);
      
      const successCount = results.filter(result => result.success).length;
      const failedCount = results.length - successCount;
      
      const repairReport = {
        id: '',
        timestamp: new Date(),
        totalAttempted: results.length,
        totalSuccess: successCount,
        totalFailed: failedCount,
        results
      };
      
      const reportId = await this.mediaRepository.saveRepairReport(repairReport);
      
      return {
        reportId,
        success: true,
        repairedCount: successCount,
        failedCount
      };
    } catch (error) {
      return {
        reportId: '',
        success: false,
        repairedCount: 0,
        failedCount: 0,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Get the status of the worker
   */
  getStatus(): {
    isRunning: boolean;
    pendingTasks: number;
    processingTask: boolean;
    lastProcessedTaskTime?: Date;
  } {
    return {
      isRunning: this.isRunning,
      pendingTasks: 0, // This would be retrieved from the queue in a real implementation
      processingTask: this.processingTask,
      lastProcessedTaskTime: this.lastProcessedTaskTime
    };
  }
}