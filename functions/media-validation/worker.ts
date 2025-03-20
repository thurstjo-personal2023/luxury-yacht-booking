/**
 * Media Validation Worker
 * 
 * This module provides a worker for validating media URLs in Firestore documents.
 * It processes documents in batches and validates any media URLs found.
 */

import { Firestore } from 'firebase-admin/firestore';
import {
  MediaValidationService,
  DocumentValidationResult,
  DocumentWithFields,
  ValidationReport
} from './media-validation';

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  baseUrl: string;
  collectionsToValidate: string[];
  collectionsToFix: string[];
  maxDocumentsToProcess: number;
  batchSize: number;
  autoFix: boolean;
  saveValidationResults: boolean;
  logProgress: boolean;
  placeholderImage: string;
  placeholderVideo: string;
}

/**
 * Default media validation worker configuration
 */
export const DEFAULT_WORKER_CONFIG: MediaValidationWorkerConfig = {
  baseUrl: 'https://etoile-yachts.web.app',
  collectionsToValidate: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'promotions_and_offers',
    'articles_and_guides',
    'event_announcements',
    'user_profiles_service_provider',
    'user_profiles_tourist'
  ],
  collectionsToFix: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons'
  ],
  maxDocumentsToProcess: 1000,
  batchSize: 50,
  autoFix: true,
  saveValidationResults: true,
  logProgress: true,
  placeholderImage: '/assets/placeholder-image.jpg',
  placeholderVideo: '/assets/placeholder-video.mp4'
};

/**
 * Progress callback function
 */
export type ProgressCallback = (progress: {
  collection: string;
  processedDocuments: number;
  totalDocuments: number;
  completedCollections: number;
  totalCollections: number;
}) => void;

/**
 * Error callback function
 */
export type ErrorCallback = (error: Error) => void;

/**
 * Complete callback function
 */
export type CompleteCallback = (report: ValidationReport) => void;

/**
 * Media Validation Worker
 */
export class MediaValidationWorker {
  private config: MediaValidationWorkerConfig;
  private service: MediaValidationService;
  private firestoreGetter: () => Firestore;
  private progressCallback?: ProgressCallback;
  private errorCallback?: ErrorCallback;
  private completeCallback?: CompleteCallback;
  
  /**
   * Create a new media validation worker
   * 
   * @param firestoreGetter Function that returns a Firestore instance
   * @param config Worker configuration
   * @param progressCallback Callback for validation progress
   * @param errorCallback Callback for validation errors
   * @param completeCallback Callback when validation is complete
   */
  constructor(
    firestoreGetter: () => Firestore,
    config: Partial<MediaValidationWorkerConfig> = {},
    progressCallback?: ProgressCallback,
    errorCallback?: ErrorCallback,
    completeCallback?: CompleteCallback
  ) {
    this.firestoreGetter = firestoreGetter;
    this.config = { ...DEFAULT_WORKER_CONFIG, ...config };
    
    // Create validation service with matching configuration
    this.service = new MediaValidationService({
      baseUrl: this.config.baseUrl,
      placeholderImage: this.config.placeholderImage,
      placeholderVideo: this.config.placeholderVideo
    });
    
    this.progressCallback = progressCallback;
    this.errorCallback = errorCallback;
    this.completeCallback = completeCallback;
  }
  
  /**
   * Run validation on all configured collections
   * 
   * @returns Promise resolving to validation report
   */
  async runValidation(): Promise<ValidationReport> {
    try {
      const startTime = new Date();
      const results: DocumentValidationResult[] = [];
      const db = this.firestoreGetter();
      
      let completedCollections = 0;
      const totalCollections = this.config.collectionsToValidate.length;
      
      for (const collection of this.config.collectionsToValidate) {
        try {
          // Log progress
          if (this.config.logProgress) {
            console.log(`Processing collection: ${collection}`);
          }
          
          // Get document count for progress tracking
          const countSnapshot = await db.collection(collection).count().get();
          const totalDocuments = Math.min(countSnapshot.data().count, this.config.maxDocumentsToProcess);
          
          // Process documents in batches
          let processedDocuments = 0;
          let lastDocumentId: string | null = null;
          
          while (processedDocuments < totalDocuments) {
            // Create query with pagination
            let query = db.collection(collection).limit(this.config.batchSize);
            
            // Apply start after for pagination
            if (lastDocumentId) {
              const lastDoc = await db.collection(collection).doc(lastDocumentId).get();
              if (lastDoc.exists) {
                query = query.startAfter(lastDoc);
              }
            }
            
            // Get batch of documents
            const snapshot = await query.get();
            
            if (snapshot.empty) {
              break;
            }
            
            // Convert Firestore documents to our internal format
            const documents: DocumentWithFields[] = snapshot.docs.map(doc => ({
              id: doc.id,
              collection,
              data: doc.data()
            }));
            
            // Validate documents
            const batchResults = await this.service.validateDocuments(documents);
            
            // Add results to total
            results.push(...batchResults);
            
            // Save last document ID for pagination
            lastDocumentId = snapshot.docs[snapshot.docs.length - 1].id;
            
            // Update progress
            processedDocuments += snapshot.docs.length;
            
            // Log progress
            if (this.config.logProgress) {
              console.log(`Processed ${processedDocuments}/${totalDocuments} documents in ${collection}`);
            }
            
            // Report progress
            if (this.progressCallback) {
              this.progressCallback({
                collection,
                processedDocuments,
                totalDocuments,
                completedCollections,
                totalCollections
              });
            }
            
            // Auto-fix invalid URLs if enabled
            if (this.config.autoFix && this.config.collectionsToFix.includes(collection)) {
              await this.fixInvalidUrls(batchResults, documents);
            }
          }
          
          completedCollections++;
        } catch (error) {
          console.error(`Error processing collection ${collection}:`, error);
          
          if (this.errorCallback) {
            this.errorCallback(error instanceof Error ? error : new Error(String(error)));
          }
        }
      }
      
      const endTime = new Date();
      
      // Generate report
      const report = this.service.generateReport(results, startTime, endTime);
      
      // Save report
      if (this.config.saveValidationResults) {
        await this.saveReport(report);
      }
      
      // Log completion
      if (this.config.logProgress) {
        console.log(`Validation complete. Total documents: ${report.totalDocuments}, Invalid URLs: ${report.invalidUrls}`);
      }
      
      // Report completion
      if (this.completeCallback) {
        this.completeCallback(report);
      }
      
      return report;
    } catch (error) {
      console.error('Error running validation:', error);
      
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(String(error)));
      }
      
      throw error;
    }
  }
  
  /**
   * Fix invalid URLs in documents
   * 
   * @param results Validation results
   * @param documents Documents to fix
   */
  private async fixInvalidUrls(results: DocumentValidationResult[], documents: DocumentWithFields[]): Promise<void> {
    const db = this.firestoreGetter();
    const batch = db.batch();
    let docsToUpdate = 0;
    
    for (const result of results) {
      // Skip documents without invalid URLs
      if (result.invalidFields === 0) {
        continue;
      }
      
      // Find the document data
      const document = documents.find(d => d.id === result.id && d.collection === result.collection);
      
      if (!document) {
        console.error(`Document not found for result: ${result.collection}/${result.id}`);
        continue;
      }
      
      // Fix invalid URLs in the document
      const fixedData = this.service.fixInvalidUrls(document, result);
      
      // Add document update to batch
      const docRef = db.collection(result.collection).doc(result.id);
      batch.update(docRef, fixedData);
      docsToUpdate++;
      
      // If batch is full, commit it
      if (docsToUpdate >= 500) {
        await batch.commit();
        docsToUpdate = 0;
      }
    }
    
    // Commit any remaining updates
    if (docsToUpdate > 0) {
      await batch.commit();
      
      if (this.config.logProgress) {
        console.log(`Fixed ${docsToUpdate} documents with invalid URLs`);
      }
    }
  }
  
  /**
   * Save validation report to Firestore
   * 
   * @param report Validation report
   */
  private async saveReport(report: ValidationReport): Promise<void> {
    try {
      const db = this.firestoreGetter();
      
      // Create Firestore-compatible report
      const firestoreReport = this.service.createFirestoreReport(report);
      
      // Save report
      await db.collection('validation_reports').doc(report.id).set(firestoreReport);
      
      if (this.config.logProgress) {
        console.log(`Saved validation report: ${report.id}`);
      }
    } catch (error) {
      console.error('Error saving validation report:', error);
      
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(String(error)));
      }
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
      const results = await this.service.validateDocuments([document]);
      return results[0];
    } catch (error) {
      console.error(`Error validating document ${document.collection}/${document.id}:`, error);
      
      if (this.errorCallback) {
        this.errorCallback(error instanceof Error ? error : new Error(String(error)));
      }
      
      throw error;
    }
  }
  
  /**
   * Fix invalid URLs in a document
   * 
   * @param document Document to fix
   * @param validationResult Validation result for the document
   * @returns Fixed document data
   */
  fixDocument(document: DocumentWithFields, validationResult: DocumentValidationResult): any {
    return this.service.fixInvalidUrls(document, validationResult);
  }
}