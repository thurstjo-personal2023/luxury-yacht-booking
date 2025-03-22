/**
 * Validation Result (CommonJS Version)
 * 
 * This is a CommonJS version of the ValidationResult module for testing.
 */

const ValidationResult = {
  /**
   * Create a valid result
   */
  valid: function(url, field, collectionId, documentId) {
    return {
      url,
      field,
      collectionId,
      documentId,
      isValid: true,
      status: 200,
      statusText: 'OK',
      error: null,
      contentType: null
    };
  },
  
  /**
   * Create an invalid result
   */
  invalid: function(url, field, collectionId, documentId, status, statusText, error, contentType) {
    return {
      url,
      field,
      collectionId,
      documentId,
      isValid: false,
      status: status || null,
      statusText: statusText || null,
      error: error || 'Unknown error',
      contentType: contentType || null
    };
  },
  
  /**
   * Check if a result is valid
   */
  isValid: function(result) {
    return result && result.isValid === true;
  },
  
  /**
   * Get a summarized error message from a validation result
   */
  getErrorMessage: function(result) {
    if (ValidationResult.isValid(result)) {
      return null;
    }
    
    if (result.status && result.statusText) {
      return `${result.status} ${result.statusText}`;
    }
    
    return result.error || 'Unknown error';
  }
};

module.exports = {
  ValidationResult
};