/**
 * Media Type Definitions
 * 
 * Defines the possible types of media in the system.
 */

/**
 * Enumeration of supported media types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DOCUMENT = 'document',
  OTHER = 'other'
}

/**
 * Mapping of file extensions to media types
 */
export const FILE_EXTENSION_MAP: Record<string, MediaType> = {
  // Image formats
  'jpg': MediaType.IMAGE,
  'jpeg': MediaType.IMAGE,
  'png': MediaType.IMAGE,
  'gif': MediaType.IMAGE,
  'webp': MediaType.IMAGE,
  'svg': MediaType.IMAGE,
  'bmp': MediaType.IMAGE,
  'tiff': MediaType.IMAGE,
  'tif': MediaType.IMAGE,
  'ico': MediaType.IMAGE,
  
  // Video formats
  'mp4': MediaType.VIDEO,
  'webm': MediaType.VIDEO,
  'mov': MediaType.VIDEO,
  'avi': MediaType.VIDEO,
  'wmv': MediaType.VIDEO,
  'mkv': MediaType.VIDEO,
  'flv': MediaType.VIDEO,
  'ogv': MediaType.VIDEO,
  'm4v': MediaType.VIDEO,
  'mpeg': MediaType.VIDEO,
  'mpg': MediaType.VIDEO,
  
  // Audio formats
  'mp3': MediaType.AUDIO,
  'wav': MediaType.AUDIO,
  'ogg': MediaType.AUDIO,
  'aac': MediaType.AUDIO,
  'flac': MediaType.AUDIO,
  'm4a': MediaType.AUDIO,
  
  // Document formats
  'pdf': MediaType.DOCUMENT,
  'doc': MediaType.DOCUMENT,
  'docx': MediaType.DOCUMENT,
  'xls': MediaType.DOCUMENT,
  'xlsx': MediaType.DOCUMENT,
  'ppt': MediaType.DOCUMENT,
  'pptx': MediaType.DOCUMENT,
  'txt': MediaType.DOCUMENT,
  'rtf': MediaType.DOCUMENT,
  'csv': MediaType.DOCUMENT
};

/**
 * Mapping of MIME types to media types
 */
export const MIME_TYPE_MAP: Record<string, MediaType> = {
  // Image MIME types
  'image/jpeg': MediaType.IMAGE,
  'image/png': MediaType.IMAGE,
  'image/gif': MediaType.IMAGE,
  'image/webp': MediaType.IMAGE,
  'image/svg+xml': MediaType.IMAGE,
  'image/bmp': MediaType.IMAGE,
  'image/tiff': MediaType.IMAGE,
  'image/x-icon': MediaType.IMAGE,
  
  // Video MIME types
  'video/mp4': MediaType.VIDEO,
  'video/webm': MediaType.VIDEO,
  'video/quicktime': MediaType.VIDEO,
  'video/x-msvideo': MediaType.VIDEO,
  'video/x-ms-wmv': MediaType.VIDEO,
  'video/x-matroska': MediaType.VIDEO,
  'video/x-flv': MediaType.VIDEO,
  'video/ogg': MediaType.VIDEO,
  
  // Audio MIME types
  'audio/mpeg': MediaType.AUDIO,
  'audio/wav': MediaType.AUDIO,
  'audio/ogg': MediaType.AUDIO,
  'audio/aac': MediaType.AUDIO,
  'audio/flac': MediaType.AUDIO,
  'audio/mp4': MediaType.AUDIO,
  
  // Document MIME types
  'application/pdf': MediaType.DOCUMENT,
  'application/msword': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': MediaType.DOCUMENT,
  'application/vnd.ms-excel': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': MediaType.DOCUMENT,
  'application/vnd.ms-powerpoint': MediaType.DOCUMENT,
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': MediaType.DOCUMENT,
  'text/plain': MediaType.DOCUMENT,
  'text/rtf': MediaType.DOCUMENT,
  'text/csv': MediaType.DOCUMENT
};

/**
 * Get media type from file extension
 */
export function getMediaTypeFromExtension(extension: string): MediaType {
  const normalized = extension.toLowerCase().replace(/^\./, '');
  return FILE_EXTENSION_MAP[normalized] || MediaType.OTHER;
}

/**
 * Get media type from MIME type
 */
export function getMediaTypeFromMimeType(mimeType: string): MediaType {
  return MIME_TYPE_MAP[mimeType] || MediaType.OTHER;
}

/**
 * Detect if a URL appears to be a video based on patterns in the URL
 */
export function isVideoUrl(url: string): boolean {
  const videoPatterns = [
    /-SBV-/,                // Stock video pattern
    /Dynamic motion/i,      // Description pattern
    /\.(mp4|webm|mov|avi)$/, // File extension
    /video\//               // MIME type prefix
  ];
  
  return videoPatterns.some(pattern => pattern.test(url));
}

/**
 * Get list of valid extensions for a media type
 */
export function getValidExtensionsForType(type: MediaType): string[] {
  return Object.entries(FILE_EXTENSION_MAP)
    .filter(([_, value]) => value === type)
    .map(([key, _]) => key);
}

/**
 * Get list of valid MIME types for a media type
 */
export function getValidMimeTypesForType(type: MediaType): string[] {
  return Object.entries(MIME_TYPE_MAP)
    .filter(([_, value]) => value === type)
    .map(([key, _]) => key);
}