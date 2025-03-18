/**
 * Media Validation Service
 * 
 * This module provides a complete media validation service that can validate
 * images and videos across all Firestore collections, report on broken URLs,
 * and propose fixes.
 */

import { validateMediaUrl, validateMediaUrls } from './media-validator.js';
import { isBlobUrl, replaceBlobUrl, resolveRelativeUrl, isRelativeUrl } from './url-validator.js';

/**
 * Media Type Constants
 */
export const MEDIA_TYPES = {
  IMAGE: 'image',
  VIDEO: 'video',
  AUDIO: 'audio',
  DOCUMENT: 'document'
};

/**
 * Default Collections to Validate
 */
export const DEFAULT_COLLECTIONS = [
  'unified_yacht_experiences',
  'yacht_profiles',
  'products_add_ons',
  'user_profiles_service_provider',
  'user_profiles_tourist'
];

/**
 * Media Field Mappings for Common Collections
 */
export const COLLECTION_MEDIA_FIELDS = {
  unified_yacht_experiences: {
    imageFields: [
      'media.[].url', // Skip media items with type === 'video'
      'coverImage',
      'mainImage',
      'thumbnailUrl'
    ],
    videoFields: [
      'videoUrl',
      'promoVideo',
      'virtualTour.scenes.[].url'
    ],
    typedMediaField: 'media',
    typeField: 'type',
    urlField: 'url'
  },
  yacht_profiles: {
    imageFields: [
      'media.[].url', // Skip media items with type === 'video'
      'imageUrl',
      'coverImage'
    ],
    videoFields: [
      'videoUrl'
    ],
    typedMediaField: 'media',
    typeField: 'type',
    urlField: 'url'
  },
  products_add_ons: {
    imageFields: [
      'media.[].url',
      'imageUrl'
    ],
    videoFields: [
      'videoUrl'
    ],
    typedMediaField: 'media',
    typeField: 'type',
    urlField: 'url'
  },
  user_profiles_service_provider: {
    imageFields: [
      'profilePhoto',
      'complianceDocuments.[].fileUrl'
    ],
    videoFields: [],
    typedMediaField: null
  },
  user_profiles_tourist: {
    imageFields: [
      'profilePhoto'
    ],
    videoFields: [],
    typedMediaField: null
  }
};

/**
 * Results of a validation operation
 */
export class ValidationResults {
  constructor() {
    this.success = true;
    this.stats = {
      totalDocuments: 0,
      totalUrls: 0,
      validUrls: 0,
      invalidUrls: 0,
      missingUrls: 0,
      badContentTypes: 0,
      imageStats: {
        total: 0,
        valid: 0,
        invalid: 0
      },
      videoStats: {
        total: 0,
        valid: 0,
        invalid: 0
      },
      byCollection: {}
    };
    this.errors = [];
    this.invalid = [];
    this.collections = {};
    this.details = [];
  }
  
  /**
   * Update stats based on a validation result
   */
  updateStats(collectionId, docId, result, mediaType) {
    // Initialize collection stats if they don't exist
    if (!this.stats.byCollection[collectionId]) {
      this.stats.byCollection[collectionId] = {
        documentsProcessed: 0,
        totalUrls: 0,
        validUrls: 0,
        invalidUrls: 0,
        missingUrls: 0,
        badContentTypes: 0
      };
    }
    
    // Update collection stats
    this.stats.byCollection[collectionId].documentsProcessed++;
    this.stats.byCollection[collectionId].totalUrls++;
    this.stats.totalUrls++;
    
    // Update media type-specific stats
    if (mediaType === MEDIA_TYPES.IMAGE) {
      this.stats.imageStats.total++;
    } else if (mediaType === MEDIA_TYPES.VIDEO) {
      this.stats.videoStats.total++;
    }
    
    if (result.valid) {
      this.stats.validUrls++;
      this.stats.byCollection[collectionId].validUrls++;
      
      if (mediaType === MEDIA_TYPES.IMAGE) {
        this.stats.imageStats.valid++;
      } else if (mediaType === MEDIA_TYPES.VIDEO) {
        this.stats.videoStats.valid++;
      }
    } else {
      this.stats.invalidUrls++;
      this.stats.byCollection[collectionId].invalidUrls++;
      
      if (mediaType === MEDIA_TYPES.IMAGE) {
        this.stats.imageStats.invalid++;
      } else if (mediaType === MEDIA_TYPES.VIDEO) {
        this.stats.videoStats.invalid++;
      }
      
      // Add to invalid list with context
      this.invalid.push({
        collectionId,
        docId,
        field: result.path,
        url: result.url,
        reason: result.error ? 'Request failed' : 'Invalid content type',
        status: result.status,
        error: result.error || `Expected ${mediaType}, got ${result.contentType}`
      });
      
      // Count specific types of errors
      if (!result.status) {
        this.stats.missingUrls++;
        this.stats.byCollection[collectionId].missingUrls++;
      } else if (!result.contentTypeValid) {
        this.stats.badContentTypes++;
        this.stats.byCollection[collectionId].badContentTypes++;
      }
    }
  }
  
  /**
   * Add an error to the results
   */
  addError(collectionId, docId, error) {
    this.success = false;
    this.errors.push({
      collectionId,
      docId,
      error: error.message || String(error)
    });
  }
  
  /**
   * Add details to the results
   */
  addDetail(detail) {
    this.details.push(detail);
  }
  
  /**
   * Check if there are any invalid URLs
   */
  hasInvalidUrls() {
    return this.invalid.length > 0;
  }
  
  /**
   * Check if there are any errors
   */
  hasErrors() {
    return this.errors.length > 0;
  }
}

/**
 * Create a validation report
 * 
 * @param {object} firestore Firestore instance
 * @param {ValidationResults} results The validation results
 * @returns {Promise<string>} Report ID
 */
export async function createValidationReport(firestore, results) {
  try {
    // Add timestamp to the report
    const reportData = {
      ...results,
      timestamp: new Date(),
      type: 'media-validation'
    };
    
    // Save to Firestore
    const reportRef = await firestore.collection('validation_reports').add(reportData);
    console.log(`Validation results saved to Firestore with ID: ${reportRef.id}`);
    return reportRef.id;
  } catch (error) {
    console.error('Error saving validation report:', error);
    throw error;
  }
}

/**
 * Get validation reports
 * 
 * @param {object} firestore Firestore instance
 * @param {object} options Options for retrieving reports
 * @returns {Promise<Array<object>>} Array of reports
 */
export async function getValidationReports(firestore, options = {}) {
  const {
    limit = 10,
    type = 'media-validation'
  } = options;
  
  try {
    // Query Firestore for reports
    const reportsSnapshot = await firestore
      .collection('validation_reports')
      .where('type', '==', type)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
    
    // Convert snapshot to array of reports
    const reports = [];
    reportsSnapshot.forEach(doc => {
      const data = doc.data();
      reports.push({
        id: doc.id,
        timestamp: data.timestamp,
        stats: data.stats,
        success: data.success,
        hasErrors: data.errors && data.errors.length > 0,
        hasInvalid: data.invalid && data.invalid.length > 0,
        type: data.type
      });
    });
    
    return reports;
  } catch (error) {
    console.error('Error retrieving validation reports:', error);
    throw error;
  }
}

/**
 * Get a specific validation report
 * 
 * @param {object} firestore Firestore instance
 * @param {string} reportId The report ID
 * @returns {Promise<object>} The report
 */
export async function getValidationReport(firestore, reportId) {
  try {
    // Get the report from Firestore
    const reportDoc = await firestore.collection('validation_reports').doc(reportId).get();
    
    if (!reportDoc.exists) {
      throw new Error(`Report ${reportId} not found`);
    }
    
    return {
      id: reportDoc.id,
      ...reportDoc.data()
    };
  } catch (error) {
    console.error(`Error retrieving validation report ${reportId}:`, error);
    throw error;
  }
}

/**
 * Scan a document for media URLs
 * 
 * @param {object} doc The document to scan
 * @param {string} collectionId The collection ID
 * @param {object} fieldMapping Field mapping for the collection
 * @returns {Array<object>} Array of URLs with context
 */
export function scanDocumentForMediaUrls(doc, collectionId, fieldMapping) {
  const docData = typeof doc.data === 'function' ? doc.data() : doc.data;
  const mediaUrls = [];
  
  if (!docData) {
    return mediaUrls;
  }
  
  const { imageFields = [], videoFields = [], typedMediaField, typeField, urlField } = fieldMapping;
  
  // Process image fields
  imageFields.forEach(field => {
    if (!field.includes('[].')) {
      // Simple field
      if (docData[field]) {
        mediaUrls.push({
          field,
          url: docData[field],
          type: MEDIA_TYPES.IMAGE
        });
      }
    } else {
      // Array field like media.[].url
      const [arrayField, itemField] = field.split('[].');
      
      if (docData[arrayField] && Array.isArray(docData[arrayField])) {
        docData[arrayField].forEach((item, index) => {
          // If this is a typed media field, check the type
          if (typedMediaField && arrayField === typedMediaField && item[typeField]) {
            if (item[typeField] === MEDIA_TYPES.IMAGE && item[urlField]) {
              mediaUrls.push({
                field: `${arrayField}.[${index}].${urlField}`,
                url: item[urlField],
                type: MEDIA_TYPES.IMAGE
              });
            }
          } else if (item[itemField]) {
            // Untyped media field
            mediaUrls.push({
              field: `${arrayField}.[${index}].${itemField}`,
              url: item[itemField],
              type: MEDIA_TYPES.IMAGE
            });
          }
        });
      }
    }
  });
  
  // Process video fields
  videoFields.forEach(field => {
    if (!field.includes('[].')) {
      // Simple field
      if (docData[field]) {
        mediaUrls.push({
          field,
          url: docData[field],
          type: MEDIA_TYPES.VIDEO
        });
      }
    } else {
      // Array field like media.[].url
      const [arrayField, itemField] = field.split('[].');
      
      if (docData[arrayField] && Array.isArray(docData[arrayField])) {
        docData[arrayField].forEach((item, index) => {
          // If this is a typed media field, check the type
          if (typedMediaField && arrayField === typedMediaField && item[typeField]) {
            if (item[typeField] === MEDIA_TYPES.VIDEO && item[urlField]) {
              mediaUrls.push({
                field: `${arrayField}.[${index}].${urlField}`,
                url: item[urlField],
                type: MEDIA_TYPES.VIDEO
              });
            }
          } else if (item[itemField]) {
            // Untyped media field
            mediaUrls.push({
              field: `${arrayField}.[${index}].${itemField}`,
              url: item[itemField],
              type: MEDIA_TYPES.VIDEO
            });
          }
        });
      }
    }
  });
  
  // Special handling for typed media arrays
  if (typedMediaField && docData[typedMediaField] && Array.isArray(docData[typedMediaField])) {
    docData[typedMediaField].forEach((item, index) => {
      if (item[typeField] && item[urlField]) {
        if (item[typeField] === MEDIA_TYPES.IMAGE || item[typeField] === MEDIA_TYPES.VIDEO) {
          // We already processed these above if they were in imageFields or videoFields
          return;
        }
        
        // Other media types
        mediaUrls.push({
          field: `${typedMediaField}.[${index}].${urlField}`,
          url: item[urlField],
          type: item[typeField]
        });
      }
    });
  }
  
  return mediaUrls;
}

/**
 * Validate media URLs in a document
 * 
 * @param {object} doc The document to validate
 * @param {string} collectionId The collection ID
 * @param {object} fieldMapping Field mapping for the collection
 * @param {ValidationResults} results The validation results
 * @returns {Promise<void>}
 */
export async function validateDocumentMedia(doc, collectionId, fieldMapping, results) {
  try {
    // Scan the document for media URLs
    const mediaUrls = scanDocumentForMediaUrls(doc, collectionId, fieldMapping);
    
    if (mediaUrls.length === 0) {
      results.addDetail(`No media URLs found in document ${doc.id} in collection ${collectionId}`);
      return;
    }
    
    // Validate each media URL
    for (const { field, url, type } of mediaUrls) {
      try {
        const validationResult = await validateMediaUrl(url, type);
        validationResult.path = field;
        
        // Update stats
        results.updateStats(collectionId, doc.id, validationResult, type);
      } catch (error) {
        results.addError(collectionId, doc.id, error);
      }
    }
  } catch (error) {
    results.addError(collectionId, doc.id, error);
  }
}

/**
 * Validate media URLs in a collection
 * 
 * @param {object} firestore Firestore instance
 * @param {string} collectionId The collection ID
 * @param {object} options Validation options
 * @param {ValidationResults} results The validation results
 * @returns {Promise<void>}
 */
export async function validateCollectionMedia(firestore, collectionId, options = {}, results) {
  const { 
    limit = 100,
    fieldMapping = COLLECTION_MEDIA_FIELDS[collectionId] || {
      imageFields: ['imageUrl', 'media.[].url'],
      videoFields: ['videoUrl'],
      typedMediaField: 'media',
      typeField: 'type',
      urlField: 'url'
    }
  } = options;
  
  try {
    // Get documents from the collection
    let query = firestore.collection(collectionId);
    
    if (limit > 0) {
      query = query.limit(limit);
    }
    
    const snapshot = await query.get();
    
    if (snapshot.empty) {
      results.addDetail(`Collection ${collectionId} is empty`);
      return;
    }
    
    // Process each document
    for (const doc of snapshot.docs) {
      results.stats.totalDocuments++;
      await validateDocumentMedia(doc, collectionId, fieldMapping, results);
    }
    
    results.addDetail(`Processed ${snapshot.size} documents in collection ${collectionId}`);
  } catch (error) {
    results.success = false;
    results.addError(collectionId, null, error);
  }
}

/**
 * Validate media URLs across multiple collections
 * 
 * @param {object} firestore Firestore instance
 * @param {Array<string>} collections Array of collection IDs
 * @param {object} options Validation options
 * @returns {Promise<ValidationResults>} Validation results
 */
export async function validateAllMedia(firestore, collections = DEFAULT_COLLECTIONS, options = {}) {
  const results = new ValidationResults();
  
  // Process each collection
  for (const collectionId of collections) {
    try {
      // Get field mapping for the collection
      const fieldMapping = COLLECTION_MEDIA_FIELDS[collectionId] || {
        imageFields: ['imageUrl', 'media.[].url'],
        videoFields: ['videoUrl'],
        typedMediaField: 'media',
        typeField: 'type',
        urlField: 'url'
      };
      
      // Validate media URLs in the collection
      await validateCollectionMedia(firestore, collectionId, { 
        fieldMapping,
        ...options
      }, results);
    } catch (error) {
      results.success = false;
      results.addError(collectionId, null, error);
    }
  }
  
  return results;
}

/**
 * Create a repair report
 * 
 * @param {object} firestore Firestore instance
 * @param {object} results The repair results
 * @returns {Promise<string>} Report ID
 */
export async function createRepairReport(firestore, results) {
  try {
    // Add timestamp to the report
    const reportData = {
      ...results,
      timestamp: new Date(),
      type: 'media-repair'
    };
    
    // Save to Firestore
    const reportRef = await firestore.collection('validation_reports').add(reportData);
    console.log(`Repair results saved to Firestore with ID: ${reportRef.id}`);
    return reportRef.id;
  } catch (error) {
    console.error('Error saving repair report:', error);
    throw error;
  }
}

/**
 * Repair invalid media URLs in a document
 * 
 * @param {object} doc The document to repair
 * @param {Array<object>} invalidUrls Array of invalid URL objects for this document
 * @returns {Promise<object>} Repair results
 */
export async function repairDocumentMedia(doc, invalidUrls) {
  const results = {
    docId: doc.id,
    repaired: 0,
    skipped: 0,
    errors: [],
    details: []
  };
  
  if (!invalidUrls || invalidUrls.length === 0) {
    results.details.push(`No invalid URLs to repair in document ${doc.id}`);
    return results;
  }
  
  try {
    // Get the document data
    const docData = typeof doc.data === 'function' ? doc.data() : doc.data;
    
    if (!docData) {
      results.details.push(`No data found for document ${doc.id}`);
      return results;
    }
    
    // Clone the document data
    const updatedData = JSON.parse(JSON.stringify(docData));
    let dataChanged = false;
    
    // Process each invalid URL
    for (const { field, url, type } of invalidUrls) {
      try {
        // Determine the appropriate placeholder
        let placeholder;
        
        if (type === MEDIA_TYPES.IMAGE) {
          // Choose image placeholder based on field name
          if (field.includes('profile') || field.includes('avatar')) {
            placeholder = PLACEHOLDER_IMAGES.profile;
          } else if (field.includes('yacht')) {
            placeholder = PLACEHOLDER_IMAGES.yacht;
          } else if (field.includes('addon') || field.includes('product')) {
            placeholder = PLACEHOLDER_IMAGES.addon;
          } else {
            placeholder = PLACEHOLDER_IMAGES.image;
          }
        } else if (type === MEDIA_TYPES.VIDEO) {
          placeholder = PLACEHOLDER_IMAGES.video;
        } else {
          // Skip fields with unknown types
          results.skipped++;
          results.details.push(`Skipped field ${field} with unknown type ${type}`);
          continue;
        }
        
        // Update the field
        let targetObj = updatedData;
        let fieldPath = field;
        
        if (field.includes('.')) {
          // Handle nested fields
          const segments = field.split('.');
          const lastSegment = segments.pop();
          
          // Navigate to the containing object
          for (const segment of segments) {
            // Handle array indices
            if (segment.startsWith('[') && segment.endsWith(']')) {
              const index = parseInt(segment.slice(1, -1), 10);
              
              if (Array.isArray(targetObj) && index < targetObj.length) {
                targetObj = targetObj[index];
              } else {
                // Can't navigate further
                throw new Error(`Invalid path segment ${segment} in field ${field}`);
              }
            } else {
              // Regular object property
              targetObj = targetObj[segment];
            }
            
            if (!targetObj) {
              throw new Error(`Path ${field} not found in document ${doc.id}`);
            }
          }
          
          fieldPath = lastSegment;
        }
        
        // Replace the URL
        const originalUrl = targetObj[fieldPath];
        targetObj[fieldPath] = placeholder;
        dataChanged = true;
        
        results.repaired++;
        results.details.push(`Replaced URL in field ${field}: ${originalUrl} → ${placeholder}`);
      } catch (error) {
        results.errors.push({
          field,
          error: error.message
        });
        results.details.push(`Error repairing field ${field}: ${error.message}`);
      }
    }
    
    // Update the document if any fields were changed
    if (dataChanged) {
      try {
        await doc.ref.update(updatedData);
        results.details.push(`Document ${doc.id} updated successfully`);
      } catch (error) {
        results.errors.push({
          error: `Failed to update document: ${error.message}`
        });
        results.details.push(`Error updating document ${doc.id}: ${error.message}`);
      }
    } else {
      results.details.push(`No changes made to document ${doc.id}`);
    }
  } catch (error) {
    results.errors.push({
      error: error.message
    });
    results.details.push(`Error processing document ${doc.id}: ${error.message}`);
  }
  
  return results;
}

/**
 * Repair invalid media URLs based on a validation report
 * 
 * @param {object} firestore Firestore instance
 * @param {string} reportId ID of the validation report
 * @returns {Promise<object>} Repair results
 */
export async function repairMediaFromReport(firestore, reportId) {
  const results = {
    success: true,
    reportId,
    stats: {
      documentsScanned: 0,
      documentsRepaired: 0,
      urlsRepaired: 0,
      urlsSkipped: 0,
      errors: 0
    },
    errors: [],
    details: []
  };
  
  try {
    // Get the validation report
    const report = await getValidationReport(firestore, reportId);
    
    if (!report || !report.invalid || report.invalid.length === 0) {
      results.details.push(`No invalid URLs found in report ${reportId}`);
      return results;
    }
    
    // Group invalid URLs by document
    const documentMap = {};
    
    report.invalid.forEach(item => {
      const key = `${item.collectionId}:${item.docId}`;
      
      if (!documentMap[key]) {
        documentMap[key] = {
          collectionId: item.collectionId,
          docId: item.docId,
          invalidUrls: []
        };
      }
      
      documentMap[key].invalidUrls.push({
        field: item.field,
        url: item.url,
        type: item.field.includes('video') ? MEDIA_TYPES.VIDEO : MEDIA_TYPES.IMAGE
      });
    });
    
    // Process each document
    for (const key in documentMap) {
      const { collectionId, docId, invalidUrls } = documentMap[key];
      results.stats.documentsScanned++;
      
      try {
        // Get the document
        const docRef = firestore.collection(collectionId).doc(docId);
        const doc = await docRef.get();
        
        if (!doc.exists) {
          results.details.push(`Document ${docId} in collection ${collectionId} does not exist`);
          continue;
        }
        
        // Repair the document
        const repairResults = await repairDocumentMedia(doc, invalidUrls);
        
        // Update statistics
        if (repairResults.repaired > 0) {
          results.stats.documentsRepaired++;
          results.stats.urlsRepaired += repairResults.repaired;
          results.details.push(`Repaired ${repairResults.repaired} URLs in document ${docId}`);
        }
        
        results.stats.urlsSkipped += repairResults.skipped;
        
        if (repairResults.errors.length > 0) {
          results.stats.errors += repairResults.errors.length;
          results.errors.push({
            collectionId,
            docId,
            errors: repairResults.errors
          });
        }
        
        // Add detailed results
        repairResults.details.forEach(detail => {
          results.details.push(`${collectionId}/${docId}: ${detail}`);
        });
      } catch (error) {
        results.stats.errors++;
        results.errors.push({
          collectionId,
          docId,
          error: error.message
        });
        results.details.push(`Error repairing document ${docId} in collection ${collectionId}: ${error.message}`);
      }
    }
    
    // Update success flag based on errors
    results.success = results.stats.errors === 0;
    
    return results;
  } catch (error) {
    results.success = false;
    results.errors.push({
      error: error.message
    });
    results.details.push(`Error processing report ${reportId}: ${error.message}`);
    return results;
  }
}