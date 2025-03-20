/**
 * Media Validation Worker
 * 
 * This module provides functionality for running media validation in the background.
 * It processes batches of documents to validate and fix media URLs.
 */

import { Firestore } from 'firebase-admin/firestore';
import { 
  MediaValidationService, 
  DocumentWithFields, 
  DocumentValidationResult,
  ValidationReport 
} from './media-validation';

/**
 * Worker configuration
 */
export interface MediaValidationWorkerConfig {
  baseUrl: string;
  collections: string[];
  ignoreCollections: string[];
  batchSize: number;
  maxDocuments: number;
  autoFix: boolean;
  fixRelativeUrls: boolean;
  fixMediaType: boolean;
  saveValidationResults: boolean;
  validationResultsCollection: string;
  logProgress: boolean;
}

/**
 * Default worker configuration
 */
export const DEFAULT_WORKER_CONFIG: MediaValidationWorkerConfig = {
  baseUrl: 'https://etoile-yachts.web.app',
  collections: [],
  ignoreCollections: [
    'validation_results',
    'scheduled_tasks',
    'validation_tasks',
    'firebase_messaging'
  ],
  batchSize: 50,
  maxDocuments: 1000,
  autoFix: false,
  fixRelativeUrls: true,
  fixMediaType: true,
  saveValidationResults: true,
  validationResultsCollection: 'validation_results',
  logProgress: true
};

/**
 * Progress information
 */
export interface ProgressInfo {
  collection: string;
  processedDocuments: number;
  totalDocuments: number;
  invalidUrls: number;
  totalBatches: number;
  currentBatch: number;
  percentage: number;
}

/**
 * Progress callback
 */
export type ProgressCallback = (progress: ProgressInfo) => void;

/**
 * Error callback
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Complete callback
 */
export type CompleteCallback = (report: ValidationReport) => void;

/**
 * Media Validation Worker
 */
export class MediaValidationWorker {
  private config: MediaValidationWorkerConfig;
  private firestoreGetter: () => Firestore;
  private validationService: MediaValidationService;
  private onProgress?: ProgressCallback;
  private onError?: ErrorCallback;
  private onComplete?: CompleteCallback;
  
  /**
   * Create a new media validation worker
   * 
   * @param firestoreGetter Function that returns a Firestore instance
   * @param config Worker configuration
   * @param onProgress Progress callback
   * @param onError Error callback
   * @param onComplete Complete callback
   */
  constructor(
    firestoreGetter: () => Firestore,
    config: Partial<MediaValidationWorkerConfig> = {},
    onProgress?: ProgressCallback,
    onError?: ErrorCallback,
    onComplete?: CompleteCallback
  ) {
    this.firestoreGetter = firestoreGetter;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
    this.onProgress = onProgress;
    this.onError = onError;
    this.onComplete = onComplete;
    
    // Create media validation service
    this.validationService = new MediaValidationService({
      baseUrl: this.config.baseUrl
    });
  }
  
  /**
   * Run validation on all collections
   * 
   * @returns Promise resolving to validation report
   */
  async runValidation(): Promise<ValidationReport> {
    const db = this.firestoreGetter();
    const startTime = new Date();
    const results: DocumentValidationResult[] = [];
    
    try {
      // Get all collections if none specified
      let collections = this.config.collections;
      
      if (collections.length === 0) {
        const collectionsSnapshot = await db.listCollections();
        collections = collectionsSnapshot.map(col => col.id);
        
        // Filter out ignored collections
        collections = collections.filter(col => !this.config.ignoreCollections.includes(col));
      }
      
      // Process each collection
      for (const collection of collections) {
        try {
          // Get total document count for progress tracking
          const countQuery = await db.collection(collection).count().get();
          const totalDocuments = countQuery.data().count;
          
          // Skip empty collections
          if (totalDocuments === 0) {
            continue;
          }
          
          // Calculate number of batches
          const numBatches = Math.ceil(Math.min(totalDocuments, this.config.maxDocuments) / this.config.batchSize);
          
          // Log collection
          console.log(`Processing collection ${collection} (${totalDocuments} documents, ${numBatches} batches)`);
          
          // Process documents in batches
          let processedDocuments = 0;
          let totalInvalidUrls = 0;
          
          for (let batchIndex = 0; batchIndex < numBatches; batchIndex++) {
            // Get documents for batch
            const query = db.collection(collection)
              .limit(this.config.batchSize)
              .offset(batchIndex * this.config.batchSize);
            
            const snapshot = await query.get();
            
            // Skip empty batch
            if (snapshot.empty) {
              continue;
            }
            
            // Prepare documents for validation
            const documents: DocumentWithFields[] = snapshot.docs.map(doc => ({
              id: doc.id,
              collection,
              data: doc.data()
            }));
            
            // Validate documents
            const batchResults = await this.validationService.validateDocuments(documents);
            
            // Count invalid URLs
            const batchInvalidUrls = batchResults.reduce((sum, result) => sum + result.invalidFields, 0);
            totalInvalidUrls += batchInvalidUrls;
            
            // Fix invalid URLs if configured
            if (this.config.autoFix) {
              await this.fixBatchDocuments(documents, batchResults);
            }
            
            // Add results to overall results
            results.push(...batchResults);
            
            // Update progress counter
            processedDocuments += documents.length;
            
            // Calculate progress percentage
            const percentage = Math.round((processedDocuments / Math.min(totalDocuments, this.config.maxDocuments)) * 100);
            
            // Report progress
            if (this.config.logProgress) {
              console.log(`Progress: ${processedDocuments}/${Math.min(totalDocuments, this.config.maxDocuments)} documents (${percentage}%), Batch: ${batchIndex + 1}/${numBatches}`);
            }
            
            // Call progress callback
            if (this.onProgress) {
              this.onProgress({
                collection,
                processedDocuments,
                totalDocuments: Math.min(totalDocuments, this.config.maxDocuments),
                invalidUrls: totalInvalidUrls,
                totalBatches: numBatches,
                currentBatch: batchIndex + 1,
                percentage
              });
            }
            
            // Stop if we reached the maximum number of documents
            if (processedDocuments >= this.config.maxDocuments) {
              break;
            }
          }
        } catch (error) {
          console.error(`Error processing collection ${collection}:`, error);
          
          // Call error callback
          if (this.onError) {
            this.onError(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
      
      // Generate report
      const endTime = new Date();
      const report = this.validationService.generateReport(results, startTime, endTime);
      
      // Save validation results
      if (this.config.saveValidationResults) {
        await this.saveValidationResults(report);
      }
      
      // Call complete callback
      if (this.onComplete) {
        this.onComplete(report);
      }
      
      // Log summary
      console.log(`Validation completed in ${report.duration}ms`);
      console.log(`Total documents: ${report.totalDocuments}`);
      console.log(`Total URLs: ${report.totalFields}`);
      console.log(`Valid URLs: ${report.validUrls} (${Math.round((report.validUrls / report.totalFields) * 100)}%)`);
      console.log(`Invalid URLs: ${report.invalidUrls} (${Math.round((report.invalidUrls / report.totalFields) * 100)}%)`);
      console.log(`Missing URLs: ${report.missingUrls} (${Math.round((report.missingUrls / report.totalFields) * 100)}%)`);
      
      // Return report
      return report;
    } catch (error) {
      console.error('Error running validation:', error);
      
      // Call error callback
      if (this.onError) {
        this.onError(error instanceof Error ? error : new Error(String(error)));
      }
      
      // Generate error report
      const endTime = new Date();
      const errorReport = this.validationService.generateReport(results, startTime, endTime);
      
      // Return error report
      return errorReport;
    }
  }
  
  /**
   * Validate a single document
   * 
   * @param document Document to validate
   * @returns Promise resolving to validation result
   */
  async validateDocument(document: DocumentWithFields): Promise<DocumentValidationResult> {
    try {
      // Validate document
      const results = await this.validationService.validateDocuments([document]);
      
      // Return first result
      return results[0];
    } catch (error) {
      console.error(`Error validating document ${document.collection}/${document.id}:`, error);
      
      // Return error result
      return {
        id: document.id,
        collection: document.collection,
        totalFields: 0,
        validFields: 0,
        invalidFields: 0,
        missingFields: 0,
        fieldResults: [{
          field: 'error',
          url: 'error',
          isValid: false,
          error: error instanceof Error ? error.message : String(error),
          collection: document.collection,
          documentId: document.id
        }]
      };
    }
  }
  
  /**
   * Fix a batch of documents
   * 
   * @param documents Documents to fix
   * @param results Validation results
   * @returns Promise resolving when documents are fixed
   */
  private async fixBatchDocuments(
    documents: DocumentWithFields[],
    results: DocumentValidationResult[]
  ): Promise<void> {
    const db = this.firestoreGetter();
    
    for (let i = 0; i < documents.length; i++) {
      const document = documents[i];
      const result = results[i];
      
      // Skip if no invalid fields
      if (result.invalidFields === 0) {
        continue;
      }
      
      try {
        // Fix document
        const fixedData = this.fixDocument(document, result);
        
        // Update document in Firestore
        await db.collection(document.collection).doc(document.id).update(fixedData);
        
        // Log success
        console.log(`Fixed document ${document.collection}/${document.id} (${result.invalidFields} fields)`);
      } catch (error) {
        console.error(`Error fixing document ${document.collection}/${document.id}:`, error);
      }
    }
  }
  
  /**
   * Fix invalid URLs in a document
   * 
   * @param document Document to fix
   * @param result Validation result
   * @returns Fixed document data
   */
  public fixDocument(document: DocumentWithFields, result: DocumentValidationResult): any {
    return this.validationService.fixInvalidUrls(document, result);
  }
  
  /**
   * Save validation results to Firestore
   * 
   * @param report Validation report
   * @returns Promise resolving to report ID
   */
  private async saveValidationResults(report: ValidationReport): Promise<string> {
    const db = this.firestoreGetter();
    
    try {
      // Create Firestore-compatible report
      const firestoreReport = this.validationService.createFirestoreReport(report);
      
      // Save report to Firestore
      await db.collection(this.config.validationResultsCollection).doc(report.id).set(firestoreReport);
      
      // Log success
      console.log(`Validation results saved to Firestore with ID: ${report.id}`);
      
      return report.id;
    } catch (error) {
      console.error('Error saving validation results:', error);
      throw error;
    }
  }
}