/**
 * Firebase Media Repository Implementation
 * 
 * This module implements the IMediaRepository interface using Firebase Firestore.
 */

import { 
  Firestore, 
  CollectionReference, 
  DocumentReference, 
  DocumentSnapshot,
  QueryDocumentSnapshot,
  Query,
  WriteBatch,
  FieldPath
} from 'firebase/firestore';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

import { 
  IMediaRepository,
  MediaValidationResult,
  DocumentUrlValidationResult,
  DocumentValidationResult,
  CollectionValidationOptions,
  ValidationReport,
  CollectionValidationSummary,
  UrlRepairOptions,
  UrlRepairResult,
  RepairReport
} from '../interfaces/media-repository';
import { Media } from '../../../core/domain/media/media';
import { IMediaValidationService } from '../../../core/domain/media/media-validation-service';

/**
 * Firebase media repository configuration
 */
export interface FirebaseMediaRepositoryConfig {
  mediaCollection: string;
  reportsCollection: string;
  repairReportsCollection: string;
  batchSize: number;
  placeholderImageUrl: string;
  placeholderVideoUrl: string;
  baseUrl: string;
}

/**
 * Firebase media repository implementation
 */
export class FirebaseMediaRepository implements IMediaRepository {
  private readonly mediaCollection: CollectionReference;
  private readonly reportsCollection: CollectionReference;
  private readonly repairReportsCollection: CollectionReference;
  
  constructor(
    private readonly firestore: Firestore,
    private readonly mediaValidationService: IMediaValidationService,
    private readonly config: FirebaseMediaRepositoryConfig
  ) {
    this.mediaCollection = this.getCollection(config.mediaCollection);
    this.reportsCollection = this.getCollection(config.reportsCollection);
    this.repairReportsCollection = this.getCollection(config.repairReportsCollection);
  }
  
  /**
   * Get a Firestore collection reference
   */
  private getCollection(collectionPath: string): CollectionReference {
    return this.firestore.collection(collectionPath);
  }
  
  /**
   * Save a media entity to Firestore
   */
  async saveMedia(media: Media): Promise<Media> {
    const mediaData = this.mapMediaToFirestore(media);
    const docRef = media.id
      ? this.mediaCollection.doc(media.id)
      : this.mediaCollection.doc();
    
    await docRef.set(mediaData);
    
    return media;
  }
  
  /**
   * Get a media entity by ID from Firestore
   */
  async getMediaById(id: string): Promise<Media | null> {
    const docRef = this.mediaCollection.doc(id);
    const doc = await docRef.get();
    
    if (!doc.exists) {
      return null;
    }
    
    return this.mapFirestoreToMedia(doc);
  }
  
  /**
   * Validate a media URL
   */
  async validateMediaUrl(
    url: string,
    mediaType?: 'image' | 'video'
  ): Promise<MediaValidationResult> {
    try {
      if (!url || url.trim() === '') {
        return {
          isValid: false,
          status: 400,
          error: 'URL is empty or undefined',
          contentType: undefined
        };
      }
      
      // Check if it's a relative URL (we'll consider it invalid)
      if (this.mediaValidationService.isRelativeUrl(url)) {
        return {
          isValid: false,
          status: 400,
          error: 'Relative URLs are not supported',
          contentType: undefined
        };
      }
      
      // Check if it's a blob URL (we'll consider it invalid)
      if (this.mediaValidationService.isBlobUrl(url)) {
        return {
          isValid: false,
          status: 400,
          error: 'Blob URLs are not supported',
          contentType: undefined
        };
      }
      
      // Check if it's a data URL
      if (this.mediaValidationService.isDataUrl(url)) {
        // Data URLs are valid, but we don't need to verify them further
        return {
          isValid: true,
          status: 200,
          contentType: url.startsWith('data:image/') ? 'image' : 'unknown'
        };
      }
      
      // Perform HTTP request to validate URL
      try {
        const response = await axios.head(url, {
          timeout: 5000,
          maxRedirects: 5
        });
        
        const contentType = response.headers['content-type'] || '';
        const isImage = contentType.startsWith('image/');
        const isVideo = contentType.startsWith('video/') || 
          url.includes('.mp4') || 
          url.includes('-SBV-') || 
          url.includes('Dynamic motion');
        
        // Check if content type matches expected type
        if (mediaType === 'image' && !isImage) {
          return {
            isValid: false,
            status: response.status,
            statusText: response.statusText,
            contentType,
            error: `Expected image, got ${contentType}`
          };
        }
        
        if (mediaType === 'video' && !isVideo) {
          return {
            isValid: false,
            status: response.status,
            statusText: response.statusText,
            contentType,
            error: `Expected video, got ${contentType}`
          };
        }
        
        return {
          isValid: true,
          status: response.status,
          statusText: response.statusText,
          contentType
        };
      } catch (error) {
        if (axios.isAxiosError(error)) {
          return {
            isValid: false,
            status: error.response?.status || 0,
            statusText: error.response?.statusText || '',
            error: error.message,
            contentType: error.response?.headers?.['content-type']
          };
        }
        
        return {
          isValid: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    } catch (error) {
      return {
        isValid: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Validate a document field containing a media URL
   */
  async validateDocumentField(
    collection: string,
    documentId: string,
    field: string
  ): Promise<DocumentUrlValidationResult> {
    try {
      const docRef = this.firestore.collection(collection).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return {
          url: '',
          collection,
          documentId,
          field,
          isValid: false,
          mediaType: 'unknown',
          error: 'Document does not exist'
        };
      }
      
      const data = doc.data();
      let url = '';
      
      // Handle nested fields like 'media.0.url'
      if (field.includes('.')) {
        const parts = field.split('.');
        let current: any = data;
        
        for (const part of parts) {
          if (current === undefined || current === null) {
            break;
          }
          
          // Handle array indices
          if (!isNaN(Number(part)) && Array.isArray(current)) {
            current = current[Number(part)];
          } else {
            current = current[part];
          }
        }
        
        url = current;
      } else {
        url = data?.[field];
      }
      
      if (!url || typeof url !== 'string') {
        return {
          url: '',
          collection,
          documentId,
          field,
          isValid: false,
          mediaType: 'unknown',
          error: 'Field is empty or not a string'
        };
      }
      
      // Determine expected media type based on field name or context
      const expectedType = this.getExpectedMediaType(field, url);
      
      // Detect media type
      const detectionResult = await this.mediaValidationService.detectMediaType(url);
      
      // Validate the URL
      const validationResult = await this.mediaValidationService.validateMediaUrl(url, {
        expectedType
      });
      
      return {
        url,
        collection,
        documentId,
        field,
        isValid: validationResult.isValid,
        mediaType: detectionResult.detectedType,
        status: validationResult.status,
        statusText: validationResult.statusText,
        contentType: validationResult.contentType,
        error: validationResult.error,
        detectedType: detectionResult.mimeType,
        expectedType
      };
    } catch (error) {
      return {
        url: '',
        collection,
        documentId,
        field,
        isValid: false,
        mediaType: 'unknown',
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Determine the expected media type based on field name and URL
   */
  private getExpectedMediaType(field: string, url: string): 'image' | 'video' | undefined {
    // Check URL for video indicators
    if (
      url.includes('.mp4') || 
      url.includes('.mov') || 
      url.includes('.webm') || 
      url.includes('video/') ||
      url.includes('-SBV-') || 
      url.includes('Dynamic motion')
    ) {
      return 'video';
    }
    
    // Check URL for image indicators
    if (
      url.includes('.jpg') || 
      url.includes('.jpeg') || 
      url.includes('.png') || 
      url.includes('.gif') || 
      url.includes('.webp') || 
      url.includes('image/')
    ) {
      return 'image';
    }
    
    // Check field name for indicators
    const fieldLower = field.toLowerCase();
    if (
      fieldLower.includes('video') || 
      fieldLower.includes('movie') || 
      fieldLower.includes('clip')
    ) {
      return 'video';
    }
    
    if (
      fieldLower.includes('image') || 
      fieldLower.includes('photo') || 
      fieldLower.includes('picture') || 
      fieldLower.includes('thumbnail') || 
      fieldLower.includes('cover') || 
      fieldLower.includes('avatar')
    ) {
      return 'image';
    }
    
    // Default to image if we can't determine
    return 'image';
  }
  
  /**
   * Validate all media URLs in a document
   */
  async validateDocument(
    collection: string,
    documentId: string
  ): Promise<DocumentValidationResult> {
    try {
      const docRef = this.firestore.collection(collection).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return {
          collection,
          documentId,
          totalUrls: 0,
          validUrls: 0,
          invalidUrls: 0,
          missingUrls: 0,
          results: []
        };
      }
      
      const data = doc.data();
      const mediaFields = this.findMediaFields(data);
      const results: DocumentUrlValidationResult[] = [];
      
      for (const field of mediaFields) {
        const result = await this.validateDocumentField(collection, documentId, field);
        results.push(result);
      }
      
      const totalUrls = results.length;
      const validUrls = results.filter(r => r.isValid).length;
      const invalidUrls = results.filter(r => !r.isValid && r.url).length;
      const missingUrls = results.filter(r => !r.url).length;
      
      return {
        collection,
        documentId,
        totalUrls,
        validUrls,
        invalidUrls,
        missingUrls,
        results
      };
    } catch (error) {
      console.error(`Error validating document ${collection}/${documentId}:`, error);
      
      return {
        collection,
        documentId,
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0,
        results: []
      };
    }
  }
  
  /**
   * Find all media fields in a document
   */
  private findMediaFields(data: any, prefix = ''): string[] {
    const fields: string[] = [];
    
    // Base case: null or undefined
    if (data === null || data === undefined) {
      return fields;
    }
    
    // Handle arrays
    if (Array.isArray(data)) {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // If it's an object, recurse
        if (item && typeof item === 'object' && !Array.isArray(item)) {
          fields.push(...this.findMediaFields(item, `${prefix}${prefix ? '.' : ''}${i}`));
        }
        
        // If it's an array item that has a url property, add it
        if (
          item && 
          typeof item === 'object' && 
          'url' in item && 
          typeof item.url === 'string'
        ) {
          fields.push(`${prefix}${prefix ? '.' : ''}${i}.url`);
        }
        
        // Check if the array item is a string that looks like a media URL
        if (typeof item === 'string' && this.looksLikeMediaUrl(item)) {
          fields.push(`${prefix}${prefix ? '.' : ''}${i}`);
        }
      }
      
      return fields;
    }
    
    // Handle objects
    if (typeof data === 'object') {
      for (const key in data) {
        const value = data[key];
        const fieldName = `${prefix}${prefix ? '.' : ''}${key}`;
        
        // If this is a URL field, add it
        if (
          key === 'url' && 
          typeof value === 'string' && 
          this.looksLikeMediaUrl(value) && 
          (prefix.includes('media') || prefix.includes('image') || prefix.includes('photo'))
        ) {
          fields.push(fieldName);
          continue;
        }
        
        // If this is the media array, check its items
        if (
          key === 'media' && 
          Array.isArray(value) && 
          value.length > 0
        ) {
          for (let i = 0; i < value.length; i++) {
            const mediaItem = value[i];
            
            if (
              mediaItem && 
              typeof mediaItem === 'object' && 
              'url' in mediaItem && 
              typeof mediaItem.url === 'string'
            ) {
              fields.push(`${fieldName}.${i}.url`);
            }
          }
          continue;
        }
        
        // If this is a string that looks like a media URL, add it
        if (typeof value === 'string' && this.looksLikeMediaUrl(value)) {
          // Only add if the field name suggests it's media
          if (
            fieldName.includes('image') || 
            fieldName.includes('photo') || 
            fieldName.includes('picture') || 
            fieldName.includes('avatar') || 
            fieldName.includes('thumbnail') || 
            fieldName.includes('cover') || 
            fieldName.includes('media') || 
            fieldName.includes('video') || 
            fieldName.includes('url')
          ) {
            fields.push(fieldName);
          }
          continue;
        }
        
        // Recurse for nested objects
        if (value && typeof value === 'object') {
          fields.push(...this.findMediaFields(value, fieldName));
        }
      }
    }
    
    return fields;
  }
  
  /**
   * Check if a string looks like a media URL
   */
  private looksLikeMediaUrl(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    // Data URLs
    if (str.startsWith('data:image/') || str.startsWith('data:video/')) {
      return true;
    }
    
    // Blob URLs
    if (str.startsWith('blob:')) {
      return true;
    }
    
    // Relative URLs to media
    if (str.startsWith('/') && this.hasMediaExtension(str)) {
      return true;
    }
    
    // URLs to common image/video services
    if (
      str.includes('cloudinary.com') || 
      str.includes('storage.googleapis.com') || 
      str.includes('firebasestorage.googleapis.com') || 
      str.includes('.firebasestorage.app') || 
      str.includes('amazonaws.com') || 
      str.includes('imgix.net')
    ) {
      return true;
    }
    
    // URLs with image/video extensions
    if (this.hasMediaExtension(str)) {
      return true;
    }
    
    // HTTP URLs
    if ((str.startsWith('http://') || str.startsWith('https://')) && !str.endsWith('/')) {
      // Skip URLs that are clearly not media
      if (
        str.includes('swagger') || 
        str.includes('api') || 
        str.includes('json') || 
        str.includes('xml') || 
        str.includes('graphql')
      ) {
        return false;
      }
      
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if a URL has a media file extension
   */
  private hasMediaExtension(url: string): boolean {
    const mediaExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.tiff', 
      '.mp4', '.mov', '.avi', '.webm', '.ogg', '.mkv', '.flv', '.m4v'
    ];
    
    return mediaExtensions.some(ext => url.toLowerCase().endsWith(ext));
  }
  
  /**
   * Validate all media URLs in a collection
   */
  async validateCollection(
    options: CollectionValidationOptions
  ): Promise<DocumentValidationResult[]> {
    const { 
      collection, 
      batchSize = this.config.batchSize,
      limit,
      skipValidation = false
    } = options;
    
    try {
      const results: DocumentValidationResult[] = [];
      let query: Query = this.firestore.collection(collection);
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        return results;
      }
      
      let batch: DocumentSnapshot[] = [];
      
      // Process in batches to avoid memory issues
      for (const doc of snapshot.docs) {
        batch.push(doc);
        
        if (batch.length >= batchSize) {
          await this.processBatch(batch, collection, skipValidation, results);
          batch = [];
        }
      }
      
      // Process any remaining documents
      if (batch.length > 0) {
        await this.processBatch(batch, collection, skipValidation, results);
      }
      
      return results;
    } catch (error) {
      console.error(`Error validating collection ${collection}:`, error);
      return [];
    }
  }
  
  /**
   * Process a batch of documents
   */
  private async processBatch(
    batch: DocumentSnapshot[],
    collection: string,
    skipValidation: boolean,
    results: DocumentValidationResult[]
  ): Promise<void> {
    for (const doc of batch) {
      try {
        const result = await this.validateDocument(collection, doc.id);
        results.push(result);
      } catch (error) {
        console.error(`Error validating document ${collection}/${doc.id}:`, error);
      }
    }
  }
  
  /**
   * Generate a validation report
   */
  async generateReport(
    results: DocumentValidationResult[],
    startTime: Date,
    endTime: Date
  ): Promise<ValidationReport> {
    try {
      // Calculate duration in milliseconds
      const duration = endTime.getTime() - startTime.getTime();
      
      // Count total documents, fields, valid/invalid URLs
      const totalDocuments = results.length;
      const totalFields = results.reduce((sum, result) => sum + result.totalUrls, 0);
      const validUrls = results.reduce((sum, result) => sum + result.validUrls, 0);
      const invalidUrls = results.reduce((sum, result) => sum + result.invalidUrls, 0);
      const missingUrls = results.reduce((sum, result) => sum + result.missingUrls, 0);
      
      // Group results by collection
      const collectionGroups = results.reduce<Record<string, DocumentValidationResult[]>>(
        (groups, result) => {
          if (!groups[result.collection]) {
            groups[result.collection] = [];
          }
          
          groups[result.collection].push(result);
          return groups;
        }, 
        {}
      );
      
      // Generate collection summaries
      const collectionSummaries: CollectionValidationSummary[] = Object.entries(collectionGroups)
        .map(([collection, docs]) => {
          const totalUrls = docs.reduce((sum, doc) => sum + doc.totalUrls, 0);
          const validUrlsCount = docs.reduce((sum, doc) => sum + doc.validUrls, 0);
          const invalidUrlsCount = docs.reduce((sum, doc) => sum + doc.invalidUrls, 0);
          const missingUrlsCount = docs.reduce((sum, doc) => sum + doc.missingUrls, 0);
          
          return {
            collection,
            totalUrls,
            validUrls: validUrlsCount,
            invalidUrls: invalidUrlsCount,
            missingUrls: missingUrlsCount,
            validPercent: totalUrls > 0 ? (validUrlsCount / totalUrls) * 100 : 0,
            invalidPercent: totalUrls > 0 ? (invalidUrlsCount / totalUrls) * 100 : 0,
            missingPercent: totalUrls > 0 ? (missingUrlsCount / totalUrls) * 100 : 0
          };
        });
      
      // Extract all invalid URL results
      const invalidResults: DocumentUrlValidationResult[] = results
        .flatMap(result => result.results.filter(r => !r.isValid && r.url));
      
      // Generate the report
      const report: ValidationReport = {
        id: uuidv4(),
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
      
      return report;
    } catch (error) {
      console.error('Error generating validation report:', error);
      
      // Return a minimal report
      return {
        id: uuidv4(),
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        totalDocuments: results.length,
        totalFields: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: []
      };
    }
  }
  
  /**
   * Save a validation report to Firestore
   */
  async saveReport(report: ValidationReport): Promise<string> {
    try {
      const docRef = this.reportsCollection.doc(report.id);
      await docRef.set({
        ...report,
        startTime: new Date(report.startTime),
        endTime: new Date(report.endTime)
      });
      
      return report.id;
    } catch (error) {
      console.error('Error saving validation report:', error);
      throw error;
    }
  }
  
  /**
   * Get a validation report by ID from Firestore
   */
  async getReportById(id: string): Promise<ValidationReport | null> {
    try {
      const docRef = this.reportsCollection.doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      
      return {
        ...data,
        id: doc.id,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate()
      } as ValidationReport;
    } catch (error) {
      console.error(`Error getting validation report ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get all validation reports from Firestore
   */
  async getAllReports(): Promise<ValidationReport[]> {
    try {
      const snapshot = await this.reportsCollection
        .orderBy('startTime', 'desc')
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          ...data,
          id: doc.id,
          startTime: data.startTime.toDate(),
          endTime: data.endTime.toDate()
        } as ValidationReport;
      });
    } catch (error) {
      console.error('Error getting validation reports:', error);
      return [];
    }
  }
  
  /**
   * Repair a broken URL in a document
   */
  async repairUrl(options: UrlRepairOptions): Promise<UrlRepairResult> {
    try {
      const { collection, documentId, field, oldUrl, newUrl } = options;
      const docRef = this.firestore.collection(collection).doc(documentId);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return {
          success: false,
          field,
          collection,
          documentId,
          oldUrl,
          newUrl,
          error: 'Document does not exist'
        };
      }
      
      // Handle nested fields like 'media.0.url'
      if (field.includes('.')) {
        const data = doc.data();
        const parts = field.split('.');
        let current: any = data;
        let parent: any = null;
        let lastPart: string | number = '';
        
        // Navigate to the parent of the field we want to update
        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          
          if (current === undefined || current === null) {
            return {
              success: false,
              field,
              collection,
              documentId,
              oldUrl,
              newUrl,
              error: `Field ${parts.slice(0, i + 1).join('.')} does not exist`
            };
          }
          
          parent = current;
          
          // Handle array indices
          if (!isNaN(Number(part)) && Array.isArray(current)) {
            lastPart = Number(part);
            current = current[Number(part)];
          } else {
            lastPart = part;
            current = current[part];
          }
        }
        
        // Get the last part (the actual field to update)
        const lastFieldPart = parts[parts.length - 1];
        
        // Handle array index as last part
        if (!isNaN(Number(lastFieldPart)) && Array.isArray(current)) {
          if (current[Number(lastFieldPart)] !== oldUrl) {
            return {
              success: false,
              field,
              collection,
              documentId,
              oldUrl,
              newUrl,
              error: 'URL does not match expected value'
            };
          }
          
          current[Number(lastFieldPart)] = newUrl;
        } else {
          if (current[lastFieldPart] !== oldUrl) {
            return {
              success: false,
              field,
              collection,
              documentId,
              oldUrl,
              newUrl,
              error: 'URL does not match expected value'
            };
          }
          
          current[lastFieldPart] = newUrl;
        }
        
        // Update the field in Firestore
        const updateData: any = {};
        
        if (typeof lastPart === 'number' && Array.isArray(parent)) {
          // Need to update the entire array for array items
          const arrayField = parts.slice(0, parts.length - 2).join('.');
          updateData[arrayField || 'media'] = parent;
        } else {
          // Can update the field directly
          updateData[field] = newUrl;
        }
        
        await docRef.update(updateData);
      } else {
        // Simple field update
        const data = doc.data();
        
        if (data[field] !== oldUrl) {
          return {
            success: false,
            field,
            collection,
            documentId,
            oldUrl,
            newUrl,
            error: 'URL does not match expected value'
          };
        }
        
        await docRef.update({
          [field]: newUrl
        });
      }
      
      return {
        success: true,
        field,
        collection,
        documentId,
        oldUrl,
        newUrl
      };
    } catch (error) {
      return {
        success: false,
        field: options.field,
        collection: options.collection,
        documentId: options.documentId,
        oldUrl: options.oldUrl,
        newUrl: options.newUrl,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }
  
  /**
   * Repair multiple broken URLs
   */
  async repairUrls(options: UrlRepairOptions[]): Promise<UrlRepairResult[]> {
    const results: UrlRepairResult[] = [];
    
    // Group by collection and document ID to minimize Firestore operations
    const grouped = options.reduce<Record<string, Record<string, UrlRepairOptions[]>>>(
      (acc, option) => {
        if (!acc[option.collection]) {
          acc[option.collection] = {};
        }
        
        if (!acc[option.collection][option.documentId]) {
          acc[option.collection][option.documentId] = [];
        }
        
        acc[option.collection][option.documentId].push(option);
        return acc;
      }, 
      {}
    );
    
    // Process each collection
    for (const collection of Object.keys(grouped)) {
      // Process each document in the collection
      for (const documentId of Object.keys(grouped[collection])) {
        const options = grouped[collection][documentId];
        
        try {
          // Get the document
          const docRef = this.firestore.collection(collection).doc(documentId);
          const doc = await docRef.get();
          
          if (!doc.exists) {
            // Document doesn't exist, mark all repairs as failed
            options.forEach(option => {
              results.push({
                success: false,
                field: option.field,
                collection,
                documentId,
                oldUrl: option.oldUrl,
                newUrl: option.newUrl,
                error: 'Document does not exist'
              });
            });
            continue;
          }
          
          // Apply all updates to this document in a single batch
          const data = doc.data();
          const updates: Record<string, any> = {};
          const updateResults: UrlRepairResult[] = [];
          
          for (const option of options) {
            try {
              // Handle nested fields
              if (option.field.includes('.')) {
                const result = await this.repairUrl(option);
                updateResults.push(result);
              } else {
                // Simple field update
                if (data[option.field] === option.oldUrl) {
                  updates[option.field] = option.newUrl;
                  updateResults.push({
                    success: true,
                    field: option.field,
                    collection,
                    documentId,
                    oldUrl: option.oldUrl,
                    newUrl: option.newUrl
                  });
                } else {
                  updateResults.push({
                    success: false,
                    field: option.field,
                    collection,
                    documentId,
                    oldUrl: option.oldUrl,
                    newUrl: option.newUrl,
                    error: 'URL does not match expected value'
                  });
                }
              }
            } catch (error) {
              updateResults.push({
                success: false,
                field: option.field,
                collection,
                documentId,
                oldUrl: option.oldUrl,
                newUrl: option.newUrl,
                error: error instanceof Error ? error.message : String(error)
              });
            }
          }
          
          // Apply the updates if there are any
          if (Object.keys(updates).length > 0) {
            await docRef.update(updates);
          }
          
          // Add the results
          results.push(...updateResults);
        } catch (error) {
          // Error processing this document, mark all repairs as failed
          options.forEach(option => {
            results.push({
              success: false,
              field: option.field,
              collection,
              documentId,
              oldUrl: option.oldUrl,
              newUrl: option.newUrl,
              error: error instanceof Error ? error.message : String(error)
            });
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Save a repair report to Firestore
   */
  async saveRepairReport(report: RepairReport): Promise<string> {
    try {
      const id = report.id || uuidv4();
      const docRef = this.repairReportsCollection.doc(id);
      
      await docRef.set({
        ...report,
        id,
        timestamp: new Date(report.timestamp)
      });
      
      return id;
    } catch (error) {
      console.error('Error saving repair report:', error);
      throw error;
    }
  }
  
  /**
   * Get a repair report by ID from Firestore
   */
  async getRepairReportById(id: string): Promise<RepairReport | null> {
    try {
      const docRef = this.repairReportsCollection.doc(id);
      const doc = await docRef.get();
      
      if (!doc.exists) {
        return null;
      }
      
      const data = doc.data();
      
      return {
        ...data,
        id: doc.id,
        timestamp: data.timestamp.toDate()
      } as RepairReport;
    } catch (error) {
      console.error(`Error getting repair report ${id}:`, error);
      return null;
    }
  }
  
  /**
   * Get all repair reports from Firestore
   */
  async getAllRepairReports(): Promise<RepairReport[]> {
    try {
      const snapshot = await this.repairReportsCollection
        .orderBy('timestamp', 'desc')
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      return snapshot.docs.map(doc => {
        const data = doc.data();
        
        return {
          ...data,
          id: doc.id,
          timestamp: data.timestamp.toDate()
        } as RepairReport;
      });
    } catch (error) {
      console.error('Error getting repair reports:', error);
      return [];
    }
  }
  
  /**
   * Find all relative URLs in the database
   */
  async findRelativeUrls(): Promise<DocumentUrlValidationResult[]> {
    const results: DocumentUrlValidationResult[] = [];
    
    // Get all collections to scan
    const collections = await this.firestore.listCollections();
    
    for (const collection of collections) {
      try {
        const snapshot = await collection.get();
        
        for (const doc of snapshot.docs) {
          try {
            const data = doc.data();
            const mediaFields = this.findMediaFields(data);
            
            for (const field of mediaFields) {
              // Get the field value
              let value = '';
              
              if (field.includes('.')) {
                const parts = field.split('.');
                let current: any = data;
                
                for (const part of parts) {
                  if (current === undefined || current === null) {
                    break;
                  }
                  
                  if (!isNaN(Number(part)) && Array.isArray(current)) {
                    current = current[Number(part)];
                  } else {
                    current = current[part];
                  }
                }
                
                value = current;
              } else {
                value = data[field];
              }
              
              // Check if it's a relative URL
              if (
                typeof value === 'string' && 
                value && 
                this.mediaValidationService.isRelativeUrl(value)
              ) {
                results.push({
                  url: value,
                  collection: collection.id,
                  documentId: doc.id,
                  field,
                  isValid: false,
                  mediaType: 'unknown',
                  error: 'Relative URL'
                });
              }
            }
          } catch (error) {
            console.error(`Error scanning document ${collection.id}/${doc.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scanning collection ${collection.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Find all blob URLs in the database
   */
  async findBlobUrls(): Promise<DocumentUrlValidationResult[]> {
    const results: DocumentUrlValidationResult[] = [];
    
    // Get all collections to scan
    const collections = await this.firestore.listCollections();
    
    for (const collection of collections) {
      try {
        const snapshot = await collection.get();
        
        for (const doc of snapshot.docs) {
          try {
            const data = doc.data();
            const mediaFields = this.findMediaFields(data);
            
            for (const field of mediaFields) {
              // Get the field value
              let value = '';
              
              if (field.includes('.')) {
                const parts = field.split('.');
                let current: any = data;
                
                for (const part of parts) {
                  if (current === undefined || current === null) {
                    break;
                  }
                  
                  if (!isNaN(Number(part)) && Array.isArray(current)) {
                    current = current[Number(part)];
                  } else {
                    current = current[part];
                  }
                }
                
                value = current;
              } else {
                value = data[field];
              }
              
              // Check if it's a blob URL
              if (
                typeof value === 'string' && 
                value && 
                this.mediaValidationService.isBlobUrl(value)
              ) {
                results.push({
                  url: value,
                  collection: collection.id,
                  documentId: doc.id,
                  field,
                  isValid: false,
                  mediaType: 'unknown',
                  error: 'Blob URL'
                });
              }
            }
          } catch (error) {
            console.error(`Error scanning document ${collection.id}/${doc.id}:`, error);
          }
        }
      } catch (error) {
        console.error(`Error scanning collection ${collection.id}:`, error);
      }
    }
    
    return results;
  }
  
  /**
   * Fix relative URLs by adding base URL
   */
  async fixRelativeUrls(baseUrl: string): Promise<UrlRepairResult[]> {
    try {
      // Find all relative URLs
      const relativeUrls = await this.findRelativeUrls();
      
      if (relativeUrls.length === 0) {
        return [];
      }
      
      // Prepare the repair options
      const repairOptions: UrlRepairOptions[] = relativeUrls.map(result => {
        const normalizedUrl = this.mediaValidationService.normalizeUrl(
          result.url, 
          baseUrl
        );
        
        return {
          field: result.field,
          collection: result.collection,
          documentId: result.documentId,
          oldUrl: result.url,
          newUrl: normalizedUrl
        };
      });
      
      // Repair the URLs
      return await this.repairUrls(repairOptions);
    } catch (error) {
      console.error('Error fixing relative URLs:', error);
      return [];
    }
  }
  
  /**
   * Resolve blob URLs by replacing with placeholder
   */
  async resolveBlobUrls(placeholderUrl: string): Promise<UrlRepairResult[]> {
    try {
      // Find all blob URLs
      const blobUrls = await this.findBlobUrls();
      
      if (blobUrls.length === 0) {
        return [];
      }
      
      // Prepare the repair options
      const repairOptions: UrlRepairOptions[] = blobUrls.map(result => {
        return {
          field: result.field,
          collection: result.collection,
          documentId: result.documentId,
          oldUrl: result.url,
          newUrl: placeholderUrl
        };
      });
      
      // Repair the URLs
      return await this.repairUrls(repairOptions);
    } catch (error) {
      console.error('Error resolving blob URLs:', error);
      return [];
    }
  }
  
  /**
   * Map a media entity to Firestore format
   */
  private mapMediaToFirestore(media: Media): any {
    return {
      id: media.id,
      url: media.url,
      type: media.type,
      name: media.name,
      description: media.description,
      size: media.size,
      width: media.width,
      height: media.height,
      duration: media.duration,
      mimeType: media.mimeType,
      source: media.source,
      provider: media.provider,
      status: media.status,
      ownerId: media.ownerId,
      createdAt: media.createdAt,
      updatedAt: media.updatedAt,
      validatedAt: media.validatedAt,
      isValid: media.isValid,
      tags: media.tags,
      metadata: media.metadata
    };
  }
  
  /**
   * Map Firestore data to a media entity
   */
  private mapFirestoreToMedia(doc: DocumentSnapshot): Media {
    const data = doc.data();
    
    return new Media({
      id: doc.id,
      url: data.url,
      type: data.type,
      name: data.name,
      description: data.description,
      size: data.size,
      width: data.width,
      height: data.height,
      duration: data.duration,
      mimeType: data.mimeType,
      source: data.source,
      provider: data.provider,
      status: data.status,
      ownerId: data.ownerId,
      createdAt: data.createdAt?.toDate(),
      updatedAt: data.updatedAt?.toDate(),
      validatedAt: data.validatedAt?.toDate(),
      isValid: data.isValid,
      tags: data.tags,
      metadata: data.metadata
    });
  }
}