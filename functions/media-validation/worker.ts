/**
 * Media Validation Worker
 * 
 * This module implements a worker for background media validation tasks.
 * It can process Firestore collections and documents, validating image URLs,
 * detecting broken links, and fixing relative URLs.
 */
import { MediaValidationService, MediaValidationOptions, MediaValidationReport, UrlFixResult } from './media-validation';
import { Firestore } from '@google-cloud/firestore';

/**
 * Configuration for the media validation worker
 */
export interface MediaValidationWorkerConfig {
  /**
   * Base URL of the application
   */
  baseUrl: string;
  
  /**
   * Collections to validate
   */
  collectionsToValidate: string[];
  
  /**
   * Maximum number of documents to process per batch
   */
  batchSize?: number;
  
  /**
   * Maximum concurrent validation operations
   */
  concurrency?: number;
  
  /**
   * Timeout for each validation operation (ms)
   */
  timeout?: number;
  
  /**
   * Firestore instance
   */
  firestore: Firestore;
  
  /**
   * Logger function for errors
   */
  logError: (message: string, error?: any) => void;
  
  /**
   * Logger function for information messages
   */
  logInfo: (message: string) => void;
  
  /**
   * Logger function for debug messages
   */
  logDebug?: (message: string) => void;
}

/**
 * Media validation worker class
 * 
 * Handles background processing of media validation tasks
 */
export class MediaValidationWorker {
  private config: MediaValidationWorkerConfig;
  private validationService: MediaValidationService;
  
  /**
   * Create a new media validation worker
   */
  constructor(config: MediaValidationWorkerConfig) {
    this.config = config;
    
    // Create validation service
    this.validationService = new MediaValidationService({
      baseUrl: config.baseUrl,
      concurrency: config.concurrency,
      timeout: config.timeout,
      logInfo: config.logInfo,
      logError: config.logError,
      logDebug: config.logDebug,
      firestore: config.firestore  // Pass Firestore instance to validation service
    });
  }
  
  /**
   * Validate all configured collections
   * 
   * @returns A validation report with results from all collections
   */
  async validateAllCollections(): Promise<MediaValidationReport> {
    try {
      this.config.logInfo(`Starting validation of ${this.config.collectionsToValidate.length} collections`);
      
      const results = await this.validationService.validateAllCollections(
        this.config.collectionsToValidate, 
        this.config.batchSize || 50
      );
      
      this.config.logInfo(`Completed validation of ${this.config.collectionsToValidate.length} collections`);
      
      return results;
    } catch (error: any) {
      this.config.logError('Error validating collections:', error);
      throw error;
    }
  }
  
  /**
   * Validate a specific collection
   * 
   * @param collectionName The name of the collection to validate
   * @param batchSize Optional batch size override
   * @returns A validation report for the collection
   */
  async validateCollection(collectionName: string, batchSize?: number): Promise<MediaValidationReport> {
    try {
      this.config.logInfo(`Starting validation of collection: ${collectionName}`);
      
      const results = await this.validationService.validateCollection(
        collectionName, 
        batchSize || this.config.batchSize || 50
      );
      
      this.config.logInfo(`Completed validation of collection: ${collectionName}`);
      
      return results;
    } catch (error: any) {
      this.config.logError(`Error validating collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Fix relative URLs in all collections
   * 
   * @returns A fix report with results from all collections
   */
  async fixRelativeUrls(): Promise<UrlFixResult> {
    try {
      this.config.logInfo(`Starting fix of relative URLs in ${this.config.collectionsToValidate.length} collections`);
      
      const results = await this.validationService.fixAllRelativeUrls(
        this.config.collectionsToValidate,
        this.config.batchSize || 50
      );
      
      this.config.logInfo(`Completed fixing relative URLs in ${this.config.collectionsToValidate.length} collections`);
      
      return results;
    } catch (error: any) {
      this.config.logError('Error fixing relative URLs:', error);
      throw error;
    }
  }
  
  /**
   * Fix relative URLs in a specific collection
   * 
   * @param collectionName The name of the collection to fix
   * @param batchSize Optional batch size override
   * @returns A fix report for the collection
   */
  async fixCollectionRelativeUrls(collectionName: string, batchSize?: number): Promise<UrlFixResult> {
    try {
      this.config.logInfo(`Starting fix of relative URLs in collection: ${collectionName}`);
      
      const results = await this.validationService.fixCollectionRelativeUrls(
        collectionName,
        batchSize || this.config.batchSize || 50
      );
      
      this.config.logInfo(`Completed fixing relative URLs in collection: ${collectionName}`);
      
      return results;
    } catch (error: any) {
      this.config.logError(`Error fixing relative URLs in collection ${collectionName}:`, error);
      throw error;
    }
  }
  
  /**
   * Save validation results to Firestore
   * 
   * @param results The validation results to save
   * @returns The ID of the saved report document
   */
  async saveValidationResults(results: MediaValidationReport): Promise<string> {
    try {
      const reportRef = this.config.firestore.collection('media_validation_reports').doc();
      
      // Add metadata
      const reportData = {
        ...results,
        id: reportRef.id,
        createdAt: new Date(),
        metadata: {
          collectionsValidated: this.config.collectionsToValidate,
          baseUrl: this.config.baseUrl
        }
      };
      
      // Save to Firestore
      await reportRef.set(reportData);
      
      this.config.logInfo(`Saved validation report with ID: ${reportRef.id}`);
      
      return reportRef.id;
    } catch (error: any) {
      this.config.logError('Error saving validation results:', error);
      throw error;
    }
  }
  
  /**
   * Save URL fix results to Firestore
   * 
   * @param results The fix results to save
   * @returns The ID of the saved report document
   */
  async saveFixResults(results: UrlFixResult): Promise<string> {
    try {
      const reportRef = this.config.firestore.collection('url_fix_reports').doc();
      
      // Add metadata
      const reportData = {
        ...results,
        id: reportRef.id,
        createdAt: new Date(),
        metadata: {
          collectionsFixed: this.config.collectionsToValidate,
          baseUrl: this.config.baseUrl
        }
      };
      
      // Save to Firestore
      await reportRef.set(reportData);
      
      this.config.logInfo(`Saved URL fix report with ID: ${reportRef.id}`);
      
      return reportRef.id;
    } catch (error: any) {
      this.config.logError('Error saving URL fix results:', error);
      throw error;
    }
  }
}