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
  'Dynamic motion',       // Common description in video filenames
  'dynamic-motion',
  'video-preview'
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
    urlLower.endsWith(ext) || urlLower.includes(`${ext}?`)
  );
  
  if (hasVideoExtension) return MediaType.VIDEO;
  
  const hasVideoPattern = VideoUrlPatterns.some(pattern => 
    urlLower.includes(pattern.toLowerCase())
  );
  
  if (hasVideoPattern) return MediaType.VIDEO;
  
  // Default to image if no specific patterns are found
  // (most media in this application are images)
  return MediaType.IMAGE;
}

/**
 * Check if media type matches expected type
 */
export function isMediaTypeMatch(actual: MediaType, expected: MediaType): boolean {
  if (!expected || expected === MediaType.UNKNOWN) return true;
  return actual === expected;
}