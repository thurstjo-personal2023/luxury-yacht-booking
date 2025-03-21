/**
 * Media Validation Worker
 * 
 * This worker handles the background processing of media validation tasks.
 * It validates media URLs, identifies issues, and can repair broken URLs.
 */

import { Media, MediaType } from '../../domain/media/media';
import { MediaValidationResult } from '../../domain/media/media-validation-service';
import { 
  DocumentFieldPath, 
  IMediaRepository, 
  MediaRepairReport, 
  MediaValidationReport 
} from '../../../adapters/repositories/interfaces/media-repository';

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  batchSize: number;              // Number of URLs to process in each batch
  maxConcurrent: number;          // Maximum number of concurrent validations
  pauseBetweenBatches: number;    // Pause between batches in milliseconds
  timeoutSeconds: number;         // Timeout for URL validation in seconds
  placeholderUrl: string;         // URL to use as placeholder for invalid media
}

/**
 * Default configuration for media validation worker
 */
export const DEFAULT_WORKER_CONFIG: MediaValidationWorkerConfig = {
  batchSize: 50,
  maxConcurrent: 5,
  pauseBetweenBatches: 1000,
  timeoutSeconds: 10,
  placeholderUrl: 'https://etoile-yachts.com/placeholder-image.jpg'
};

/**
 * Validation progress status
 */
export enum ValidationStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Processing progress information
 */
export interface ProcessingProgress {
  status: ValidationStatus;
  totalItems: number;
  processedItems: number;
  successItems: number;
  failedItems: number;
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration: number;
  error?: string;
}

/**
 * Media validation worker
 */
export class MediaValidationWorker {
  private repository: IMediaRepository;
  private config: MediaValidationWorkerConfig;
  private isRunning: boolean = false;
  private isStopping: boolean = false;
  private isPaused: boolean = false;
  
  private progress: ProcessingProgress = {
    status: ValidationStatus.IDLE,
    totalItems: 0,
    processedItems: 0,
    successItems: 0,
    failedItems: 0,
    progress: 0,
    duration: 0
  };
  
  private cachedMediaUrls?: {
    documentPaths: DocumentFieldPath[];
    totalDocuments: number;
    totalFields: number;
  };
  
  private latestReport?: MediaValidationReport;
  
  constructor(repository: IMediaRepository, config: MediaValidationWorkerConfig = DEFAULT_WORKER_CONFIG) {
    this.repository = repository;
    this.config = { 
      batchSize: config.batchSize || DEFAULT_WORKER_CONFIG.batchSize,
      maxConcurrent: config.maxConcurrent || DEFAULT_WORKER_CONFIG.maxConcurrent,
      pauseBetweenBatches: config.pauseBetweenBatches || DEFAULT_WORKER_CONFIG.pauseBetweenBatches,
      timeoutSeconds: config.timeoutSeconds || DEFAULT_WORKER_CONFIG.timeoutSeconds,
      placeholderUrl: config.placeholderUrl || DEFAULT_WORKER_CONFIG.placeholderUrl
    };
  }
  
  /**
   * Get the current validation progress
   */
  getProgress(): ProcessingProgress {
    return { ...this.progress };
  }
  
  /**
   * Start the validation process
   */
  async startValidation(): Promise<MediaValidationReport> {
    if (this.isRunning) {
      throw new Error('Validation is already running');
    }
    
    this.reset();
    this.isRunning = true;
    this.progress.status = ValidationStatus.RUNNING;
    this.progress.startTime = new Date();
    
    try {
      // Get all media URLs from the database
      const { documentPaths, totalDocuments, totalFields } = await this.repository.getAllMediaUrls();
      this.cachedMediaUrls = { documentPaths, totalDocuments, totalFields };
      
      this.progress.totalItems = documentPaths.length;
      
      // Process URLs in batches
      const results = await this.processUrlBatches(documentPaths);
      
      // Generate report
      const report = await this.generateReport(results, totalDocuments, totalFields);
      this.latestReport = report;
      
      // Update progress
      this.progress.endTime = new Date();
      this.progress.duration = this.progress.endTime.getTime() - (this.progress.startTime?.getTime() || 0);
      this.progress.status = ValidationStatus.COMPLETED;
      
      return report;
    } catch (error) {
      this.progress.status = ValidationStatus.FAILED;
      this.progress.error = error.message;
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Stop the validation process
   */
  stopValidation(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isStopping = true;
    this.progress.status = ValidationStatus.PAUSED;
  }
  
  /**
   * Resume a paused validation process
   */
  async resumeValidation(): Promise<MediaValidationReport> {
    if (this.isRunning) {
      throw new Error('Validation is already running');
    }
    
    if (!this.isPaused || !this.cachedMediaUrls) {
      throw new Error('No paused validation to resume');
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.progress.status = ValidationStatus.RUNNING;
    
    try {
      // Skip already processed items
      const remainingPaths = this.cachedMediaUrls.documentPaths.slice(this.progress.processedItems);
      
      // Process remaining URLs in batches
      const results = await this.processUrlBatches(remainingPaths);
      
      // Generate report
      const report = await this.generateReport(
        results, 
        this.cachedMediaUrls.totalDocuments, 
        this.cachedMediaUrls.totalFields
      );
      this.latestReport = report;
      
      // Update progress
      this.progress.endTime = new Date();
      this.progress.duration = this.progress.endTime.getTime() - (this.progress.startTime?.getTime() || 0);
      this.progress.status = ValidationStatus.COMPLETED;
      
      return report;
    } catch (error) {
      this.progress.status = ValidationStatus.FAILED;
      this.progress.error = error.message;
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * Repair invalid URLs based on the latest validation report
   */
  async repairInvalidUrls(): Promise<MediaRepairReport> {
    if (this.isRunning) {
      throw new Error('Worker is busy with another operation');
    }
    
    // Get the latest validation report if none exists
    if (!this.latestReport) {
      const report = await this.repository.getLatestValidationReport();
      if (!report) {
        throw new Error('No validation report available');
      }
      this.latestReport = report;
    }
    
    // Extract invalid URLs from the report
    const invalidUrls: DocumentFieldPath[] = this.latestReport.invalidResults.map(result => ({
      collection: result.collection,
      documentId: result.documentId,
      fieldPath: result.field
    }));
    
    // Repair invalid URLs
    return this.repository.repairMediaUrls(invalidUrls, this.config.placeholderUrl);
  }
  
  /**
   * Resolve blob URLs to permanent storage URLs
   */
  async resolveBlobUrls(): Promise<MediaRepairReport> {
    if (this.isRunning) {
      throw new Error('Worker is busy with another operation');
    }
    
    // Get all URLs if not already cached
    if (!this.cachedMediaUrls) {
      this.cachedMediaUrls = await this.repository.getAllMediaUrls();
    }
    
    // Find blob URLs
    const blobUrls: DocumentFieldPath[] = [];
    
    for (const docPath of this.cachedMediaUrls.documentPaths) {
      // Test the URL in repository to check if it's a blob URL
      await this.validateAndClassifyUrl(docPath);
    }
    
    // Test each potential path
    await Promise.all(this.cachedMediaUrls.documentPaths.map(async (docPath) => {
      // Get the document or field value
      try {
        // For demonstration, we'll just check the URL format
        // In a real implementation, you would get the actual URL from the document
        const url = docPath.fieldPath.includes('url') ? 'dummy-url' : '';
        
        if (url && url.startsWith('blob:')) {
          blobUrls.push(docPath);
        }
      } catch (error) {
        // Skip errors
      }
    }));
    
    // Resolve blob URLs
    return this.repository.resolveBlobUrls(blobUrls);
  }
  
  /**
   * Fix relative URLs by converting them to absolute URLs
   */
  async fixRelativeUrls(baseUrl: string): Promise<MediaRepairReport> {
    if (this.isRunning) {
      throw new Error('Worker is busy with another operation');
    }
    
    // Get all URLs if not already cached
    if (!this.cachedMediaUrls) {
      this.cachedMediaUrls = await this.repository.getAllMediaUrls();
    }
    
    // Find relative URLs
    const relativeUrls: DocumentFieldPath[] = [];
    
    // Test each potential path
    await Promise.all(this.cachedMediaUrls.documentPaths.map(async (docPath) => {
      // Get the document or field value
      try {
        // For demonstration, we'll just check the URL format
        // In a real implementation, you would get the actual URL from the document
        const url = docPath.fieldPath.includes('url') ? 'dummy-url' : '';
        
        if (url && url.startsWith('/') && !url.startsWith('//')) {
          relativeUrls.push(docPath);
        }
      } catch (error) {
        // Skip errors
      }
    }));
    
    // Fix relative URLs
    return this.repository.fixRelativeUrls(relativeUrls, baseUrl);
  }
  
  /**
   * Process URLs in batches
   */
  private async processUrlBatches(documentPaths: DocumentFieldPath[]): Promise<MediaValidationResult[]> {
    const results: MediaValidationResult[] = [];
    
    // Process in batches
    for (let i = 0; i < documentPaths.length; i += this.config.batchSize) {
      // Check if worker should stop
      if (this.isStopping) {
        this.isPaused = true;
        this.isStopping = false;
        break;
      }
      
      const batch = documentPaths.slice(i, i + this.config.batchSize);
      const batchResults = await this.processBatch(batch);
      
      results.push(...batchResults);
      
      // Update progress
      this.progress.processedItems += batch.length;
      this.progress.successItems += batchResults.filter(r => r.isValid).length;
      this.progress.failedItems += batchResults.filter(r => !r.isValid).length;
      this.progress.progress = (this.progress.processedItems / this.progress.totalItems) * 100;
      
      // Pause between batches
      if (i + this.config.batchSize < documentPaths.length) {
        await new Promise(resolve => setTimeout(resolve, this.config.pauseBetweenBatches));
      }
    }
    
    return results;
  }
  
  /**
   * Process a batch of URLs
   */
  private async processBatch(batch: DocumentFieldPath[]): Promise<MediaValidationResult[]> {
    // Process in parallel with limited concurrency
    const results: MediaValidationResult[] = [];
    const chunkSize = this.config.maxConcurrent;
    
    for (let i = 0; i < batch.length; i += chunkSize) {
      const chunk = batch.slice(i, i + chunkSize);
      const chunkPromises = chunk.map(docPath => this.validateAndClassifyUrl(docPath));
      const chunkResults = await Promise.all(chunkPromises);
      
      results.push(...chunkResults);
    }
    
    return results;
  }
  
  /**
   * Validate and classify a URL
   */
  private async validateAndClassifyUrl(docPath: DocumentFieldPath): Promise<MediaValidationResult> {
    // In a real implementation, you would get the actual URL from the document
    // For demonstration, we'll use a placeholder URL
    const url = 'https://example.com/image.jpg';
    
    try {
      // Determine expected media type based on field path or known patterns
      const expectedType = this.inferMediaType(url, docPath.fieldPath);
      
      // Validate URL
      const result = await this.repository.validateMediaUrl(url, expectedType);
      
      // Add document path information to result
      return {
        ...result,
        documentPath: docPath
      };
    } catch (error) {
      // Handle validation errors
      return {
        isValid: false,
        url,
        type: 'image' as MediaType,
        error: error.message,
        expectedType: 'image',
        documentPath: docPath
      };
    }
  }
  
  /**
   * Generate a validation report
   */
  private async generateReport(
    results: MediaValidationResult[], 
    totalDocuments: number, 
    totalFields: number
  ): Promise<MediaValidationReport> {
    const startTime = this.progress.startTime || new Date();
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    // Count valid, invalid, and missing URLs
    const validUrls = results.filter(r => r.isValid).length;
    const invalidUrls = results.filter(r => !r.isValid).length;
    const missingUrls = results.filter(r => r.error?.includes('not found')).length;
    
    // Group by collection
    const collectionSummaries = this.generateCollectionSummaries(results);
    
    // Format invalid results
    const invalidResults = results
      .filter(r => !r.isValid)
      .map(r => ({
        field: r.documentPath.fieldPath,
        url: r.url,
        isValid: r.isValid,
        status: r.status,
        statusText: r.statusText,
        error: r.error,
        collection: r.documentPath.collection,
        documentId: r.documentPath.documentId
      }));
    
    // Create report
    const report: Omit<MediaValidationReport, 'id'> = {
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
    
    // Save report to repository
    return this.repository.saveValidationReport(report);
  }
  
  /**
   * Generate collection summaries
   */
  private generateCollectionSummaries(results: MediaValidationResult[]): {
    collection: string;
    totalUrls: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    validPercent: number;
    invalidPercent: number;
    missingPercent: number;
  }[] {
    // Group by collection
    const collections: Record<string, {
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }> = {};
    
    // Count URLs for each collection
    for (const result of results) {
      const collection = result.documentPath.collection;
      
      if (!collections[collection]) {
        collections[collection] = {
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0
        };
      }
      
      collections[collection].totalUrls++;
      
      if (result.isValid) {
        collections[collection].validUrls++;
      } else {
        collections[collection].invalidUrls++;
        
        if (result.error?.includes('not found')) {
          collections[collection].missingUrls++;
        }
      }
    }
    
    // Calculate percentages
    return Object.entries(collections).map(([collection, counts]) => {
      const validPercent = (counts.validUrls / counts.totalUrls) * 100;
      const invalidPercent = (counts.invalidUrls / counts.totalUrls) * 100;
      const missingPercent = (counts.missingUrls / counts.totalUrls) * 100;
      
      return {
        collection,
        totalUrls: counts.totalUrls,
        validUrls: counts.validUrls,
        invalidUrls: counts.invalidUrls,
        missingUrls: counts.missingUrls,
        validPercent,
        invalidPercent,
        missingPercent
      };
    });
  }
  
  /**
   * Infer media type based on URL and field path
   */
  private inferMediaType(url: string, fieldPath: string): MediaType {
    // Default to image
    let type: MediaType = MediaType.IMAGE;
    
    // Check URL for video-related patterns
    const videoPatterns = [
      '-SBV-', 
      'Dynamic motion',
      '.mp4', 
      '.mov', 
      '.avi', 
      '.webm',
      'video/'
    ];
    
    // Check field path for video-related patterns
    const isVideoField = fieldPath.toLowerCase().includes('video');
    
    // Check URL for video patterns
    const isVideoUrl = videoPatterns.some(pattern => url.includes(pattern));
    
    if (isVideoField || isVideoUrl) {
      type = MediaType.VIDEO;
    }
    
    return type;
  }
  
  /**
   * Reset the worker state
   */
  private reset(): void {
    this.isRunning = false;
    this.isStopping = false;
    this.isPaused = false;
    
    this.progress = {
      status: ValidationStatus.IDLE,
      totalItems: 0,
      processedItems: 0,
      successItems: 0,
      failedItems: 0,
      progress: 0,
      duration: 0
    };
    
    this.cachedMediaUrls = undefined;
    this.latestReport = undefined;
  }
}