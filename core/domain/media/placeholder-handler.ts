/**
 * Placeholder Handler
 * 
 * Utility functions for handling placeholder images in the application.
 * This ensures consistent placeholder usage across the application.
 */

import { MediaType } from './media-type';

/**
 * Development URL bases (Replit environment)
 * The Replit URL can change when the application restarts,
 * so we maintain a list of possible base URLs
 */
const DEV_URL_BASE = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';
const REPLIT_APP_BASE = 'https://etoile-yachts.replit.app';

/**
 * Map of placeholder images by type
 * Using development URLs while in Replit environment
 */
export const PLACEHOLDER_IMAGES = {
  yacht: `${DEV_URL_BASE}/images/yacht-placeholder.jpg`,
  service: `${DEV_URL_BASE}/images/service-placeholder.jpg`,
  product: `${DEV_URL_BASE}/images/product-placeholder.jpg`,
  user: `${DEV_URL_BASE}/images/user-placeholder.jpg`,
  default: `${DEV_URL_BASE}/images/yacht-placeholder.jpg`
};

/**
 * Map of placeholder images for alternative Replit URLs
 */
export const REPLIT_APP_PLACEHOLDER_IMAGES = {
  yacht: `${REPLIT_APP_BASE}/images/yacht-placeholder.jpg`,
  service: `${REPLIT_APP_BASE}/images/service-placeholder.jpg`,
  product: `${REPLIT_APP_BASE}/images/product-placeholder.jpg`,
  user: `${REPLIT_APP_BASE}/images/user-placeholder.jpg`,
  default: `${REPLIT_APP_BASE}/images/yacht-placeholder.jpg`
};

/**
 * Map of placeholder videos by type
 * Using development URLs while in Replit environment
 */
export const PLACEHOLDER_VIDEOS = {
  yacht: `${DEV_URL_BASE}/images/video-placeholder.mp4`,
  service: `${DEV_URL_BASE}/images/video-placeholder.mp4`,
  default: `${DEV_URL_BASE}/images/video-placeholder.mp4`
};

/**
 * Map of placeholder videos for alternative Replit URLs
 */
export const REPLIT_APP_PLACEHOLDER_VIDEOS = {
  yacht: `${REPLIT_APP_BASE}/images/video-placeholder.mp4`,
  service: `${REPLIT_APP_BASE}/images/video-placeholder.mp4`,
  default: `${REPLIT_APP_BASE}/images/video-placeholder.mp4`
};

/**
 * Get the URL for a placeholder image
 * 
 * @param type The type of placeholder needed
 * @returns The URL for the placeholder image
 */
export function getPlaceholderUrl(type: 'yacht' | 'service' | 'product' | 'user' | 'default' = 'default'): string {
  return PLACEHOLDER_IMAGES[type];
}

/**
 * Get the URL for a placeholder video
 * 
 * @param type The type of placeholder needed
 * @returns The URL for the placeholder video
 */
export function getVideoPlaceholderUrl(type: 'yacht' | 'service' | 'default' = 'default'): string {
  return PLACEHOLDER_VIDEOS[type];
}

/**
 * Check if a URL is a placeholder
 * 
 * @param url The URL to check
 * @returns Whether the URL is a placeholder
 */
export function isPlaceholderUrl(url: string): boolean {
  if (!url) return false;
  
  // Convert to lowercase for case-insensitive comparison
  const lowerUrl = url.toLowerCase();
  
  // Check if URL is on etoile-yachts.replit.app domain with placeholder path
  if (lowerUrl.includes('etoile-yachts.replit.app/images/') && 
      (lowerUrl.includes('placeholder') || lowerUrl.includes('video-placeholder'))) {
    return true;
  }
  
  // Check if URL is on etoileyachts.com domain with placeholder path
  if (lowerUrl.includes('etoileyachts.com/images/') && 
      (lowerUrl.includes('placeholder') || lowerUrl.includes('video-placeholder'))) {
    return true;
  }
  
  // Check if URL is on our Replit development URL with placeholder path
  if (lowerUrl.includes('janeway.replit.dev/images/') && 
      (lowerUrl.includes('placeholder') || lowerUrl.includes('video-placeholder'))) {
    return true;
  }
  
  // Check for relative placeholder paths
  if ((lowerUrl.startsWith('/images/') || lowerUrl.startsWith('images/')) && 
      (lowerUrl.includes('placeholder') || lowerUrl.includes('video-placeholder'))) {
    return true;
  }
  
  // Check for Firebase Storage placeholder URLs
  if (lowerUrl.includes('firebasestorage.googleapis.com') && 
      lowerUrl.includes('placeholders')) {
    return true;
  }
  
  // Check if URL matches any of our known placeholder patterns
  return Object.values(PLACEHOLDER_IMAGES).some(placeholder => 
    lowerUrl === placeholder.toLowerCase()
  ) || Object.values(PLACEHOLDER_VIDEOS).some(placeholder => 
    lowerUrl === placeholder.toLowerCase()
  ) || Object.values(REPLIT_APP_PLACEHOLDER_IMAGES).some(placeholder => 
    lowerUrl === placeholder.toLowerCase()
  ) || Object.values(REPLIT_APP_PLACEHOLDER_VIDEOS).some(placeholder => 
    lowerUrl === placeholder.toLowerCase()
  // Simple 'placeholder' keyword check as a fallback
  ) || lowerUrl.includes('placeholder') || lowerUrl.includes('video-placeholder');
}

/**
 * Determine media type for a placeholder
 * 
 * @param url The placeholder URL
 * @returns The media type for the placeholder
 */
export function getPlaceholderMediaType(url: string): MediaType {
  if (!url) return MediaType.IMAGE;
  
  // Convert to lowercase for case-insensitive comparison
  const lowerUrl = url.toLowerCase();
  
  // Check if it's a video placeholder
  if (lowerUrl.includes('video-placeholder') || lowerUrl.endsWith('.mp4')) {
    return MediaType.VIDEO;
  }
  
  // Check if it matches any of our video placeholders
  const isVideoPlaceholder = 
    Object.values(PLACEHOLDER_VIDEOS).some(placeholder => 
      lowerUrl === placeholder.toLowerCase()
    ) || 
    Object.values(REPLIT_APP_PLACEHOLDER_VIDEOS).some(placeholder => 
      lowerUrl === placeholder.toLowerCase()
    );
  
  return isVideoPlaceholder ? MediaType.VIDEO : MediaType.IMAGE;
}

/**
 * Format a placeholder URL to ensure it's valid in the current environment
 * 
 * @param url The placeholder URL to format
 * @returns A properly formatted placeholder URL
 */
export function formatPlaceholderUrl(url: string): string {
  if (!isPlaceholderUrl(url)) return url;
  
  // Extract the filename from the URL
  const filename = url.split('/').pop() || '';
  const lowerFilename = filename.toLowerCase();
  
  // Check if it's a video file
  const isVideo = lowerFilename.endsWith('.mp4') || 
                 lowerFilename.endsWith('.mov') || 
                 lowerFilename.endsWith('.webm') ||
                 lowerFilename.includes('video');
  
  // Known URLs that need conversion to the current Replit environment URL
  if (url.includes('etoile-yachts.replit.app') || 
      url.includes('etoileyachts.com') ||
      url.includes('firebasestorage.googleapis.com') ||
      // Check if it's already a Replit URL but with the wrong format
      (url.includes('janeway.replit.dev') && !url.includes(DEV_URL_BASE))) {
      
    // Special case: handle 404 errors from replit.app URLs by using our current DEV_URL_BASE
    if (url.includes('etoile-yachts.replit.app')) {
      const path = url.split('etoile-yachts.replit.app')[1] || '';
      if (path) {
        // Use our current Replit environment URL instead
        console.log(`Converting replit.app URL to current environment: ${url} → ${DEV_URL_BASE}${path}`);
        // If it's a video, use video placeholder, otherwise use image placeholder
        if (isVideo) {
          return PLACEHOLDER_VIDEOS.default;
        } else {
          return PLACEHOLDER_IMAGES.default;
        }
      }
    }
    
    // Return video placeholders if it's a video
    if (isVideo) {
      if (lowerFilename.includes('yacht')) {
        return PLACEHOLDER_VIDEOS.yacht;
      } else if (lowerFilename.includes('service')) {
        return PLACEHOLDER_VIDEOS.service;
      } else {
        return PLACEHOLDER_VIDEOS.default;
      }
    }
    
    // Otherwise return image placeholders
    if (lowerFilename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (lowerFilename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (lowerFilename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (lowerFilename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Local/relative URL paths that need the full development URL
  if (url.startsWith('/images/') || url.startsWith('images/')) {
    // Return video placeholders if it's a video
    if (isVideo) {
      if (lowerFilename.includes('yacht')) {
        return PLACEHOLDER_VIDEOS.yacht;
      } else if (lowerFilename.includes('service')) {
        return PLACEHOLDER_VIDEOS.service;
      } else {
        return PLACEHOLDER_VIDEOS.default;
      }
    }
    
    // Otherwise return image placeholders
    if (lowerFilename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (lowerFilename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (lowerFilename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (lowerFilename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Catch-all for any other placeholder URLs
  if (lowerFilename.includes('placeholder')) {
    // Return video placeholders if it's a video
    if (isVideo) {
      if (lowerFilename.includes('yacht')) {
        return PLACEHOLDER_VIDEOS.yacht;
      } else if (lowerFilename.includes('service')) {
        return PLACEHOLDER_VIDEOS.service;
      } else {
        return PLACEHOLDER_VIDEOS.default;
      }
    }
    
    // Otherwise return image placeholders
    if (lowerFilename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (lowerFilename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (lowerFilename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (lowerFilename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Default case - return as is
  return url;
}