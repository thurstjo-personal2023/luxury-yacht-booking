/**
 * Media Validation Service
 * 
 * This module provides functionality for validating media URLs in Firebase Firestore documents.
 * It can detect invalid URLs, relative URLs, and media type mismatches.
 */

import * as admin from 'firebase-admin';
import { validateURL, fixRelativeURL, isAbsoluteURL, MEDIA_TYPES } from './url-validator';

/**
 * MediaValidationOptions interface
 */
export interface MediaValidationOptions {
  baseUrl?: string;
  placeholderImageUrl?: string;
  placeholderVideoUrl?: string;
  batchSize?: number;
  validateContent?: boolean;
  collections?: string[];
  fieldPaths?: string[];
  includeSubcollections?: boolean;
  firestore?: admin.firestore.Firestore;
}

/**
 * Media validation report interface
 */
export interface ValidationReport {
  id: string;
  timestamp: number;
  stats: {
    documentCount: number;
    fieldCount: number;
    invalidFieldCount: number;
    relativeUrlCount: number;
    imageCount: number;
    videoCount: number;
    byCollection: Record<string, {
      documentCount: number;
      invalidCount: number;
      relativeCount: number;
    }>;
    validationTimeMs: number;
  };
  invalid: InvalidMediaItem[];
  relative: RelativeUrlItem[];
}

/**
 * URL repair report interface
 */
export interface UrlFixReport {
  id: string;
  timestamp: number;
  stats: {
    documentCount: number;
    fixedDocumentCount: number;
    fixedFieldCount: number;
    byCollection: Record<string, {
      documentCount: number;
      fixedCount: number;
    }>;
    fixTimeMs: number;
  };
  fixes: UrlFix[];
}

/**
 * Invalid media item interface
 */
export interface InvalidMediaItem {
  docId: string;
  collection: string;
  path: string;
  url: string;
  reason: string;
  status?: number;
  error?: string;
}

/**
 * Relative URL item interface
 */
export interface RelativeUrlItem {
  docId: string;
  collection: string;
  path: string;
  url: string;
}

/**
 * URL fix item interface
 */
export interface UrlFix {
  docId: string;
  collection: string;
  path: string;
  oldUrl: string;
  newUrl: string;
}

/**
 * Default validation options
 */
const DEFAULT_OPTIONS: MediaValidationOptions = {
  baseUrl: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app',
  placeholderImageUrl: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/yacht-placeholder.jpg',
  placeholderVideoUrl: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/placeholders/video-placeholder.mp4',
  batchSize: 50,
  validateContent: true,
  includeSubcollections: false,
  fieldPaths: ['media.*.url', 'mediaUrl', 'imageUrl', 'thumbnailUrl', 'profilePhoto', 'coverImage']
};

/**
 * Media Validation Service class
 * Provides methods for validating and fixing media URLs in Firestore documents
 */
export class MediaValidationService {
  private options: MediaValidationOptions;
  private db: admin.firestore.Firestore;
  
  /**
   * Constructor
   */
  constructor(options: MediaValidationOptions = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.db = options.firestore || admin.firestore();
  }
  
  /**
   * Get Firestore instance
   */
  getFirestore(): admin.firestore.Firestore {
    return this.db;
  }
  
  /**
   * Validate all collections
   */
  async validateAllCollections(): Promise<ValidationReport> {
    const startTime = Date.now();
    const collections = this.options.collections || await this.getCollections();
    
    const report: ValidationReport = {
      id: this.db.collection('reports').doc().id,
      timestamp: Date.now(),
      stats: {
        documentCount: 0,
        fieldCount: 0,
        invalidFieldCount: 0,
        relativeUrlCount: 0,
        imageCount: 0,
        videoCount: 0,
        byCollection: {},
        validationTimeMs: 0
      },
      invalid: [],
      relative: []
    };
    
    for (const collection of collections) {
      const collectionReport = await this.validateCollection(collection);
      
      // Merge collection report into overall report
      report.stats.documentCount += collectionReport.stats.documentCount;
      report.stats.fieldCount += collectionReport.stats.fieldCount;
      report.stats.invalidFieldCount += collectionReport.stats.invalidFieldCount;
      report.stats.relativeUrlCount += collectionReport.stats.relativeUrlCount;
      report.stats.imageCount += collectionReport.stats.imageCount;
      report.stats.videoCount += collectionReport.stats.videoCount;
      report.stats.byCollection[collection] = collectionReport.stats.byCollection[collection];
      
      report.invalid.push(...collectionReport.invalid);
      report.relative.push(...collectionReport.relative);
      
      // Save progress to firestore
      await this.saveValidationReport(report);
    }
    
    report.stats.validationTimeMs = Date.now() - startTime;
    
    // Save final report
    await this.saveValidationReport(report);
    
    return report;
  }
  
  /**
   * Validate a specific collection
   */
  async validateCollection(collectionName: string): Promise<ValidationReport> {
    const startTime = Date.now();
    const batchSize = this.options.batchSize || 50;
    
    const report: ValidationReport = {
      id: this.db.collection('reports').doc().id,
      timestamp: Date.now(),
      stats: {
        documentCount: 0,
        fieldCount: 0,
        invalidFieldCount: 0,
        relativeUrlCount: 0,
        imageCount: 0,
        videoCount: 0,
        byCollection: {
          [collectionName]: {
            documentCount: 0,
            invalidCount: 0,
            relativeCount: 0
          }
        },
        validationTimeMs: 0
      },
      invalid: [],
      relative: []
    };
    
    // Get all documents for the collection
    let query = this.db.collection(collectionName).limit(batchSize);
    let lastDoc: admin.firestore.DocumentSnapshot | null = null;
    
    while (true) {
      if (lastDoc) {
        query = this.db.collection(collectionName)
          .startAfter(lastDoc)
          .limit(batchSize);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }
      
      report.stats.documentCount += snapshot.size;
      report.stats.byCollection[collectionName].documentCount += snapshot.size;
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // Process each document
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const docId = doc.id;
        
        // Process media fields in document
        const validationResults = await this.validateDocumentMedia(docData, docId, collectionName);
        
        // Update counts
        report.stats.fieldCount += validationResults.fieldCount;
        report.stats.invalidFieldCount += validationResults.invalidItems.length;
        report.stats.relativeUrlCount += validationResults.relativeItems.length;
        report.stats.imageCount += validationResults.imageCount;
        report.stats.videoCount += validationResults.videoCount;
        
        // Update collection-specific counts
        report.stats.byCollection[collectionName].invalidCount += validationResults.invalidItems.length;
        report.stats.byCollection[collectionName].relativeCount += validationResults.relativeItems.length;
        
        // Add invalid and relative items to report
        report.invalid.push(...validationResults.invalidItems);
        report.relative.push(...validationResults.relativeItems);
      }
      
      // If we processed fewer documents than the batch size, we're done
      if (snapshot.size < batchSize) {
        break;
      }
    }
    
    report.stats.validationTimeMs = Date.now() - startTime;
    
    // Save report
    await this.saveValidationReport(report);
    
    return report;
  }
  
  /**
   * Fix all relative URLs in all collections
   */
  async fixAllRelativeUrls(): Promise<UrlFixReport> {
    const startTime = Date.now();
    const collections = this.options.collections || await this.getCollections();
    
    const report: UrlFixReport = {
      id: this.db.collection('reports').doc().id,
      timestamp: Date.now(),
      stats: {
        documentCount: 0,
        fixedDocumentCount: 0,
        fixedFieldCount: 0,
        byCollection: {},
        fixTimeMs: 0
      },
      fixes: []
    };
    
    for (const collection of collections) {
      const collectionReport = await this.fixCollectionRelativeUrls(collection);
      
      // Merge collection report into overall report
      report.stats.documentCount += collectionReport.stats.documentCount;
      report.stats.fixedDocumentCount += collectionReport.stats.fixedDocumentCount;
      report.stats.fixedFieldCount += collectionReport.stats.fixedFieldCount;
      report.stats.byCollection[collection] = collectionReport.stats.byCollection[collection];
      
      report.fixes.push(...collectionReport.fixes);
      
      // Save progress to firestore
      await this.saveUrlFixReport(report);
    }
    
    report.stats.fixTimeMs = Date.now() - startTime;
    
    // Save final report
    await this.saveUrlFixReport(report);
    
    return report;
  }
  
  /**
   * Fix relative URLs in a specific collection
   */
  async fixCollectionRelativeUrls(collectionName: string): Promise<UrlFixReport> {
    const startTime = Date.now();
    const batchSize = this.options.batchSize || 50;
    
    const report: UrlFixReport = {
      id: this.db.collection('reports').doc().id,
      timestamp: Date.now(),
      stats: {
        documentCount: 0,
        fixedDocumentCount: 0,
        fixedFieldCount: 0,
        byCollection: {
          [collectionName]: {
            documentCount: 0,
            fixedCount: 0
          }
        },
        fixTimeMs: 0
      },
      fixes: []
    };
    
    // Get all documents for the collection
    let query = this.db.collection(collectionName).limit(batchSize);
    let lastDoc: admin.firestore.DocumentSnapshot | null = null;
    
    while (true) {
      if (lastDoc) {
        query = this.db.collection(collectionName)
          .startAfter(lastDoc)
          .limit(batchSize);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break;
      }
      
      report.stats.documentCount += snapshot.size;
      report.stats.byCollection[collectionName].documentCount += snapshot.size;
      
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // Process each document
      for (const doc of snapshot.docs) {
        const docData = doc.data();
        const docId = doc.id;
        
        // Fix relative URLs in document
        const fixResults = await this.fixDocumentRelativeUrls(doc, docData, docId, collectionName);
        
        if (fixResults.fixCount > 0) {
          report.stats.fixedDocumentCount++;
          report.stats.fixedFieldCount += fixResults.fixCount;
          report.stats.byCollection[collectionName].fixedCount += fixResults.fixCount;
          report.fixes.push(...fixResults.fixes);
        }
      }
      
      // If we processed fewer documents than the batch size, we're done
      if (snapshot.size < batchSize) {
        break;
      }
    }
    
    report.stats.fixTimeMs = Date.now() - startTime;
    
    // Save report
    await this.saveUrlFixReport(report);
    
    return report;
  }
  
  /**
   * Validate media fields in a document
   */
  private async validateDocumentMedia(
    docData: any, 
    docId: string, 
    collectionName: string
  ): Promise<{
    fieldCount: number;
    invalidItems: InvalidMediaItem[];
    relativeItems: RelativeUrlItem[];
    imageCount: number;
    videoCount: number;
  }> {
    const result = {
      fieldCount: 0,
      invalidItems: [] as InvalidMediaItem[],
      relativeItems: [] as RelativeUrlItem[],
      imageCount: 0,
      videoCount: 0
    };
    
    if (!docData) {
      return result;
    }
    
    const fieldPaths = this.options.fieldPaths || DEFAULT_OPTIONS.fieldPaths || [];
    
    // Process each field path pattern
    for (const pathPattern of fieldPaths) {
      const paths = this.expandFieldPath(pathPattern, docData);
      
      for (const path of paths) {
        const url = this.getValueAtPath(docData, path);
        
        // Skip if not a string or empty
        if (typeof url !== 'string' || url.trim() === '') {
          continue;
        }
        
        result.fieldCount++;
        
        // Check if URL is absolute
        if (!isAbsoluteURL(url)) {
          result.relativeItems.push({
            docId,
            collection: collectionName,
            path,
            url
          });
          continue;
        }
        
        // Determine expected media type from path
        const expectedType = this.getExpectedMediaType(path);
        
        // Validate URL if content validation is enabled
        if (this.options.validateContent) {
          try {
            const validation = await validateURL(url, {
              validateContent: true,
              expectedType
            });
            
            if (validation.mediaType === MEDIA_TYPES.IMAGE) {
              result.imageCount++;
            } else if (validation.mediaType === MEDIA_TYPES.VIDEO) {
              result.videoCount++;
            }
            
            if (!validation.isValid) {
              result.invalidItems.push({
                docId,
                collection: collectionName,
                path,
                url,
                reason: validation.error || 'Unknown error',
                status: validation.statusCode
              });
            }
          } catch (error) {
            result.invalidItems.push({
              docId,
              collection: collectionName,
              path,
              url,
              reason: 'Validation error',
              error: error.message || String(error)
            });
          }
        }
      }
    }
    
    return result;
  }
  
  /**
   * Fix relative URLs in a document
   */
  private async fixDocumentRelativeUrls(
    doc: admin.firestore.DocumentSnapshot,
    docData: any,
    docId: string,
    collectionName: string
  ): Promise<{
    fixCount: number;
    fixes: UrlFix[];
  }> {
    const result = {
      fixCount: 0,
      fixes: [] as UrlFix[]
    };
    
    if (!docData) {
      return result;
    }
    
    const updates: any = {};
    const fieldPaths = this.options.fieldPaths || DEFAULT_OPTIONS.fieldPaths || [];
    
    // Process each field path pattern
    for (const pathPattern of fieldPaths) {
      const paths = this.expandFieldPath(pathPattern, docData);
      
      for (const path of paths) {
        const url = this.getValueAtPath(docData, path);
        
        // Skip if not a string or empty or already absolute
        if (typeof url !== 'string' || url.trim() === '' || isAbsoluteURL(url)) {
          continue;
        }
        
        // Determine placeholder URL based on expected media type
        const expectedType = this.getExpectedMediaType(path);
        const placeholder = expectedType === MEDIA_TYPES.VIDEO 
          ? this.options.placeholderVideoUrl 
          : this.options.placeholderImageUrl;
        
        // Fix relative URL
        const fixedUrl = fixRelativeURL(url, this.options.baseUrl || '', placeholder);
        
        if (fixedUrl !== url) {
          this.setValueAtPath(updates, path, fixedUrl);
          
          result.fixCount++;
          result.fixes.push({
            docId,
            collection: collectionName,
            path,
            oldUrl: url,
            newUrl: fixedUrl
          });
        }
      }
    }
    
    // Update document if there are any changes
    if (Object.keys(updates).length > 0) {
      await doc.ref.update(updates);
    }
    
    return result;
  }
  
  /**
   * Get all collections in the database
   */
  private async getCollections(): Promise<string[]> {
    const collections = await this.db.listCollections();
    return collections.map(col => col.id);
  }
  
  /**
   * Expand field path pattern to actual paths
   * Handles wildcards in field paths, e.g. "media.*.url"
   */
  private expandFieldPath(pattern: string, data: any): string[] {
    if (!pattern.includes('*')) {
      return [pattern];
    }
    
    const paths: string[] = [];
    const parts = pattern.split('.');
    
    const expandSegment = (currentPath: string[], remainingParts: string[], currentData: any) => {
      if (remainingParts.length === 0) {
        paths.push(currentPath.join('.'));
        return;
      }
      
      const segment = remainingParts[0];
      const restParts = remainingParts.slice(1);
      
      if (segment === '*') {
        // Handle wildcard segment
        if (Array.isArray(currentData)) {
          // For arrays, use numeric indices
          for (let i = 0; i < currentData.length; i++) {
            expandSegment([...currentPath, i.toString()], restParts, currentData[i]);
          }
        } else if (currentData && typeof currentData === 'object') {
          // For objects, use keys
          for (const key of Object.keys(currentData)) {
            expandSegment([...currentPath, key], restParts, currentData[key]);
          }
        }
      } else {
        // Handle regular segment
        expandSegment([...currentPath, segment], restParts, currentData?.[segment]);
      }
    };
    
    expandSegment([], parts, data);
    return paths;
  }
  
  /**
   * Get value at a field path
   */
  private getValueAtPath(data: any, path: string): any {
    if (!data || !path) {
      return undefined;
    }
    
    const parts = path.split('.');
    let current = data;
    
    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      
      current = current[part];
    }
    
    return current;
  }
  
  /**
   * Set value at a field path in an update object
   */
  private setValueAtPath(updates: any, path: string, value: any): void {
    updates[path] = value;
  }
  
  /**
   * Determine expected media type from field path
   */
  private getExpectedMediaType(path: string): string {
    const lowercasePath = path.toLowerCase();
    
    if (
      lowercasePath.includes('video') || 
      lowercasePath.endsWith('.mp4') || 
      lowercasePath.endsWith('.webm') || 
      lowercasePath.endsWith('.mov')
    ) {
      return MEDIA_TYPES.VIDEO;
    }
    
    return MEDIA_TYPES.IMAGE;
  }
  
  /**
   * Save validation report to Firestore
   */
  private async saveValidationReport(report: ValidationReport): Promise<void> {
    try {
      await this.db.collection('media_validation_reports').doc(report.id).set(report);
    } catch (error) {
      console.error('Error saving validation report:', error);
    }
  }
  
  /**
   * Save URL fix report to Firestore
   */
  private async saveUrlFixReport(report: UrlFixReport): Promise<void> {
    try {
      await this.db.collection('url_fix_reports').doc(report.id).set(report);
    } catch (error) {
      console.error('Error saving URL fix report:', error);
    }
  }
}

/**
 * Create default media validation service
 */
export function createMediaValidationService(options: MediaValidationOptions = {}): MediaValidationService {
  return new MediaValidationService(options);
}