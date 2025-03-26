/**
 * Placeholder Handler
 * 
 * Utility functions for handling placeholder images in the application.
 * This ensures consistent placeholder usage across the application.
 */

import { MediaType } from './media-type';

/**
 * Map of placeholder images by type
 */
export const PLACEHOLDER_IMAGES = {
  yacht: '/images/yacht-placeholder.jpg',
  service: '/images/service-placeholder.jpg',
  product: '/images/product-placeholder.jpg',
  user: '/images/user-placeholder.jpg',
  default: '/images/yacht-placeholder.jpg'
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
  
  // Check if URL contains any placeholder keywords
  return Object.values(PLACEHOLDER_IMAGES).some(placeholder => {
    const filename = placeholder.split('/').pop()?.toLowerCase() || '';
    return lowerUrl.includes(filename);
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
  
  // Ensure URL has proper path
  if (filename.includes('placeholder')) {
    // Handle different placeholder types
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