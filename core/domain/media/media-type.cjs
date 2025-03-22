/**
 * Media Type (CommonJS Version)
 * 
 * This is a CommonJS version of the MediaType module for testing.
 */

const MediaType = {
  IMAGE: 'image',
  VIDEO: 'video',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  UNKNOWN: 'unknown',
  
  /**
   * Determine media type from URL and content type
   */
  fromUrl: function(url, contentType = null) {
    if (url === null || url === undefined) {
      return null;
    }
    
    // Convert to lowercase for case-insensitive matching
    url = url.toLowerCase();
    
    // Use content type if available (takes precedence over URL patterns)
    if (contentType) {
      if (contentType.toLowerCase().startsWith('image/')) {
        return this.IMAGE;
      } else if (contentType.toLowerCase().startsWith('video/')) {
        return this.VIDEO;
      } else if (contentType.toLowerCase().startsWith('audio/')) {
        return this.AUDIO;
      } else if (
        contentType.toLowerCase().startsWith('application/pdf') ||
        contentType.toLowerCase().startsWith('application/msword') ||
        contentType.toLowerCase().startsWith('application/vnd.openxmlformats-officedocument') ||
        contentType.toLowerCase().includes('text/plain')
      ) {
        return this.DOCUMENT;
      }
    }
    
    // Check for video indicators
    const VIDEO_INDICATORS = [
      '.mp4', '.mov', '.avi', '.webm', '.mkv', '.m4v',
      'video/', 'dynamic motion', '-sbv-'
    ];
    
    for (const indicator of VIDEO_INDICATORS) {
      if (url.includes(indicator.toLowerCase())) {
        return this.VIDEO;
      }
    }
    
    // Check for image indicators
    const IMAGE_INDICATORS = [
      '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
      '.bmp', '.tiff', '.tif', 'image/'
    ];
    
    for (const indicator of IMAGE_INDICATORS) {
      if (url.includes(indicator.toLowerCase())) {
        return this.IMAGE;
      }
    }
    
    // Check for document indicators
    const DOCUMENT_INDICATORS = [
      '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt',
      '.pptx', '.txt', '.rtf', '.csv', 'application/pdf'
    ];
    
    for (const indicator of DOCUMENT_INDICATORS) {
      if (url.includes(indicator.toLowerCase())) {
        return this.DOCUMENT;
      }
    }
    
    // Check for audio indicators
    const AUDIO_INDICATORS = [
      '.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac',
      'audio/'
    ];
    
    for (const indicator of AUDIO_INDICATORS) {
      if (url.includes(indicator.toLowerCase())) {
        return this.AUDIO;
      }
    }
    
    // Default to image if no type is detected
    return this.IMAGE;
  },
  
  /**
   * Check if a media type matches the expected type
   */
  matches: function(expected, actual) {
    if (!expected || !actual) {
      return false;
    }
    return expected === actual;
  }
};

/**
 * Check if a value is a valid media type
 */
function isValidMediaType(type) {
  if (typeof type !== 'string') {
    return false;
  }
  
  return type === MediaType.IMAGE || 
         type === MediaType.VIDEO || 
         type === MediaType.DOCUMENT || 
         type === MediaType.AUDIO;
}

module.exports = {
  MediaType,
  isValidMediaType
};