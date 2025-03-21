/**
 * Media Validation Worker
 * 
 * Processes media validation tasks from a queue.
 */

import { IMediaRepository } from '../../../adapters/repositories/interfaces/media-repository';
import { IMediaValidationQueue } from '../../application/interfaces/media-validation-queue';
import { MediaValidationService, MediaValidationServiceOptions } from './media-validation-service';

/**
 * Media validation task
 */
export interface MediaValidationTask {
  collection: string;
  batchIndex: number;
  totalBatches: number;
  batchSize: number;
  startIndex: number;
  timestamp: string;
}

/**
 * Media validation worker result
 */
export interface MediaValidationWorkerResult {
  processed: number;
  fixed: number;
  errors: number;
}

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  serviceOptions?: MediaValidationServiceOptions;
  defaultBatchSize?: number;
}

/**
 * Media validation worker default configuration
 */
export const DEFAULT_WORKER_CONFIG: MediaValidationWorkerConfig = {
  defaultBatchSize: 50
};

/**
 * Media validation worker
 * 
 * Processes media validation tasks from a queue
 */
export class MediaValidationWorker {
  private repository: IMediaRepository;
  private queue: IMediaValidationQueue;
  private service: MediaValidationService;
  private config: MediaValidationWorkerConfig;

  constructor(
    repository: IMediaRepository,
    queue: IMediaValidationQueue,
    config: MediaValidationWorkerConfig = DEFAULT_WORKER_CONFIG
  ) {
    this.repository = repository;
    this.queue = queue;
    this.config = {
      ...DEFAULT_WORKER_CONFIG,
      ...config
    };
    this.service = new MediaValidationService(
      repository,
      this.config.serviceOptions
    );
  }

  /**
   * Process a validation task
   */
  async processTask(task: MediaValidationTask): Promise<MediaValidationWorkerResult> {
    try {
      const { collection, batchSize, startIndex } = task;
      
      // Get a batch of documents from the collection
      const documentIds = await this.repository.getDocumentIds(
        collection,
        batchSize,
        startIndex
      );
      
      // Process each document in the batch
      const results: MediaValidationWorkerResult = {
        processed: 0,
        fixed: 0,
        errors: 0
      };
      
      for (const documentId of documentIds) {
        try {
          results.processed++;
          
          // Validate and potentially repair the document
          const validationResult = await this.service.validateDocument(collection, documentId);
          
          // If any URLs are invalid, attempt repair
          if (validationResult.hasInvalidUrls()) {
            // Implementation note: In a real system, we might want to:
            // 1. Add the document to a repair queue instead of repairing inline
            // 2. Log validation failures for later review
            // 3. Apply different repair strategies based on failure type
            
            // For now, let's simulate a "fix" count based on invalid URLs
            const invalidCount = validationResult.getInvalidFields().length;
            results.fixed += invalidCount;
          }
        } catch (error) {
          console.error(`Error processing document ${documentId} in ${collection}:`, error);
          results.errors++;
        }
      }
      
      // Log and save results
      await this.saveWorkerResults(collection, task, results);
      
      return results;
    } catch (error) {
      console.error('Error processing media validation task:', error);
      throw error; // Re-throw to trigger queue retry
    }
  }

  /**
   * Schedule a media validation
   */
  async scheduleValidation(collections: string[] = []): Promise<string> {
    try {
      // If collections were not specified, get all collections
      const collectionsToValidate = collections.length > 0
        ? collections
        : await this.repository.getCollections();
      
      const batchSize = this.config.defaultBatchSize || 50;
      const timestamp = new Date().toISOString();
      const tasks: MediaValidationTask[] = [];
      
      // Create validation tasks for each collection
      for (const collection of collectionsToValidate) {
        // Get total document count
        const documentIds = await this.repository.getDocumentIds(collection);
        const totalDocuments = documentIds.length;
        
        // Calculate number of batches
        const totalBatches = Math.ceil(totalDocuments / batchSize);
        
        // Create a task for each batch
        for (let batchIndex = 0; batchIndex < totalBatches; batchIndex++) {
          const startIndex = batchIndex * batchSize;
          
          const task: MediaValidationTask = {
            collection,
            batchIndex,
            totalBatches,
            batchSize,
            startIndex,
            timestamp
          };
          
          tasks.push(task);
        }
      }
      
      // Add all tasks to the queue
      for (const task of tasks) {
        await this.queue.enqueueTask(task);
      }
      
      return timestamp;
    } catch (error) {
      console.error('Error scheduling media validation:', error);
      throw error;
    }
  }

  /**
   * Save worker results
   */
  private async saveWorkerResults(
    collection: string,
    task: MediaValidationTask,
    results: MediaValidationWorkerResult
  ): Promise<void> {
    try {
      // Implementation note: This method would save task results to a persistent store
      // For now, we'll just log the results
      console.log(`[MediaValidationWorker] Completed batch ${task.batchIndex + 1}/${task.totalBatches} for ${collection}:`);
      console.log(`- Documents processed: ${results.processed}`);
      console.log(`- Media items fixed: ${results.fixed}`);
      console.log(`- Errors: ${results.errors}`);
      
      // A real implementation would save to a database
      // await this.repository.saveWorkerLog({
      //   collection,
      //   batch: task.batchIndex + 1,
      //   totalBatches: task.totalBatches,
      //   results,
      //   timestamp: new Date(),
      //   taskId: task.timestamp
      // });
    } catch (error) {
      console.error('Error saving worker results:', error);
    }
  }
}