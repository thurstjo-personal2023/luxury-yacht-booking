/**
 * Media Entity
 * 
 * Defines the structure for media objects in the application.
 */

import { MediaType } from './media-type';

/**
 * Media interface
 */
export interface Media {
  url: string;
  type: MediaType | string; // String type for compatibility with legacy data
  name?: string;
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
  metadata?: MediaMetadata;
}

/**
 * Media metadata
 */
export interface MediaMetadata {
  width?: number;
  height?: number;
  duration?: number;
  size?: number;
  format?: string;
  lastValidated?: Date;
  validationStatus?: 'valid' | 'invalid' | 'unknown';
  [key: string]: any; // Allow for additional properties
}

/**
 * Create a new media object
 */
export function createMedia(
  url: string,
  type: MediaType | string = MediaType.IMAGE,
  options: Partial<Omit<Media, 'url' | 'type'>> = {}
): Media {
  return {
    url,
    type,
    ...options,
    createdAt: options.createdAt || new Date(),
    updatedAt: options.updatedAt || new Date(),
    metadata: {
      ...(options.metadata || {}),
      validationStatus: options.metadata?.validationStatus || 'unknown'
    }
  };
}

/**
 * Create a placeholder media object
 */
export function createPlaceholderMedia(
  type: MediaType | string = MediaType.IMAGE
): Media {
  // URL for placeholder based on media type
  let url = '';
  
  switch (type) {
    case MediaType.IMAGE:
      url = '/placeholder-image.jpg';
      break;
    case MediaType.VIDEO:
      url = '/placeholder-video.mp4';
      break;
    case MediaType.AUDIO:
      url = '/placeholder-audio.mp3';
      break;
    case MediaType.DOCUMENT:
      url = '/placeholder-document.pdf';
      break;
    default:
      url = '/placeholder-media.jpg';
  }
  
  return createMedia(url, type, {
    name: `Placeholder ${type}`,
    description: `Automatically generated placeholder for ${type}`,
    metadata: {
      validationStatus: 'valid'
    }
  });
}

/**
 * Update media properties
 */
export function updateMedia(
  media: Media,
  updates: Partial<Media>
): Media {
  return {
    ...media,
    ...updates,
    updatedAt: new Date(),
    metadata: {
      ...(media.metadata || {}),
      ...(updates.metadata || {})
    }
  };
}

/**
 * Check if the media URL is a relative path
 */
export function isRelativeUrl(url: string): boolean {
  if (!url) return false;
  
  // If it starts with http://, https://, data:, or blob:, it's not relative
  if (/^(https?:|data:|blob:)/i.test(url)) return false;
  
  // If it starts with a slash or doesn't have a scheme, it's relative
  return true;
}

/**
 * Check if the media URL is a blob URL
 */
export function isBlobUrl(url: string): boolean {
  return url?.startsWith('blob:') || false;
}

/**
 * Convert relative URL to absolute
 */
export function toAbsoluteUrl(
  url: string,
  baseUrl: string = typeof window !== 'undefined' 
    ? window.location.origin 
    : 'https://etoile-yachts.replit.app'
): string {
  if (!url) return '';
  if (!isRelativeUrl(url)) return url;
  
  // Remove leading slash if present in both baseUrl and url
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const path = url.startsWith('/') ? url : `/${url}`;
  
  return `${base}${path}`;
}