/**
 * URL Validator Test Exports
 * 
 * This module exports URL validation utility functions for testing purposes.
 * These functions are used by the test suite to validate URL processing.
 */

// Import validation functions
const { 
  isValidUrl, 
  isVideoUrl, 
  validateImageUrl 
} = require('../functions/media-validation/validation');

// Export functions for testing
module.exports = {
  isValidUrl,
  isVideoUrl,
  validateImageUrl
};