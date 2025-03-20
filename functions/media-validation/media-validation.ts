/**
 * Media Validation Service
 * 
 * This module provides functionality for validating and fixing media URLs
 * in Firestore documents across multiple collections.
 */
import * as admin from 'firebase-admin';
import { URLValidator, ValidationResult } from './url-validator';

// Types for validation configuration
export interface MediaValidationConfig {
  firestore: admin.firestore.Firestore;
  collectionNames: string[];
  baseUrl: string;
  logInfo: (message: string) => void;
  logError: (message: string, error?: any) => void;
  logWarning: (message: string) => void;
  batchSize?: number;
}

// Types for validation results
export interface MediaValidationStatus {
  reportId: string;
  startTime: admin.firestore.Timestamp;
  endTime?: admin.firestore.Timestamp;
  totalDocuments: number;
  totalMediaItems: number;
  validItems: number;
  invalidItems: number;
  missingItems: number;
  collections: {
    [collectionName: string]: {
      totalUrls: number;
      valid: number;
      invalid: number;
      missing: number;
    }
  };
  invalidItemDetails?: {
    collectionName: string;
    documentId: string;
    fieldPath: string;
    url: string;
    reason: string;
    status?: number;
    error?: string;
  }[];
  status: 'running' | 'completed' | 'failed';
  error?: string;
}

// Types for document validation results
export interface DocumentValidationResult {
  documentId: string;
  collectionName: string;
  valid: {
    url: string;
    fieldPath: string;
    contentType?: string;
  }[];
  invalid: {
    url: string;
    fieldPath: string;
    reason: string;
    status?: number;
    error?: string;
  }[];
  missing: {
    fieldPath: string;
  }[];
}

// Types for URL fix results
export interface UrlFixResult {
  documentId: string;
  collectionName: string;
  fixedUrls: {
    fieldPath: string;
    originalUrl: string;
    fixedUrl: string;
  }[];
  fixedDocument: any;
}

/**
 * Media Validation Service for validating and repairing media URLs
 */
export class MediaValidationService {
  private urlValidator: URLValidator;
  private readonly batchSize: number;
  
  constructor(private config: MediaValidationConfig) {
    // Initialize URL validator
    this.urlValidator = new URLValidator({
      logError: config.logError,
      logInfo: config.logInfo
    });
    
    // Default batch size to 50 if not specified
    this.batchSize = config.batchSize || 50;
  }
  
  /**
   * Deep scan an object to find all media URLs
   * @param obj The object to scan
   * @param currentPath Current field path for nested properties
   * @param results Array to collect results
   */
  private findMediaUrls(
    obj: any, 
    currentPath: string = '', 
    results: { url: string; fieldPath: string }[] = []
  ): { url: string; fieldPath: string }[] {
    // Skip if not an object
    if (!obj || typeof obj !== 'object') {
      return results;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const itemPath = currentPath ? `${currentPath}.[${index}]` : `[${index}]`;
        
        // Check if this is a media object with a URL
        if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
          // This looks like a media object
          results.push({
            url: item.url,
            fieldPath: `${itemPath}.url`
          });
        }
        
        // Continue deep scanning
        this.findMediaUrls(item, itemPath, results);
      });
      return results;
    }
    
    // Handle objects
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];
        const fieldPath = currentPath ? `${currentPath}.${key}` : key;
        
        // If this is a URL directly
        if (key === 'url' && typeof value === 'string') {
          results.push({
            url: value,
            fieldPath
          });
        }
        
        // Continue deep scanning
        this.findMediaUrls(value, fieldPath, results);
      }
    }
    
    return results;
  }
  
  /**
   * Validate media URLs in a document
   * @param collectionName The collection name
   * @param documentId The document ID
   * @param documentData The document data
   */
  public async validateDocumentMedia(
    collectionName: string,
    documentId: string,
    documentData: any
  ): Promise<DocumentValidationResult> {
    const result: DocumentValidationResult = {
      documentId,
      collectionName,
      valid: [],
      invalid: [],
      missing: []
    };
    
    // Find all media URLs in the document
    const mediaUrls = this.findMediaUrls(documentData);
    
    // Validate each URL
    for (const { url, fieldPath } of mediaUrls) {
      if (!url) {
        // URL is missing
        result.missing.push({ fieldPath });
        continue;
      }
      
      // Validate the URL
      try {
        // If it's a relative URL, validate with base URL
        const finalUrl = this.urlValidator.isRelativeURL(url)
          ? this.urlValidator.normalizePotentialRelativeURL(url, this.config.baseUrl)
          : url;
          
        const validationResult = await this.urlValidator.validateURL(finalUrl);
        
        if (validationResult.isValid) {
          // URL is valid
          result.valid.push({
            url,
            fieldPath,
            contentType: validationResult.contentType
          });
        } else {
          // URL is invalid
          result.invalid.push({
            url,
            fieldPath,
            reason: validationResult.error ? 'Request failed' : 'Invalid content type',
            status: validationResult.status,
            error: validationResult.error || `Expected image, got ${validationResult.contentType}`
          });
        }
      } catch (error) {
        // Error during validation
        result.invalid.push({
          url,
          fieldPath,
          reason: 'Validation error',
          error: error.message || 'Unknown error'
        });
      }
    }
    
    return result;
  }
  
  /**
   * Validate all documents in a collection
   * @param collectionName The collection to validate
   */
  public async validateCollection(collectionName: string): Promise<{
    totalDocuments: number;
    totalMediaItems: number;
    validItems: number;
    invalidItems: number;
    missingItems: number;
    documents: DocumentValidationResult[];
  }> {
    const collection = this.config.firestore.collection(collectionName);
    const snapshot = await collection.get();
    
    if (snapshot.empty) {
      this.config.logInfo(`No documents found in collection: ${collectionName}`);
      return {
        totalDocuments: 0,
        totalMediaItems: 0,
        validItems: 0,
        invalidItems: 0,
        missingItems: 0,
        documents: []
      };
    }
    
    const results: DocumentValidationResult[] = [];
    const validationStats = {
      totalDocuments: snapshot.size,
      totalMediaItems: 0,
      validItems: 0,
      invalidItems: 0,
      missingItems: 0
    };
    
    // Process documents in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += this.batchSize) {
      const batchDocs = docs.slice(i, i + this.batchSize);
      
      // Process each document in the batch
      const batchPromises = batchDocs.map(async (doc) => {
        try {
          const documentData = doc.data();
          const validationResult = await this.validateDocumentMedia(
            collectionName,
            doc.id,
            documentData
          );
          
          // Update statistics
          validationStats.totalMediaItems += validationResult.valid.length + 
            validationResult.invalid.length + validationResult.missing.length;
          validationStats.validItems += validationResult.valid.length;
          validationStats.invalidItems += validationResult.invalid.length;
          validationStats.missingItems += validationResult.missing.length;
          
          return validationResult;
        } catch (error) {
          this.config.logError(`Error validating document ${doc.id} in ${collectionName}`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults.filter(Boolean));
      
      // Log progress
      this.config.logInfo(`Validated ${i + batchResults.length} of ${docs.length} documents in ${collectionName}`);
    }
    
    return {
      ...validationStats,
      documents: results
    };
  }
  
  /**
   * Run validation on all configured collections
   */
  public async validateAllCollections(): Promise<MediaValidationStatus> {
    const reportId = this.config.firestore.collection('media_validation_reports').doc().id;
    
    // Create initial report
    const report: MediaValidationStatus = {
      reportId,
      startTime: admin.firestore.Timestamp.now(),
      totalDocuments: 0,
      totalMediaItems: 0,
      validItems: 0,
      invalidItems: 0,
      missingItems: 0,
      collections: {},
      status: 'running',
      invalidItemDetails: []
    };
    
    // Save initial report
    await this.config.firestore.collection('media_validation_reports').doc(reportId).set(report);
    
    try {
      // Validate each collection
      for (const collectionName of this.config.collectionNames) {
        this.config.logInfo(`Starting validation for collection: ${collectionName}`);
        
        const collectionResults = await this.validateCollection(collectionName);
        
        // Update collection stats
        report.collections[collectionName] = {
          totalUrls: collectionResults.totalMediaItems,
          valid: collectionResults.validItems,
          invalid: collectionResults.invalidItems,
          missing: collectionResults.missingItems
        };
        
        // Update overall stats
        report.totalDocuments += collectionResults.totalDocuments;
        report.totalMediaItems += collectionResults.totalMediaItems;
        report.validItems += collectionResults.validItems;
        report.invalidItems += collectionResults.invalidItems;
        report.missingItems += collectionResults.missingItems;
        
        // Add invalid items to the report
        for (const document of collectionResults.documents) {
          for (const item of document.invalid) {
            report.invalidItemDetails.push({
              collectionName,
              documentId: document.documentId,
              fieldPath: item.fieldPath,
              url: item.url,
              reason: item.reason,
              status: item.status,
              error: item.error
            });
          }
        }
        
        // Update the report with progress
        await this.config.firestore.collection('media_validation_reports').doc(reportId).update({
          collections: report.collections,
          totalDocuments: report.totalDocuments,
          totalMediaItems: report.totalMediaItems,
          validItems: report.validItems,
          invalidItems: report.invalidItems,
          missingItems: report.missingItems,
          invalidItemDetails: report.invalidItemDetails
        });
      }
      
      // Complete the report
      report.endTime = admin.firestore.Timestamp.now();
      report.status = 'completed';
      
      await this.config.firestore.collection('media_validation_reports').doc(reportId).update({
        endTime: report.endTime,
        status: report.status
      });
      
      return report;
    } catch (error) {
      // Handle errors
      this.config.logError('Error during media validation', error);
      
      // Update report with error
      report.status = 'failed';
      report.error = error.message || 'Unknown error during validation';
      report.endTime = admin.firestore.Timestamp.now();
      
      await this.config.firestore.collection('media_validation_reports').doc(reportId).update({
        status: report.status,
        error: report.error,
        endTime: report.endTime
      });
      
      return report;
    }
  }
  
  /**
   * Fix relative URLs in a document
   * @param collectionName The collection name
   * @param documentId The document ID
   * @param documentData The document data
   */
  public async fixRelativeUrls(
    collectionName: string,
    documentId: string,
    documentData: any
  ): Promise<UrlFixResult> {
    const result: UrlFixResult = {
      documentId,
      collectionName,
      fixedUrls: [],
      fixedDocument: JSON.parse(JSON.stringify(documentData)) // Deep clone
    };
    
    // Find all media URLs
    const mediaUrls = this.findMediaUrls(documentData);
    
    // Check each URL
    for (const { url, fieldPath } of mediaUrls) {
      if (url && this.urlValidator.isRelativeURL(url)) {
        // This is a relative URL that needs fixing
        const fixedUrl = this.urlValidator.normalizePotentialRelativeURL(url, this.config.baseUrl);
        
        // Record the fix
        result.fixedUrls.push({
          fieldPath,
          originalUrl: url,
          fixedUrl
        });
        
        // Update the document
        this.updateFieldValue(result.fixedDocument, fieldPath, fixedUrl);
      }
    }
    
    // If we fixed any URLs, save the updated document
    if (result.fixedUrls.length > 0) {
      try {
        // Update the document in Firestore
        await this.config.firestore.collection(collectionName).doc(documentId).set(
          result.fixedDocument,
          { merge: true }
        );
      } catch (error) {
        this.config.logError(
          `Error updating document ${documentId} in ${collectionName}`,
          error
        );
        throw error;
      }
    }
    
    return result;
  }
  
  /**
   * Fix relative URLs in all documents within a collection
   * @param collectionName The collection to fix
   */
  public async fixCollectionRelativeUrls(collectionName: string): Promise<{
    totalDocuments: number;
    fixedDocuments: number;
    totalFixedUrls: number;
    documents: UrlFixResult[];
  }> {
    const collection = this.config.firestore.collection(collectionName);
    const snapshot = await collection.get();
    
    if (snapshot.empty) {
      this.config.logInfo(`No documents found in collection: ${collectionName}`);
      return {
        totalDocuments: 0,
        fixedDocuments: 0,
        totalFixedUrls: 0,
        documents: []
      };
    }
    
    const results: UrlFixResult[] = [];
    const fixStats = {
      totalDocuments: snapshot.size,
      fixedDocuments: 0,
      totalFixedUrls: 0
    };
    
    // Process documents in batches
    const docs = snapshot.docs;
    for (let i = 0; i < docs.length; i += this.batchSize) {
      const batchDocs = docs.slice(i, i + this.batchSize);
      
      // Process each document in the batch
      const batchPromises = batchDocs.map(async (doc) => {
        try {
          const documentData = doc.data();
          const fixResult = await this.fixRelativeUrls(
            collectionName,
            doc.id,
            documentData
          );
          
          if (fixResult.fixedUrls.length > 0) {
            // Document had fixes
            fixStats.fixedDocuments++;
            fixStats.totalFixedUrls += fixResult.fixedUrls.length;
          }
          
          return fixResult;
        } catch (error) {
          this.config.logError(`Error fixing document ${doc.id} in ${collectionName}`, error);
          return null;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      // Only keep results where fixes were made
      results.push(...batchResults.filter(result => result && result.fixedUrls.length > 0));
      
      // Log progress
      this.config.logInfo(`Processed ${i + batchResults.length} of ${docs.length} documents in ${collectionName}`);
    }
    
    return {
      ...fixStats,
      documents: results
    };
  }
  
  /**
   * Fix relative URLs in all collections
   */
  public async fixAllRelativeUrls(): Promise<{
    reportId: string;
    totalDocuments: number;
    fixedDocuments: number;
    totalFixedUrls: number;
    collections: {
      [collectionName: string]: {
        totalDocuments: number;
        fixedDocuments: number;
        totalFixedUrls: number;
      }
    };
    status: 'completed' | 'failed';
    error?: string;
  }> {
    const reportId = this.config.firestore.collection('url_fix_reports').doc().id;
    
    // Create initial report
    const report = {
      reportId,
      startTime: admin.firestore.Timestamp.now(),
      totalDocuments: 0,
      fixedDocuments: 0,
      totalFixedUrls: 0,
      collections: {},
      status: 'running' as const
    };
    
    // Save initial report
    await this.config.firestore.collection('url_fix_reports').doc(reportId).set(report);
    
    try {
      // Fix each collection
      for (const collectionName of this.config.collectionNames) {
        this.config.logInfo(`Fixing relative URLs in collection: ${collectionName}`);
        
        const collectionResults = await this.fixCollectionRelativeUrls(collectionName);
        
        // Update collection stats
        report.collections[collectionName] = {
          totalDocuments: collectionResults.totalDocuments,
          fixedDocuments: collectionResults.fixedDocuments,
          totalFixedUrls: collectionResults.totalFixedUrls
        };
        
        // Update overall stats
        report.totalDocuments += collectionResults.totalDocuments;
        report.fixedDocuments += collectionResults.fixedDocuments;
        report.totalFixedUrls += collectionResults.totalFixedUrls;
        
        // Update the report with progress
        await this.config.firestore.collection('url_fix_reports').doc(reportId).update({
          collections: report.collections,
          totalDocuments: report.totalDocuments,
          fixedDocuments: report.fixedDocuments,
          totalFixedUrls: report.totalFixedUrls
        });
      }
      
      // Complete the report
      const finalReport = {
        ...report,
        endTime: admin.firestore.Timestamp.now(),
        status: 'completed' as const
      };
      
      await this.config.firestore.collection('url_fix_reports').doc(reportId).update({
        endTime: finalReport.endTime,
        status: finalReport.status
      });
      
      return finalReport;
    } catch (error) {
      // Handle errors
      this.config.logError('Error during URL fixing', error);
      
      // Update report with error
      const errorReport = {
        ...report,
        status: 'failed' as const,
        error: error.message || 'Unknown error during URL fixing',
        endTime: admin.firestore.Timestamp.now()
      };
      
      await this.config.firestore.collection('url_fix_reports').doc(reportId).update({
        status: errorReport.status,
        error: errorReport.error,
        endTime: errorReport.endTime
      });
      
      return errorReport;
    }
  }
  
  /**
   * Update a field value in an object based on a dot-notation path
   * @param obj The object to update
   * @param path The field path in dot notation
   * @param value The new value
   */
  private updateFieldValue(obj: any, path: string, value: any): void {
    // Parse the path
    const parts = path.split('.');
    
    // Navigate to the correct property
    let current = obj;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      
      // Handle array indices
      if (part.startsWith('[') && part.endsWith(']')) {
        const index = parseInt(part.substring(1, part.length - 1), 10);
        if (i === 0) {
          current = obj[index];
        } else {
          const prevPart = parts[i - 1];
          current = current[prevPart][index];
        }
      } else if (i < parts.length - 1) {
        current = current[part];
      }
    }
    
    // Set the value
    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }
}