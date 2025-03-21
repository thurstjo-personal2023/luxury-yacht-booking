/**
 * Firebase Media Repository
 * 
 * Implementation of the IMediaRepository interface using Firebase.
 */

import { Firestore, DocumentData, QueryDocumentSnapshot } from 'firebase/firestore';
import { collection, getDocs, doc, getDoc, updateDoc, setDoc, query, limit, startAfter, orderBy } from 'firebase/firestore';
import axios from 'axios';

import { IMediaRepository } from '../interfaces/media-repository';
import { DocumentValidationResult } from '../../../core/domain/validation/document-validation-result';
import { Media, createPlaceholderMedia } from '../../../core/domain/media/media';
import { MediaType, getMediaTypeFromMime, getMediaTypeFromUrl } from '../../../core/domain/media/media-type';
import { ValidationResult } from '../../../core/domain/validation/validation-result';

/**
 * Firebase media repository configuration
 */
export interface FirebaseMediaRepositoryConfig {
  collectionsToExclude?: string[];
  maxConcurrentRequests?: number;
  validationTimeoutMs?: number;
  placeholderBaseUrl?: string;
}

/**
 * Default Firebase media repository configuration
 */
export const DEFAULT_FIREBASE_REPOSITORY_CONFIG: FirebaseMediaRepositoryConfig = {
  collectionsToExclude: ['media_validation_reports', 'mail', 'logs', 'system_settings'],
  maxConcurrentRequests: 10,
  validationTimeoutMs: 10000,
  placeholderBaseUrl: 'https://etoile-yachts.replit.app/placeholders'
};

/**
 * Firebase media repository
 */
export class FirebaseMediaRepository implements IMediaRepository {
  private db: Firestore;
  private config: FirebaseMediaRepositoryConfig;

  constructor(
    db: Firestore,
    config: FirebaseMediaRepositoryConfig = {}
  ) {
    this.db = db;
    this.config = {
      ...DEFAULT_FIREBASE_REPOSITORY_CONFIG,
      ...config
    };
  }

  /**
   * Get all collections
   */
  async getCollections(): Promise<string[]> {
    try {
      const collections = await getDocs(collection(this.db, '/'));
      return collections.docs
        .map(doc => doc.id)
        .filter(id => !this.config.collectionsToExclude?.includes(id));
    } catch (error) {
      console.error('Error getting collections:', error);
      throw error;
    }
  }

  /**
   * Get document IDs for a collection
   * Optionally limited by batch size and starting index for pagination
   */
  async getDocumentIds(
    collectionName: string,
    limitSize?: number,
    startIndex?: number
  ): Promise<string[]> {
    try {
      let docsQuery = query(
        collection(this.db, collectionName),
        orderBy('__name__')
      );

      // Apply pagination if specified
      if (limitSize) {
        docsQuery = query(docsQuery, limit(limitSize));
      }

      // If startIndex is specified, we need to get the document at that index
      // and use it as the starting point for our query
      if (startIndex && startIndex > 0) {
        // Get all documents up to startIndex
        const snapshot = await getDocs(
          query(
            collection(this.db, collectionName),
            orderBy('__name__'),
            limit(startIndex)
          )
        );

        // Use the last document as the starting point
        if (snapshot.docs.length === startIndex) {
          const lastDoc = snapshot.docs[snapshot.docs.length - 1];
          docsQuery = query(docsQuery, startAfter(lastDoc));
        }
      }

      const documentsSnapshot = await getDocs(docsQuery);
      return documentsSnapshot.docs.map(doc => doc.id);
    } catch (error) {
      console.error(`Error getting document IDs for collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get a document by ID
   */
  async getDocument(
    collectionName: string,
    documentId: string
  ): Promise<Record<string, any>> {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      const snapshot = await getDoc(docRef);
      
      if (!snapshot.exists()) {
        throw new Error(`Document ${documentId} does not exist in collection ${collectionName}`);
      }
      
      return snapshot.data() as Record<string, any>;
    } catch (error) {
      console.error(`Error getting document ${documentId} from collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Get all media URLs in a document
   * Returns a map of field paths to URLs
   */
  async getMediaUrls(
    collectionName: string,
    documentId: string
  ): Promise<Map<string, string>> {
    try {
      const urls = new Map<string, string>();
      const data = await this.getDocument(collectionName, documentId);
      
      // Recursively scan the document for URLs
      this.extractUrlsFromObject(data, urls);
      
      return urls;
    } catch (error) {
      console.error(`Error getting media URLs from document ${documentId} in collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Recursively extract URLs from an object
   */
  private extractUrlsFromObject(
    obj: any,
    urls: Map<string, string>,
    prefix: string = ''
  ): void {
    if (!obj || typeof obj !== 'object') {
      return;
    }

    // Handle arrays
    if (Array.isArray(obj)) {
      obj.forEach((item, index) => {
        const path = prefix ? `${prefix}.[${index}]` : `[${index}]`;
        
        // Check if this is a Media object
        if (item && typeof item === 'object' && 'url' in item && 'type' in item) {
          urls.set(`${path}.url`, item.url);
        } else {
          this.extractUrlsFromObject(item, urls, path);
        }
      });
      return;
    }

    // Handle objects
    Object.entries(obj).forEach(([key, value]) => {
      const path = prefix ? `${prefix}.${key}` : key;
      
      // Check if this is a URL
      if (key === 'url' && typeof value === 'string') {
        urls.set(path, value);
        return;
      }
      
      // Check if this is a Media object
      if (
        key === 'media' && 
        Array.isArray(value) && 
        value.length > 0 && 
        typeof value[0] === 'object' && 
        'url' in value[0]
      ) {
        value.forEach((media: any, index: number) => {
          if (media && typeof media === 'object' && 'url' in media) {
            urls.set(`${path}.[${index}].url`, media.url);
          }
        });
        return;
      }
      
      // Check for other nested objects or arrays with URLs
      if (value && typeof value === 'object') {
        this.extractUrlsFromObject(value, urls, path);
      }
    });
  }

  /**
   * Get media type from URL or content
   */
  async getMediaTypeFromUrl(url: string): Promise<MediaType> {
    // First, check if we can determine the type from the URL itself
    const guessedType = getMediaTypeFromUrl(url);
    
    // If we're confident in the URL-based guess, return it
    if (guessedType !== MediaType.UNKNOWN) {
      return guessedType;
    }
    
    // Otherwise, try to fetch headers to get content type
    try {
      const response = await axios.head(url, { 
        timeout: this.config.validationTimeoutMs,
        maxRedirects: 5
      });
      
      const contentType = response.headers['content-type'];
      return getMediaTypeFromMime(contentType);
    } catch (error) {
      // If we can't determine, default to image
      return MediaType.IMAGE;
    }
  }

  /**
   * Check if a URL is valid and accessible
   */
  async validateUrl(
    url: string,
    expectedType?: MediaType
  ): Promise<{
    isValid: boolean;
    status?: number;
    statusText?: string;
    contentType?: string;
    error?: string;
  }> {
    try {
      // Skip validation for data URLs
      if (url.startsWith('data:')) {
        return {
          isValid: true,
          status: 200,
          statusText: 'OK',
          contentType: url.split(',')[0].split(':')[1].split(';')[0]
        };
      }
      
      // Make a HEAD request to check if the URL is accessible
      const response = await axios.head(url, {
        timeout: this.config.validationTimeoutMs,
        maxRedirects: 5,
        validateStatus: (status) => status < 500 // Accept 4xx responses for validation
      });
      
      const contentType = response.headers['content-type'];
      
      // Check if status is successful
      const isStatusValid = response.status >= 200 && response.status < 400;
      
      // If expected type is specified, check if it matches
      if (expectedType && isStatusValid) {
        const actualType = getMediaTypeFromMime(contentType);
        
        if (actualType !== expectedType && actualType !== MediaType.UNKNOWN) {
          return {
            isValid: false,
            status: response.status,
            statusText: response.statusText,
            contentType,
            error: `Expected ${expectedType}, got ${actualType}`
          };
        }
      }
      
      return {
        isValid: isStatusValid,
        status: response.status,
        statusText: response.statusText,
        contentType
      };
    } catch (error) {
      // Handle different error types
      if (axios.isAxiosError(error)) {
        return {
          isValid: false,
          status: error.response?.status,
          statusText: error.response?.statusText,
          error: error.message
        };
      }
      
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  /**
   * Save validation result
   */
  async saveValidationResult(
    result: DocumentValidationResult,
    reportId: string
  ): Promise<void> {
    try {
      const docRef = doc(this.db, 'media_validation_reports', reportId);
      const docResult = collection(docRef, 'document_results');
      
      // Create a document for this result
      await setDoc(
        doc(docResult, `${result.getCollection()}_${result.getDocumentId()}`),
        result.toObject()
      );
    } catch (error) {
      console.error('Error saving validation result:', error);
      throw error;
    }
  }

  /**
   * Get summary of validation reports
   */
  async getValidationReports(): Promise<{
    id: string;
    startTime: Date;
    endTime: Date;
    totalDocuments: number;
    validUrlsPercent: number;
    invalidUrlsPercent: number;
  }[]> {
    try {
      const reportsCollection = collection(this.db, 'media_validation_reports');
      const snapshot = await getDocs(reportsCollection);
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate(),
          totalDocuments: data.totalDocuments,
          validUrlsPercent: (data.validUrls / data.totalUrls) * 100,
          invalidUrlsPercent: (data.invalidUrls / data.totalUrls) * 100
        };
      });
    } catch (error) {
      console.error('Error getting validation reports:', error);
      throw error;
    }
  }

  /**
   * Get details of a validation report
   */
  async getValidationReport(reportId: string): Promise<{
    id: string;
    startTime: Date;
    endTime: Date;
    totalDocuments: number;
    totalFields: number;
    validUrls: number;
    invalidUrls: number;
    missingUrls: number;
    collectionSummaries: Array<{
      collection: string;
      totalUrls: number;
      validUrls: number;
      invalidUrls: number;
      missingUrls: number;
    }>;
    invalidResults: Array<{
      collection: string;
      documentId: string;
      field: string;
      url: string;
      error: string;
    }>;
  }> {
    try {
      // Get the report document
      const reportRef = doc(this.db, 'media_validation_reports', reportId);
      const reportSnapshot = await getDoc(reportRef);
      
      if (!reportSnapshot.exists()) {
        throw new Error(`Report ${reportId} not found`);
      }
      
      const reportData = reportSnapshot.data();
      
      // Get the document results subcollection
      const resultsCollection = collection(reportRef, 'document_results');
      const resultsSnapshot = await getDocs(resultsCollection);
      
      // Extract the invalid results
      const invalidResults: Array<{
        collection: string;
        documentId: string;
        field: string;
        url: string;
        error: string;
      }> = [];
      
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        
        if (data.invalidFields && Array.isArray(data.invalidFields)) {
          data.invalidFields.forEach((field: any) => {
            invalidResults.push({
              collection: data.collection,
              documentId: data.documentId,
              field: field.field,
              url: field.url,
              error: field.error || 'Unknown error'
            });
          });
        }
      });
      
      return {
        id: reportId,
        startTime: reportData.startTime.toDate(),
        endTime: reportData.endTime.toDate(),
        totalDocuments: reportData.totalDocuments,
        totalFields: reportData.totalFields,
        validUrls: reportData.validUrls,
        invalidUrls: reportData.invalidUrls,
        missingUrls: reportData.missingUrls,
        collectionSummaries: reportData.collectionSummaries,
        invalidResults
      };
    } catch (error) {
      console.error(`Error getting validation report ${reportId}:`, error);
      throw error;
    }
  }

  /**
   * Update document fields
   */
  async updateDocument(
    collectionName: string,
    documentId: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const docRef = doc(this.db, collectionName, documentId);
      await updateDoc(docRef, updates);
    } catch (error) {
      console.error(`Error updating document ${documentId} in collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Replace a field's value in a document
   */
  async replaceFieldValue(
    collectionName: string,
    documentId: string,
    fieldPath: string,
    value: any
  ): Promise<void> {
    try {
      // Convert field path to object structure
      const updates = this.createNestedObject({}, fieldPath, value);
      await this.updateDocument(collectionName, documentId, updates);
    } catch (error) {
      console.error(`Error replacing field ${fieldPath} in document ${documentId} of collection ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Create a nested object from a field path
   */
  private createNestedObject(
    obj: Record<string, any>,
    path: string,
    value: any
  ): Record<string, any> {
    // Handle array paths
    const arrayMatch = path.match(/^(.*)\.\[(\d+)\](.*)$/);
    if (arrayMatch) {
      const [, prefix, indexStr, suffix] = arrayMatch;
      const index = parseInt(indexStr, 10);
      
      if (prefix) {
        // We have a prefix, so create a nested object for it
        const prefixObj = this.createNestedObject({}, prefix, []);
        const prefixKey = Object.keys(prefixObj)[0];
        
        if (!obj[prefixKey]) {
          obj[prefixKey] = prefixObj[prefixKey];
        }
        
        // Ensure the array exists
        if (!Array.isArray(obj[prefixKey])) {
          obj[prefixKey] = [];
        }
        
        // Ensure the array has enough elements
        while (obj[prefixKey].length <= index) {
          obj[prefixKey].push(null);
        }
        
        if (suffix) {
          // We have a suffix, so create a nested object for it
          if (!obj[prefixKey][index] || typeof obj[prefixKey][index] !== 'object') {
            obj[prefixKey][index] = {};
          }
          
          const suffixPath = suffix.startsWith('.') ? suffix.substring(1) : suffix;
          this.createNestedObject(obj[prefixKey][index], suffixPath, value);
        } else {
          // No suffix, so assign the value directly
          obj[prefixKey][index] = value;
        }
      } else {
        // No prefix, direct array assignment
        if (!obj[index]) {
          obj[index] = value;
        }
      }
      
      return obj;
    }
    
    // Handle regular dot-notation paths
    const parts = path.split('.');
    
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      if (!current[part]) {
        current[part] = {};
      }
      current = current[part];
    }
    
    current[parts[parts.length - 1]] = value;
    return obj;
  }

  /**
   * Create a placeholder media object
   */
  async createPlaceholderMedia(type: MediaType): Promise<Media> {
    return createPlaceholderMedia(type);
  }
}