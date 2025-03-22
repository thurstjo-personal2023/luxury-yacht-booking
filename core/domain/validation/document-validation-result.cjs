/**
 * Document Validation Result
 * 
 * A value object that represents the result of validating all media URLs in a document.
 */

const { ValidationResult } = require('./validation-result');

/**
 * Document validation result
 */
const DocumentValidationResult = {
  /**
   * Create a new document validation result
   */
  create: function(props) {
    const collection = props.collection;
    const documentId = props.documentId;
    const validatedAt = props.validatedAt || new Date();
    
    // Convert field results to ValidationResult objects
    const fields = new Map();
    for (const [field, result] of props.fields.entries()) {
      // Use the original result object directly since we need to preserve all properties
      fields.set(field, {
        ...result,
        field,
        collectionId: collection,
        documentId: documentId
      });
    }
    
    // Calculate statistics
    const totalUrls = fields.size;
    const validUrls = Array.from(fields.values()).filter(r => r.isValid).length;
    const invalidUrls = Array.from(fields.values()).filter(r => !r.isValid).length;
    const missingUrls = 0; // For now, missing URLs are counted as invalid
    
    return {
      collection,
      documentId,
      fields,
      validatedAt,
      totalUrls,
      validUrls,
      invalidUrls,
      missingUrls,
      
      /**
       * Get the collection name
       */
      getCollection: function() {
        return collection;
      },
      
      /**
       * Get the document ID
       */
      getDocumentId: function() {
        return documentId;
      },
      
      /**
       * Get all field validation results
       */
      getFields: function() {
        return fields;
      },
      
      /**
       * Get the validation timestamp
       */
      getValidatedAt: function() {
        return validatedAt;
      },
      
      /**
       * Get total number of URLs validated
       */
      getTotalUrls: function() {
        return totalUrls;
      },
      
      /**
       * Get number of valid URLs
       */
      getValidUrls: function() {
        return validUrls;
      },
      
      /**
       * Get number of invalid URLs
       */
      getInvalidUrls: function() {
        return invalidUrls;
      },
      
      /**
       * Get number of missing URLs
       */
      getMissingUrls: function() {
        return missingUrls;
      },
      
      /**
       * Check if document has any invalid URLs
       */
      hasInvalidUrls: function() {
        return invalidUrls > 0;
      },
      
      /**
       * Get all invalid field results
       */
      getInvalidFields: function() {
        const invalidFields = [];
        
        for (const [field, result] of fields.entries()) {
          if (!result.isValid) {
            const invalidField = {
              field,
              url: result.url,
              isValid: result.isValid
            };
            
            // Only add properties that exist
            if (result.status !== undefined) invalidField.status = result.status;
            if (result.statusText !== undefined) invalidField.statusText = result.statusText;
            if (result.contentType !== undefined) invalidField.contentType = result.contentType;
            if (result.error !== undefined) invalidField.error = result.error;
            
            invalidFields.push(invalidField);
          }
        }
        
        return invalidFields;
      },
      
      /**
       * Convert to a plain object for serialization
       */
      toObject: function() {
        return {
          collection,
          documentId,
          validatedAt,
          totalUrls,
          validUrls,
          invalidUrls,
          missingUrls,
          fields: Array.from(fields.entries()).reduce((obj, [key, val]) => {
            obj[key] = val;
            return obj;
          }, {}),
          invalidFields: this.getInvalidFields()
        };
      }
    };
  },
  
  /**
   * Create from an object representation
   */
  fromObject: function(obj) {
    const fieldsMap = new Map();
    
    for (const [field, result] of Object.entries(obj.fields)) {
      fieldsMap.set(field, result);
    }
    
    return DocumentValidationResult.create({
      collection: obj.collection,
      documentId: obj.documentId,
      fields: fieldsMap,
      validatedAt: new Date(obj.validatedAt)
    });
  }
};

module.exports = {
  DocumentValidationResult
};