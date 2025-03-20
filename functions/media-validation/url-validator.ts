/**
 * URL Validator
 * 
 * This module provides functionality for validating URLs in the Etoile Yachts platform.
 * It checks for broken links, validates content types, and provides repair suggestions.
 */

import fetch from 'node-fetch';
import { AbortController } from 'node-abort-controller';

/**
 * URL validation result
 */
export interface UrlValidationResult {
  url: string;
  isValid: boolean;
  status?: number;
  statusText?: string;
  contentType?: string;
  isImage?: boolean;
  isVideo?: boolean;
  error?: string;
}

/**
 * Extracted URL information
 */
export interface ExtractedUrl {
  path: string;
  url: string;
}

/**
 * URL validator configuration
 */
export interface UrlValidatorConfig {
  baseUrl: string;
  concurrency: number;
  timeout: number;
  ignoreKeywords: string[];
}

/**
 * Default URL validator configuration
 */
export const DEFAULT_VALIDATOR_CONFIG: UrlValidatorConfig = {
  baseUrl: 'https://etoile-yachts.web.app',
  concurrency: 5,
  timeout: 10000,
  ignoreKeywords: ['data:', 'blob:', 'firebase-emulator']
};

/**
 * URL Validator
 */
export class UrlValidator {
  private config: UrlValidatorConfig;
  private cache: Map<string, UrlValidationResult>;
  
  /**
   * Create a new URL validator
   * 
   * @param config Configuration options
   */
  constructor(config: Partial<UrlValidatorConfig> = {}) {
    this.config = { ...DEFAULT_VALIDATOR_CONFIG, ...config };
    this.cache = new Map<string, UrlValidationResult>();
  }
  
  /**
   * Check if a URL is valid by making a request to it
   * 
   * @param url URL to validate
   * @returns Promise resolving to validation result
   */
  async validateUrl(url: string): Promise<UrlValidationResult> {
    // Check cache first
    if (this.cache.has(url)) {
      return this.cache.get(url)!;
    }
    
    // Create validation result
    const result: UrlValidationResult = {
      url,
      isValid: false
    };
    
    try {
      // Check for special URLs or empty URLs
      if (!url || url.trim() === '') {
        result.error = 'URL is empty';
        this.cache.set(url, result);
        return result;
      }
      
      // Check for ignored URLs
      for (const keyword of this.config.ignoreKeywords) {
        if (url.includes(keyword)) {
          result.isValid = true;
          result.error = 'URL is special and was not validated';
          this.cache.set(url, result);
          return result;
        }
      }
      
      // Fix relative URLs
      let requestUrl = url;
      if (url.startsWith('/')) {
        requestUrl = this.fixRelativeUrl(url);
        result.error = 'URL is relative and was converted to absolute';
      }
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeout = setTimeout(() => {
        controller.abort();
      }, this.config.timeout);
      
      // Make fetch request
      const response = await fetch(requestUrl, {
        method: 'HEAD',
        redirect: 'follow',
        signal: controller.signal as any,
        timeout: this.config.timeout
      }).catch(async error => {
        // If HEAD request fails, try GET request
        if (error.name !== 'AbortError') {
          return await fetch(requestUrl, {
            method: 'GET',
            redirect: 'follow',
            signal: controller.signal as any,
            timeout: this.config.timeout
          }).catch(getError => {
            // Both HEAD and GET failed
            throw getError;
          });
        }
        throw error;
      });
      
      // Clear timeout
      clearTimeout(timeout);
      
      // Set status and content type
      result.status = response.status;
      result.statusText = response.statusText;
      result.contentType = response.headers.get('content-type') || undefined;
      
      // Check if URL is valid based on status
      result.isValid = response.ok;
      
      // Determine if URL is image or video
      if (result.contentType) {
        result.isImage = result.contentType.startsWith('image/');
        result.isVideo = result.contentType.startsWith('video/') || 
                         result.contentType.includes('mp4') ||
                         result.contentType.includes('mpeg');
      }
      
      // Cache result
      this.cache.set(url, result);
      
      return result;
    } catch (error) {
      // Handle errors
      if (error.name === 'AbortError') {
        result.error = 'Request timed out';
      } else {
        result.error = error.message || 'Request failed';
      }
      
      // Cache result
      this.cache.set(url, result);
      
      return result;
    }
  }
  
  /**
   * Validate multiple URLs concurrently
   * 
   * @param urls Array of URLs to validate
   * @returns Promise resolving to array of validation results
   */
  async validateUrls(urls: string[]): Promise<UrlValidationResult[]> {
    const results: UrlValidationResult[] = [];
    const uniqueUrls = [...new Set(urls)];
    
    // Process URLs in batches to limit concurrency
    const batches = [];
    for (let i = 0; i < uniqueUrls.length; i += this.config.concurrency) {
      batches.push(uniqueUrls.slice(i, i + this.config.concurrency));
    }
    
    for (const batch of batches) {
      const promises = batch.map(url => this.validateUrl(url));
      const batchResults = await Promise.all(promises);
      results.push(...batchResults);
    }
    
    return results;
  }
  
  /**
   * Extract URLs from an object
   * 
   * @param obj Object to extract URLs from
   * @param basePath Base path for keys
   * @returns Array of extracted URLs
   */
  extractUrls(obj: any, basePath = ''): ExtractedUrl[] {
    const urls: ExtractedUrl[] = [];
    
    if (!obj || typeof obj !== 'object') {
      return urls;
    }
    
    // Handle arrays
    if (Array.isArray(obj)) {
      for (let i = 0; i < obj.length; i++) {
        const item = obj[i];
        const itemPath = basePath ? `${basePath}.[${i}]` : `[${i}]`;
        
        if (typeof item === 'string' && this.looksLikeUrl(item)) {
          urls.push({ path: itemPath, url: item });
        } else if (typeof item === 'object' && item !== null) {
          urls.push(...this.extractUrls(item, itemPath));
        }
      }
    } 
    // Handle special case of media objects
    else if (obj.type && (obj.type === 'image' || obj.type === 'video') && obj.url && typeof obj.url === 'string') {
      const path = basePath ? `${basePath}.url` : 'url';
      urls.push({ path, url: obj.url });
    }
    // Handle normal objects
    else {
      for (const key in obj) {
        const value = obj[key];
        const path = basePath ? `${basePath}.${key}` : key;
        
        if (typeof value === 'string') {
          if (this.looksLikeUrl(value) || (key.includes('url') || key.includes('Url') || key.includes('URL'))) {
            urls.push({ path, url: value });
          }
        } else if (typeof value === 'object' && value !== null) {
          urls.push(...this.extractUrls(value, path));
        }
      }
    }
    
    return urls;
  }
  
  /**
   * Check if a string looks like a URL
   * 
   * @param str String to check
   * @returns True if string looks like a URL
   */
  looksLikeUrl(str: string): boolean {
    if (!str || typeof str !== 'string') {
      return false;
    }
    
    // Check if string starts with common URL prefixes
    if (str.startsWith('http://') || 
        str.startsWith('https://') || 
        str.startsWith('/') ||
        str.startsWith('data:') ||
        str.startsWith('blob:')) {
      return true;
    }
    
    // Check if string has a file extension
    const fileExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp', '.ico',
      '.mp4', '.webm', '.mov', '.avi', '.wmv', '.flv', '.mkv', '.m4v'
    ];
    
    for (const ext of fileExtensions) {
      if (str.includes(ext)) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Fix a relative URL by prepending the base URL
   * 
   * @param url Relative URL to fix
   * @returns Absolute URL
   */
  fixRelativeUrl(url: string): string {
    if (!url.startsWith('/')) {
      return url;
    }
    
    // Remove trailing slash from base URL if present
    const baseUrl = this.config.baseUrl.endsWith('/') 
      ? this.config.baseUrl.slice(0, -1) 
      : this.config.baseUrl;
    
    return `${baseUrl}${url}`;
  }
  
  /**
   * Clear the validation cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}