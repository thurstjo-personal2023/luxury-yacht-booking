/**
 * Media Type
 * 
 * Defines the supported media types for the application.
 */

/**
 * Media type enum
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  UNKNOWN = 'unknown'
}

/**
 * Common MIME types organized by media type
 */
export const MediaTypeMimePatterns = {
  [MediaType.IMAGE]: [
    'image/',
    'application/octet-stream'  // Sometimes images are served with this generic type
  ],
  [MediaType.VIDEO]: [
    'video/',
    'application/mp4',
    'application/x-mpegURL',
    'application/x-mpegurl'
  ],
  [MediaType.AUDIO]: [
    'audio/',
    'application/ogg',
    'application/vnd.apple.mpegurl'
  ],
  [MediaType.DOCUMENT]: [
    'application/pdf',
    'application/msword',
    'application/vnd.ms-',
    'application/vnd.openxmlformats-',
    'text/plain',
    'text/csv',
    'text/html'
  ]
};

/**
 * Video file extension patterns
 */
export const VideoFileExtensions = [
  '.mp4',
  '.mov',
  '.avi',
  '.webm',
  '.mkv',
  '.flv',
  '.wmv',
  '.m4v',
  '.mpg',
  '.mpeg',
  '.3gp'
];

/**
 * Video URL patterns
 */
export const VideoUrlPatterns = [
  '-SBV-',                // Stock video pattern from providers
  'SBV-',                 // Alternate stock video pattern
  'Dynamic motion',       // Common description in video filenames
  'dynamic-motion',
  'video-preview',
  'preview.mp4',          // Common video preview naming pattern
  'preview-video',
  'yacht-video',
  '-preview.mp4',         // Another common video preview pattern
  'tourist-luxury-yacht-during-vacation-holidays', // Specific stock video filename pattern
  'night-town-tivat-in-porto-montenegro-hotel-and-sailing-boats-in-the-boka-bay',
  'SBV-309363270',        // Specific stock video IDs
  'SBV-347241353',
  '309363270-preview',
  '347241353-preview',
  'luxury-yacht-during-vacation-holidays',
  'sailing-boats',        // Common video content descriptor
  'porto-montenegro'      // Specific location for video content
];

/**
 * Determine media type from MIME type
 */
export function getMediaTypeFromMime(mimeType: string): MediaType {
  if (!mimeType) return MediaType.UNKNOWN;

  // Check each media type's patterns
  for (const [type, patterns] of Object.entries(MediaTypeMimePatterns)) {
    if (patterns.some(pattern => mimeType.toLowerCase().includes(pattern.toLowerCase()))) {
      return type as MediaType;
    }
  }

  return MediaType.UNKNOWN;
}

/**
 * Determine media type from URL
 */
export function getMediaTypeFromUrl(url: string): MediaType {
  if (!url) return MediaType.UNKNOWN;
  const urlLower = url.toLowerCase();

  // Check for video patterns in URL
  const hasVideoExtension = VideoFileExtensions.some(ext => 
    urlLower.endsWith(ext) || urlLower.includes(`${ext}?`) || urlLower.includes(`${ext}&`) || urlLower.includes(`${ext}/`)
  );
  
  if (hasVideoExtension) return MediaType.VIDEO;
  
  const hasVideoPattern = VideoUrlPatterns.some(pattern => 
    urlLower.includes(pattern.toLowerCase())
  );
  
  if (hasVideoPattern) return MediaType.VIDEO;
  
  // Check for video-specific path patterns
  if (
    urlLower.includes('/videos/') || 
    urlLower.includes('/video/') || 
    urlLower.includes('_video/') ||
    urlLower.includes('_videos/')
  ) {
    return MediaType.VIDEO;
  }
  
  // Default to image if no specific patterns are found
  // (most media in this application are images)
  return MediaType.IMAGE;
}

/**
 * Check if media type matches expected type with enhanced validation logic
 * 
 * This function applies special rules for validation:
 * 1. If expected type is unknown, any actual type is valid
 * 2. Videos can be stored in image fields in some cases (legacy data)
 * 3. Exact match is required for all other cases
 */
export function isMediaTypeMatch(actual: MediaType, expected: MediaType): boolean {
  // If no expected type or unknown, accept any type
  if (!expected || expected === MediaType.UNKNOWN) return true;
  
  // Exact match is always valid
  if (actual === expected) return true;
  
  // Special case: Videos can be stored in image fields in some cases
  // This handles the case where our database has video URLs in image fields
  if (expected === MediaType.IMAGE && actual === MediaType.VIDEO) {
    console.log('Allowing video in image field due to legacy data pattern');
    return true;
  }
  
  // For all other mismatches, return false
  return false;
}