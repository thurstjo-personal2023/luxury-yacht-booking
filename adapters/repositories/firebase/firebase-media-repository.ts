/**
 * Firebase Media Repository Implementation
 * 
 * This class implements the IMediaRepository interface using Firebase Firestore.
 */

import { Firestore, DocumentReference, WriteBatch, Timestamp } from 'firebase/firestore';
import { collection, doc, getDoc, getDocs, setDoc, addDoc, query, where, limit, orderBy, startAfter } from 'firebase/firestore';
import axios from 'axios';

import { Media, MediaType } from '../../../core/domain/media/media';
import { MediaValidationService, MediaValidationResult } from '../../../core/domain/media/media-validation-service';
import { DocumentFieldPath, IMediaRepository, MediaRepairReport, MediaValidationReport } from '../interfaces/media-repository';

/**
 * Collection names in Firestore
 */
const COLLECTIONS = {
  MEDIA: 'media',
  VALIDATION_REPORTS: 'media_validation_reports',
  REPAIR_REPORTS: 'media_repair_reports'
};

/**
 * Fields that may contain media URLs in Firestore documents
 */
const MEDIA_URL_FIELDS = [
  'media', 'imageUrl', 'coverImage', 'profileImage', 'profilePhoto', 'photoUrl', 
  'thumbnailUrl', 'bannerUrl', 'iconUrl', 'videoUrl', 'url', 'images', 
  'videos', 'gallery', 'photos', 'mediaUrls', 'attachments'
];

/**
 * Collections to scan for media URLs
 */
const COLLECTIONS_TO_SCAN = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'user_profiles_service_provider',
  'user_profiles_tourist',
  'articles_and_guides',
  'event_announcements',
  'products_add_ons',
  'promotions_and_offers'
];

/**
 * Firebase implementation of the Media Repository
 */
export class FirebaseMediaRepository implements IMediaRepository {
  private db: Firestore;
  private batchSize: number = 500; // Maximum batch size for Firestore operations
  
  constructor(db: Firestore) {
    this.db = db;
  }
  
  /**
   * Save a media entry
   */
  async saveMedia(media: Media): Promise<Media> {
    const mediaRef = doc(this.db, COLLECTIONS.MEDIA, encodeURIComponent(media.url));
    
    await setDoc(mediaRef, {
      url: media.url,
      type: media.type,
      title: media.title || null,
      description: media.description || null,
      sortOrder: media.sortOrder || 0,
      isPrimary: media.isPrimary || false,
      uploadedAt: Timestamp.fromDate(media.uploadedAt),
      lastValidatedAt: media.lastValidatedAt ? Timestamp.fromDate(media.lastValidatedAt) : null,
      isValid: media.isValid ?? null
    });
    
    return media;
  }
  
  /**
   * Find media by URL
   */
  async findByUrl(url: string): Promise<Media | null> {
    const mediaRef = doc(this.db, COLLECTIONS.MEDIA, encodeURIComponent(url));
    const mediaDoc = await getDoc(mediaRef);
    
    if (!mediaDoc.exists()) {
      return null;
    }
    
    const data = mediaDoc.data();
    
    return new Media({
      url: data.url,
      type: data.type as MediaType,
      title: data.title || undefined,
      description: data.description || undefined,
      sortOrder: data.sortOrder || 0,
      isPrimary: data.isPrimary || false,
      uploadedAt: data.uploadedAt?.toDate() || new Date(),
      lastValidatedAt: data.lastValidatedAt?.toDate() || undefined,
      isValid: data.isValid
    });
  }
  
  /**
   * Delete media by URL
   */
  async deleteByUrl(url: string): Promise<boolean> {
    const mediaRef = doc(this.db, COLLECTIONS.MEDIA, encodeURIComponent(url));
    const mediaDoc = await getDoc(mediaRef);
    
    if (!mediaDoc.exists()) {
      return false;
    }
    
    await setDoc(mediaRef, { deleted: true, deletedAt: Timestamp.now() }, { merge: true });
    return true;
  }
  
  /**
   * Get all media URLs from all database collections
   */
  async getAllMediaUrls(): Promise<{ 
    documentPaths: DocumentFieldPath[]; 
    totalDocuments: number; 
    totalFields: number; 
  }> {
    const documentPaths: DocumentFieldPath[] = [];
    let totalDocuments = 0;
    let totalFields = 0;
    
    // Scan each collection for media fields
    for (const collectionName of COLLECTIONS_TO_SCAN) {
      const collectionRef = collection(this.db, collectionName);
      const querySnapshot = await getDocs(collectionRef);
      
      totalDocuments += querySnapshot.size;
      
      for (const docSnapshot of querySnapshot.docs) {
        const docData = docSnapshot.data();
        
        // Find all media URL fields in the document
        const mediaFields = this.findMediaUrlFields(docData);
        totalFields += mediaFields.length;
        
        // Add each field to the result
        for (const fieldPath of mediaFields) {
          documentPaths.push({
            collection: collectionName,
            documentId: docSnapshot.id,
            fieldPath
          });
        }
      }
    }
    
    return { documentPaths, totalDocuments, totalFields };
  }
  
  /**
   * Validate a single media URL
   */
  async validateMediaUrl(url: string, expectedType?: string): Promise<MediaValidationResult> {
    // First, perform basic validation without network request
    const type = expectedType as MediaType || MediaType.IMAGE;
    const basicResult = MediaValidationService.validateMediaBasic({
      url,
      type
    } as unknown as Media);
    
    if (!basicResult.isValid) {
      return basicResult;
    }
    
    // If basic validation passes, perform network request to validate URL accessibility
    try {
      // Use axios to check if the URL is accessible
      const response = await axios.head(url, { 
        timeout: 5000,
        validateStatus: status => status < 400 // Consider all non-error status codes as valid
      });
      
      // Check content type if available
      const contentType = response.headers['content-type'];
      let isValid = true;
      let error = '';
      
      // Verify content type matches expected media type
      if (contentType) {
        if (type === MediaType.IMAGE && !contentType.startsWith('image/')) {
          isValid = false;
          error = `Expected image, got ${contentType}`;
        } else if (type === MediaType.VIDEO && !contentType.startsWith('video/')) {
          isValid = false;
          error = `Expected video, got ${contentType}`;
        }
      }
      
      return {
        isValid,
        url,
        type,
        status: response.status,
        statusText: response.statusText,
        error: error || undefined,
        expectedType: type,
        actualType: contentType
      };
    } catch (error) {
      // URL is not accessible
      return {
        isValid: false,
        url,
        type,
        error: error.message || 'Failed to access URL',
        expectedType: type
      };
    }
  }
  
  /**
   * Save a validation report
   */
  async saveValidationReport(report: Omit<MediaValidationReport, 'id'>): Promise<MediaValidationReport> {
    const reportRef = await addDoc(collection(this.db, COLLECTIONS.VALIDATION_REPORTS), {
      startTime: Timestamp.fromDate(report.startTime),
      endTime: Timestamp.fromDate(report.endTime),
      duration: report.duration,
      totalDocuments: report.totalDocuments,
      totalFields: report.totalFields,
      validUrls: report.validUrls,
      invalidUrls: report.invalidUrls,
      missingUrls: report.missingUrls,
      collectionSummaries: report.collectionSummaries,
      invalidResults: report.invalidResults,
      createdAt: Timestamp.now()
    });
    
    return {
      id: reportRef.id,
      ...report
    };
  }
  
  /**
   * Get the most recent validation report
   */
  async getLatestValidationReport(): Promise<MediaValidationReport | null> {
    const reportsRef = collection(this.db, COLLECTIONS.VALIDATION_REPORTS);
    const q = query(reportsRef, orderBy('createdAt', 'desc'), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
      return null;
    }
    
    const reportDoc = querySnapshot.docs[0];
    const reportData = reportDoc.data();
    
    return this.convertToValidationReport(reportDoc.id, reportData);
  }
  
  /**
   * Get a validation report by ID
   */
  async getValidationReportById(reportId: string): Promise<MediaValidationReport | null> {
    const reportRef = doc(this.db, COLLECTIONS.VALIDATION_REPORTS, reportId);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return null;
    }
    
    return this.convertToValidationReport(reportDoc.id, reportDoc.data());
  }
  
  /**
   * List validation reports with pagination
   */
  async listValidationReports(limit: number, offset: number): Promise<{
    reports: MediaValidationReport[];
    total: number;
  }> {
    const reportsRef = collection(this.db, COLLECTIONS.VALIDATION_REPORTS);
    
    // Get total count
    const totalSnapshot = await getDocs(reportsRef);
    const total = totalSnapshot.size;
    
    // Query with pagination
    let q = query(reportsRef, orderBy('createdAt', 'desc'), limit);
    
    // If offset is provided, use startAfter for pagination
    if (offset > 0) {
      // Get the document at the offset position
      const offsetQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(1), startAfter(offset));
      const offsetSnapshot = await getDocs(offsetQuery);
      
      if (!offsetSnapshot.empty) {
        q = query(reportsRef, orderBy('createdAt', 'desc'), limit, startAfter(offsetSnapshot.docs[0]));
      }
    }
    
    const querySnapshot = await getDocs(q);
    
    const reports = querySnapshot.docs.map(doc => 
      this.convertToValidationReport(doc.id, doc.data())
    );
    
    return { reports, total };
  }
  
  /**
   * Repair invalid media URLs
   */
  async repairMediaUrls(invalidUrls: DocumentFieldPath[], placeholderUrl: string): Promise<MediaRepairReport> {
    const startTime = new Date();
    const repairs: {
      collection: string;
      documentId: string;
      field: string;
      oldUrl: string;
      newUrl: string;
      success: boolean;
      error?: string;
    }[] = [];
    
    const collectionSummaries: Record<string, {
      collection: string;
      repairedUrls: number;
      failedRepairs: number;
    }> = {};
    
    // Process in batches to avoid Firestore limits
    for (let i = 0; i < invalidUrls.length; i += this.batchSize) {
      const batch = invalidUrls.slice(i, i + this.batchSize);
      const batchResults = await this.repairBatch(batch, placeholderUrl);
      
      repairs.push(...batchResults);
      
      // Update collection summaries
      for (const repair of batchResults) {
        if (!collectionSummaries[repair.collection]) {
          collectionSummaries[repair.collection] = {
            collection: repair.collection,
            repairedUrls: 0,
            failedRepairs: 0
          };
        }
        
        if (repair.success) {
          collectionSummaries[repair.collection].repairedUrls++;
        } else {
          collectionSummaries[repair.collection].failedRepairs++;
        }
      }
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const totalRepairedUrls = repairs.filter(r => r.success).length;
    const failedRepairs = repairs.filter(r => !r.success).length;
    
    // Save repair report
    const reportData = {
      startTime,
      endTime,
      duration,
      totalRepairedUrls,
      failedRepairs,
      collectionSummaries: Object.values(collectionSummaries),
      repairs,
      createdAt: new Date()
    };
    
    const reportRef = await addDoc(collection(this.db, COLLECTIONS.REPAIR_REPORTS), {
      ...reportData,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      createdAt: Timestamp.now()
    });
    
    return {
      id: reportRef.id,
      ...reportData
    };
  }
  
  /**
   * Get repair report by ID
   */
  async getRepairReportById(reportId: string): Promise<MediaRepairReport | null> {
    const reportRef = doc(this.db, COLLECTIONS.REPAIR_REPORTS, reportId);
    const reportDoc = await getDoc(reportRef);
    
    if (!reportDoc.exists()) {
      return null;
    }
    
    const data = reportDoc.data();
    
    return {
      id: reportDoc.id,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
      duration: data.duration,
      totalRepairedUrls: data.totalRepairedUrls,
      failedRepairs: data.failedRepairs,
      collectionSummaries: data.collectionSummaries,
      repairs: data.repairs
    };
  }
  
  /**
   * List repair reports with pagination
   */
  async listRepairReports(limit: number, offset: number): Promise<{
    reports: MediaRepairReport[];
    total: number;
  }> {
    const reportsRef = collection(this.db, COLLECTIONS.REPAIR_REPORTS);
    
    // Get total count
    const totalSnapshot = await getDocs(reportsRef);
    const total = totalSnapshot.size;
    
    // Query with pagination
    let q = query(reportsRef, orderBy('createdAt', 'desc'), limit);
    
    // If offset is provided, use startAfter for pagination
    if (offset > 0) {
      // Get the document at the offset position
      const offsetQuery = query(reportsRef, orderBy('createdAt', 'desc'), limit(1), startAfter(offset));
      const offsetSnapshot = await getDocs(offsetQuery);
      
      if (!offsetSnapshot.empty) {
        q = query(reportsRef, orderBy('createdAt', 'desc'), limit, startAfter(offsetSnapshot.docs[0]));
      }
    }
    
    const querySnapshot = await getDocs(q);
    
    const reports = querySnapshot.docs.map(doc => {
      const data = doc.data();
      
      return {
        id: doc.id,
        startTime: data.startTime.toDate(),
        endTime: data.endTime.toDate(),
        duration: data.duration,
        totalRepairedUrls: data.totalRepairedUrls,
        failedRepairs: data.failedRepairs,
        collectionSummaries: data.collectionSummaries,
        repairs: data.repairs
      };
    });
    
    return { reports, total };
  }
  
  /**
   * Resolve blob URLs to permanent storage URLs
   */
  async resolveBlobUrls(blobUrls: DocumentFieldPath[]): Promise<MediaRepairReport> {
    // For blob URLs, we simply replace them with a placeholder since
    // blobs can't be accessed outside the browser context in which they were created
    const placeholderUrl = '/blob-placeholder.jpg';
    return this.repairMediaUrls(blobUrls, placeholderUrl);
  }
  
  /**
   * Fix relative URLs by converting them to absolute URLs
   */
  async fixRelativeUrls(relativeUrls: DocumentFieldPath[], baseUrl: string): Promise<MediaRepairReport> {
    const startTime = new Date();
    const repairs: {
      collection: string;
      documentId: string;
      field: string;
      oldUrl: string;
      newUrl: string;
      success: boolean;
      error?: string;
    }[] = [];
    
    const collectionSummaries: Record<string, {
      collection: string;
      repairedUrls: number;
      failedRepairs: number;
    }> = {};
    
    // Process in batches to avoid Firestore limits
    for (let i = 0; i < relativeUrls.length; i += this.batchSize) {
      const batch = relativeUrls.slice(i, i + this.batchSize);
      const batchResults = await this.fixRelativeUrlBatch(batch, baseUrl);
      
      repairs.push(...batchResults);
      
      // Update collection summaries
      for (const repair of batchResults) {
        if (!collectionSummaries[repair.collection]) {
          collectionSummaries[repair.collection] = {
            collection: repair.collection,
            repairedUrls: 0,
            failedRepairs: 0
          };
        }
        
        if (repair.success) {
          collectionSummaries[repair.collection].repairedUrls++;
        } else {
          collectionSummaries[repair.collection].failedRepairs++;
        }
      }
    }
    
    const endTime = new Date();
    const duration = endTime.getTime() - startTime.getTime();
    
    const totalRepairedUrls = repairs.filter(r => r.success).length;
    const failedRepairs = repairs.filter(r => !r.success).length;
    
    // Save repair report
    const reportData = {
      startTime,
      endTime,
      duration,
      totalRepairedUrls,
      failedRepairs,
      collectionSummaries: Object.values(collectionSummaries),
      repairs,
      createdAt: new Date()
    };
    
    const reportRef = await addDoc(collection(this.db, COLLECTIONS.REPAIR_REPORTS), {
      ...reportData,
      startTime: Timestamp.fromDate(startTime),
      endTime: Timestamp.fromDate(endTime),
      createdAt: Timestamp.now()
    });
    
    return {
      id: reportRef.id,
      ...reportData
    };
  }
  
  /**
   * Repair a batch of URLs
   */
  private async repairBatch(
    urlPaths: DocumentFieldPath[], 
    replacementUrl: string
  ): Promise<{
    collection: string;
    documentId: string;
    field: string;
    oldUrl: string;
    newUrl: string;
    success: boolean;
    error?: string;
  }[]> {
    const results: {
      collection: string;
      documentId: string;
      field: string;
      oldUrl: string;
      newUrl: string;
      success: boolean;
      error?: string;
    }[] = [];
    
    // Group by collection for batch operations
    const collectionGroups = this.groupByCollection(urlPaths);
    
    for (const [collectionName, paths] of Object.entries(collectionGroups)) {
      // Create a batch write
      const batch = this.db.batch();
      const updates: {
        docRef: DocumentReference;
        fieldPath: string;
        oldUrl: string;
        newUrl: string;
      }[] = [];
      
      // Prepare updates
      for (const path of paths) {
        try {
          const docRef = doc(this.db, collectionName, path.documentId);
          const docSnapshot = await getDoc(docRef);
          
          if (!docSnapshot.exists()) {
            results.push({
              collection: collectionName,
              documentId: path.documentId,
              field: path.fieldPath,
              oldUrl: 'unknown',
              newUrl: replacementUrl,
              success: false,
              error: 'Document not found'
            });
            continue;
          }
          
          const docData = docSnapshot.data();
          const fieldParts = path.fieldPath.split('.');
          
          // Extract current URL value
          let currentValue = docData;
          for (let i = 0; i < fieldParts.length; i++) {
            if (currentValue === undefined || currentValue === null) {
              break;
            }
            currentValue = currentValue[fieldParts[i]];
          }
          
          if (typeof currentValue !== 'string') {
            results.push({
              collection: collectionName,
              documentId: path.documentId,
              field: path.fieldPath,
              oldUrl: String(currentValue),
              newUrl: replacementUrl,
              success: false,
              error: 'Field is not a string'
            });
            continue;
          }
          
          // Prepare the update
          updates.push({
            docRef,
            fieldPath: path.fieldPath,
            oldUrl: currentValue,
            newUrl: replacementUrl
          });
        } catch (error) {
          results.push({
            collection: collectionName,
            documentId: path.documentId,
            field: path.fieldPath,
            oldUrl: 'unknown',
            newUrl: replacementUrl,
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      // Apply updates to the batch
      for (const update of updates) {
        // Create the update object with the nested field path
        const updateData = this.createNestedUpdate(update.fieldPath, update.newUrl);
        batch.update(update.docRef, updateData);
      }
      
      try {
        // Commit the batch
        await batch.commit();
        
        // Record successful updates
        for (const update of updates) {
          results.push({
            collection: collectionName,
            documentId: update.docRef.id,
            field: update.fieldPath,
            oldUrl: update.oldUrl,
            newUrl: update.newUrl,
            success: true
          });
        }
      } catch (error) {
        // Record batch failure
        for (const update of updates) {
          results.push({
            collection: collectionName,
            documentId: update.docRef.id,
            field: update.fieldPath,
            oldUrl: update.oldUrl,
            newUrl: update.newUrl,
            success: false,
            error: error.message || 'Batch update failed'
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Fix a batch of relative URLs
   */
  private async fixRelativeUrlBatch(
    urlPaths: DocumentFieldPath[], 
    baseUrl: string
  ): Promise<{
    collection: string;
    documentId: string;
    field: string;
    oldUrl: string;
    newUrl: string;
    success: boolean;
    error?: string;
  }[]> {
    const results: {
      collection: string;
      documentId: string;
      field: string;
      oldUrl: string;
      newUrl: string;
      success: boolean;
      error?: string;
    }[] = [];
    
    // Group by collection for batch operations
    const collectionGroups = this.groupByCollection(urlPaths);
    
    for (const [collectionName, paths] of Object.entries(collectionGroups)) {
      // Create a batch write
      const batch = this.db.batch();
      const updates: {
        docRef: DocumentReference;
        fieldPath: string;
        oldUrl: string;
        newUrl: string;
      }[] = [];
      
      // Prepare updates
      for (const path of paths) {
        try {
          const docRef = doc(this.db, collectionName, path.documentId);
          const docSnapshot = await getDoc(docRef);
          
          if (!docSnapshot.exists()) {
            results.push({
              collection: collectionName,
              documentId: path.documentId,
              field: path.fieldPath,
              oldUrl: 'unknown',
              newUrl: '',
              success: false,
              error: 'Document not found'
            });
            continue;
          }
          
          const docData = docSnapshot.data();
          const fieldParts = path.fieldPath.split('.');
          
          // Extract current URL value
          let currentValue = docData;
          for (let i = 0; i < fieldParts.length; i++) {
            if (currentValue === undefined || currentValue === null) {
              break;
            }
            currentValue = currentValue[fieldParts[i]];
          }
          
          if (typeof currentValue !== 'string') {
            results.push({
              collection: collectionName,
              documentId: path.documentId,
              field: path.fieldPath,
              oldUrl: String(currentValue),
              newUrl: '',
              success: false,
              error: 'Field is not a string'
            });
            continue;
          }
          
          // Ensure URL is relative
          if (!currentValue.startsWith('/') || currentValue.startsWith('//')) {
            results.push({
              collection: collectionName,
              documentId: path.documentId,
              field: path.fieldPath,
              oldUrl: currentValue,
              newUrl: currentValue,
              success: false,
              error: 'Not a relative URL'
            });
            continue;
          }
          
          // Convert to absolute URL
          const absoluteUrl = `${baseUrl}${currentValue.startsWith('/') ? currentValue : `/${currentValue}`}`;
          
          // Prepare the update
          updates.push({
            docRef,
            fieldPath: path.fieldPath,
            oldUrl: currentValue,
            newUrl: absoluteUrl
          });
        } catch (error) {
          results.push({
            collection: collectionName,
            documentId: path.documentId,
            field: path.fieldPath,
            oldUrl: 'unknown',
            newUrl: '',
            success: false,
            error: error.message || 'Unknown error'
          });
        }
      }
      
      // Apply updates to the batch
      for (const update of updates) {
        // Create the update object with the nested field path
        const updateData = this.createNestedUpdate(update.fieldPath, update.newUrl);
        batch.update(update.docRef, updateData);
      }
      
      try {
        // Commit the batch
        await batch.commit();
        
        // Record successful updates
        for (const update of updates) {
          results.push({
            collection: collectionName,
            documentId: update.docRef.id,
            field: update.fieldPath,
            oldUrl: update.oldUrl,
            newUrl: update.newUrl,
            success: true
          });
        }
      } catch (error) {
        // Record batch failure
        for (const update of updates) {
          results.push({
            collection: collectionName,
            documentId: update.docRef.id,
            field: update.fieldPath,
            oldUrl: update.oldUrl,
            newUrl: update.newUrl,
            success: false,
            error: error.message || 'Batch update failed'
          });
        }
      }
    }
    
    return results;
  }
  
  /**
   * Create a nested update object for Firestore
   */
  private createNestedUpdate(fieldPath: string, value: any): Record<string, any> {
    const parts = fieldPath.split('.');
    const result: Record<string, any> = {};
    
    let current = result;
    for (let i = 0; i < parts.length - 1; i++) {
      current[parts[i]] = {};
      current = current[parts[i]];
    }
    
    current[parts[parts.length - 1]] = value;
    return result;
  }
  
  /**
   * Group URL paths by collection
   */
  private groupByCollection(paths: DocumentFieldPath[]): Record<string, DocumentFieldPath[]> {
    return paths.reduce((groups, path) => {
      if (!groups[path.collection]) {
        groups[path.collection] = [];
      }
      groups[path.collection].push(path);
      return groups;
    }, {} as Record<string, DocumentFieldPath[]>);
  }
  
  /**
   * Find all fields in a document that may contain media URLs
   */
  private findMediaUrlFields(
    data: any, 
    parentPath: string = '', 
    result: string[] = []
  ): string[] {
    if (!data || typeof data !== 'object') {
      return result;
    }
    
    // Check if this is an array of media objects with URL fields
    if (Array.isArray(data)) {
      // Look for objects in the array that have URL fields
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        if (item && typeof item === 'object') {
          // Check if this item is a media object
          if ('url' in item || 'type' in item) {
            if ('url' in item && typeof item.url === 'string') {
              result.push(`${parentPath}[${i}].url`);
            }
          } else {
            // Recursively check all properties of this item
            this.findMediaUrlFields(item, `${parentPath}[${i}]`, result);
          }
        } else if (typeof item === 'string' && this.looksLikeUrl(item)) {
          // This array contains direct string URLs
          result.push(`${parentPath}[${i}]`);
        }
      }
      return result;
    }
    
    // Process object
    for (const key of Object.keys(data)) {
      const value = data[key];
      const fieldPath = parentPath ? `${parentPath}.${key}` : key;
      
      // Check if this field is likely to contain media
      if (MEDIA_URL_FIELDS.includes(key) || key.toLowerCase().includes('image') || key.toLowerCase().includes('photo') || key.toLowerCase().includes('media')) {
        if (typeof value === 'string' && this.looksLikeUrl(value)) {
          // This is a string URL field
          result.push(fieldPath);
        } else if (Array.isArray(value)) {
          // This could be an array of URLs or media objects
          if (value.length > 0) {
            if (typeof value[0] === 'string' && this.looksLikeUrl(value[0])) {
              // Array of string URLs
              for (let i = 0; i < value.length; i++) {
                if (typeof value[i] === 'string' && this.looksLikeUrl(value[i])) {
                  result.push(`${fieldPath}[${i}]`);
                }
              }
            } else if (typeof value[0] === 'object' && value[0] !== null) {
              // Array of objects, check if they are media objects
              for (let i = 0; i < value.length; i++) {
                const item = value[i];
                if (item && typeof item === 'object' && 'url' in item && typeof item.url === 'string') {
                  result.push(`${fieldPath}[${i}].url`);
                }
              }
            }
          }
        } else if (value && typeof value === 'object') {
          // This could be a media object with a URL field
          if ('url' in value && typeof value.url === 'string') {
            result.push(`${fieldPath}.url`);
          } else {
            // Recursively check all properties
            this.findMediaUrlFields(value, fieldPath, result);
          }
        }
      } else if (value && typeof value === 'object') {
        // Recursively check all properties
        this.findMediaUrlFields(value, fieldPath, result);
      }
    }
    
    return result;
  }
  
  /**
   * Check if a string looks like a URL
   */
  private looksLikeUrl(str: string): boolean {
    return (
      str.startsWith('http://') || 
      str.startsWith('https://') || 
      str.startsWith('data:') || 
      str.startsWith('blob:') || 
      str.startsWith('/') || 
      str.startsWith('./') || 
      str.startsWith('../')
    );
  }
  
  /**
   * Convert a Firestore document to a validation report
   */
  private convertToValidationReport(id: string, data: any): MediaValidationReport {
    return {
      id,
      startTime: data.startTime.toDate(),
      endTime: data.endTime.toDate(),
      duration: data.duration,
      totalDocuments: data.totalDocuments,
      totalFields: data.totalFields,
      validUrls: data.validUrls,
      invalidUrls: data.invalidUrls,
      missingUrls: data.missingUrls,
      collectionSummaries: data.collectionSummaries,
      invalidResults: data.invalidResults
    };
  }
}