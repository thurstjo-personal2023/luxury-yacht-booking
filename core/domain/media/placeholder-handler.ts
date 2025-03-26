/**
 * Placeholder Handler
 * 
 * Utility functions for handling placeholder images in the application.
 * This ensures consistent placeholder usage across the application.
 */

import { MediaType } from './media-type';

/**
 * Development URL base (Replit environment)
 */
const DEV_URL_BASE = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';

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
 * Get the URL for a placeholder image
 * 
 * @param type The type of placeholder needed
 * @returns The URL for the placeholder image
 */
export function getPlaceholderUrl(type: 'yacht' | 'service' | 'product' | 'user' | 'default' = 'default'): string {
  return PLACEHOLDER_IMAGES[type];
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
      lowerUrl.includes('placeholder')) {
    return true;
  }
  
  // Check if URL is on etoileyachts.com domain with placeholder path
  if (lowerUrl.includes('etoileyachts.com/images/') && 
      lowerUrl.includes('placeholder')) {
    return true;
  }
  
  // Check for relative placeholder paths
  if ((lowerUrl.startsWith('/images/') || lowerUrl.startsWith('images/')) && 
      lowerUrl.includes('placeholder')) {
    return true;
  }
  
  // Check for Firebase Storage placeholder URLs
  if (lowerUrl.includes('firebasestorage.googleapis.com') && 
      lowerUrl.includes('placeholders')) {
    return true;
  }
  
  // Check if URL matches any of our known placeholder patterns
  return Object.values(PLACEHOLDER_IMAGES).some(placeholder => {
    return lowerUrl === placeholder.toLowerCase();
  // Simple 'placeholder' keyword check as a fallback
  }) || lowerUrl.includes('placeholder');
}

/**
 * Determine media type for a placeholder
 * 
 * @param url The placeholder URL
 * @returns The media type for the placeholder
 */
export function getPlaceholderMediaType(url: string): MediaType {
  // Placeholders are always images in our application
  return MediaType.IMAGE;
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
  
  // Known production URLs that need conversion to development URLs
  if (url.includes('etoile-yachts.replit.app') || 
      url.includes('etoileyachts.com') ||
      url.includes('firebasestorage.googleapis.com')) {
    
    // Handle different placeholder types based on filename
    if (filename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (filename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (filename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (filename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Local/relative URL paths that need the full development URL
  if (url.startsWith('/images/') || url.startsWith('images/')) {
    // Handle different placeholder types based on filename
    if (filename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (filename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (filename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (filename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Catch-all for any other placeholder URLs
  if (filename.includes('placeholder')) {
    // Handle different placeholder types based on filename
    if (filename.includes('yacht')) {
      return PLACEHOLDER_IMAGES.yacht;
    } else if (filename.includes('service')) {
      return PLACEHOLDER_IMAGES.service;
    } else if (filename.includes('product')) {
      return PLACEHOLDER_IMAGES.product;
    } else if (filename.includes('user')) {
      return PLACEHOLDER_IMAGES.user;
    } else {
      return PLACEHOLDER_IMAGES.default;
    }
  }
  
  // Default case - return as is
  return url;
}