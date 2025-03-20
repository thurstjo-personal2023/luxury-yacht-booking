/**
 * Media Validation Worker
 * 
 * This module provides functionality to process media validation tasks
 * in batches. It can validate and fix media URLs across collections.
 */

import { MediaValidationService, MediaValidationOptions, ValidationReport, UrlFixResult } from './media-validation';
import { getFirestore, collection, query, limit, startAfter, getDocs, doc, getDoc, setDoc, updateDoc, Firestore } from 'firebase/firestore';

/**
 * Media validation worker configuration
 */
export interface MediaValidationWorkerConfig {
  batchSize?: number;
  maxItems?: number;
  fixInvalidUrls?: boolean;
  collections?: string[];
  onProgress?: (progress: number, total: number) => void;
  onComplete?: (report: ValidationReport) => void;
  onError?: (error: Error) => void;
}

/**
 * Media validation worker class
 */
export class MediaValidationWorker {
  private service: MediaValidationService;
  private db: Firestore;
  private config: MediaValidationWorkerConfig;
  private isRunning: boolean = false;
  private lastProcessedDoc: any = null;
  private processedItems: number = 0;
  private totalProcessed: number = 0;
  private results: any[] = [];
  private startTime: Date = new Date();
  private stopped: boolean = false;

  /**
   * Constructor
   * 
   * @param db Firestore instance
   * @param config Media validation worker configuration
   */
  constructor(db: Firestore, config: MediaValidationWorkerConfig = {}) {
    this.db = db;
    this.config = {
      batchSize: config.batchSize || 50,
      maxItems: config.maxItems || 1000,
      fixInvalidUrls: config.fixInvalidUrls || false,
      collections: config.collections || [],
      onProgress: config.onProgress || (() => {}),
      onComplete: config.onComplete || (() => {}),
      onError: config.onError || (() => {})
    };

    // Create media validation service
    this.service = new MediaValidationService({
      batchSize: this.config.batchSize,
      maxItems: this.config.maxItems,
      fixInvalidUrls: this.config.fixInvalidUrls,
      collections: this.config.collections
    });
  }

  /**
   * Start validation process
   */
  async start(): Promise<ValidationReport> {
    if (this.isRunning) {
      throw new Error('Validation already running');
    }

    try {
      this.isRunning = true;
      this.stopped = false;
      this.lastProcessedDoc = null;
      this.processedItems = 0;
      this.totalProcessed = 0;
      this.results = [];
      this.startTime = new Date();

      // Process all collections
      for (const collectionName of this.config.collections || []) {
        if (this.stopped) break;
        
        try {
          await this.processCollection(collectionName);
        } catch (error) {
          console.error(`Error processing collection ${collectionName}:`, error);
        }
      }

      // Generate report
      const report = this.service.generateReport(
        this.results,
        this.startTime,
        new Date()
      );

      // Save report to database
      const reportId = await this.saveReport(report);
      report.id = reportId;

      // Notify completion
      if (this.config.onComplete) {
        this.config.onComplete(report);
      }

      this.isRunning = false;
      return report;
    } catch (error) {
      this.isRunning = false;
      const err = error instanceof Error ? error : new Error(String(error));
      
      if (this.config.onError) {
        this.config.onError(err);
      }
      
      throw err;
    }
  }

  /**
   * Stop validation process
   */
  stop(): void {
    this.stopped = true;
  }

  /**
   * Process a collection
   * 
   * @param collectionName Collection name
   */
  private async processCollection(collectionName: string): Promise<void> {
    let lastDoc: any = null;
    let processed = 0;
    const batchSize = this.config.batchSize || 50;
    const maxItems = this.config.maxItems || 1000;

    while (!this.stopped && processed < maxItems) {
      // Get a batch of documents
      const q = lastDoc
        ? query(collection(this.db, collectionName), startAfter(lastDoc), limit(batchSize))
        : query(collection(this.db, collectionName), limit(batchSize));

      const querySnapshot = await getDocs(q);

      // Stop if no more documents
      if (querySnapshot.empty) {
        break;
      }

      // Process each document
      const batchPromises = [];
      querySnapshot.forEach(docSnapshot => {
        const docData = docSnapshot.data();
        if (docData) {
          batchPromises.push(this.processDocument(docData, docSnapshot.id, collectionName));
        }
        lastDoc = docSnapshot;
      });

      // Wait for all documents in the batch to be processed
      await Promise.all(batchPromises);

      // Update progress
      processed += querySnapshot.size;
      this.processedItems += querySnapshot.size;
      this.totalProcessed += querySnapshot.size;

      if (this.config.onProgress) {
        this.config.onProgress(this.processedItems, this.totalProcessed);
      }

      // Check if we've reached the end of the collection
      if (querySnapshot.size < batchSize) {
        break;
      }
    }
  }

  /**
   * Process a document
   * 
   * @param document Document data
   * @param id Document ID
   * @param collectionName Collection name
   */
  private async processDocument(document: any, id: string, collectionName: string): Promise<void> {
    try {
      // Validate document
      const validationResult = await this.service.validateDocument(document, id, collectionName);
      this.results.push(validationResult);

      // Fix invalid URLs if enabled
      if (this.config.fixInvalidUrls && validationResult.invalidUrls > 0) {
        const { updatedDocument, fixes } = this.service.fixInvalidUrls(document, validationResult);
        
        // Save updated document
        if (fixes.length > 0) {
          await this.saveFixedDocument(updatedDocument, id, collectionName, fixes);
        }
      }
    } catch (error) {
      console.error(`Error processing document ${collectionName}/${id}:`, error);
    }
  }

  /**
   * Save fixed document
   * 
   * @param document Document data
   * @param id Document ID
   * @param collectionName Collection name
   * @param fixes URL fix results
   */
  private async saveFixedDocument(
    document: any, 
    id: string, 
    collectionName: string, 
    fixes: UrlFixResult[]
  ): Promise<void> {
    try {
      // Update document in Firestore
      const docRef = doc(this.db, collectionName, id);
      await updateDoc(docRef, document);

      // Save fix record
      const fixRecord = {
        documentId: id,
        collection: collectionName,
        timestamp: new Date(),
        fixes
      };

      // Add to fix history collection
      await setDoc(doc(this.db, 'media_fix_history', `${id}-${Date.now()}`), fixRecord);
    } catch (error) {
      console.error(`Error saving fixed document ${collectionName}/${id}:`, error);
    }
  }

  /**
   * Save validation report
   * 
   * @param report Validation report
   * @returns Report ID
   */
  private async saveReport(report: ValidationReport): Promise<string> {
    try {
      // Create a new document in the validation_reports collection
      const reportId = `report-${Date.now()}`;
      const reportRef = doc(this.db, 'validation_reports', reportId);
      
      // Save report data
      await setDoc(reportRef, {
        ...report,
        startTime: report.startTime.toISOString(),
        endTime: report.endTime.toISOString(),
        createdAt: new Date()
      });
      
      return reportId;
    } catch (error) {
      console.error('Error saving validation report:', error);
      return `error-${Date.now()}`;
    }
  }
}