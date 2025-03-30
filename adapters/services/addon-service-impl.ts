/**
 * Add-on Service Implementation
 * 
 * This service implements the IAddonService interface.
 */

import { IAddonService, AddonValidationResult, AddonMediaValidationResult } from '../../core/domain/services/addon-service';
import { Addon } from '../../core/domain/addon/addon';
import { IAddOnFormValidator } from '../../core/domain/interfaces/IAddOnFormValidator';
import * as https from 'https';
import * as http from 'http';
import { URL } from 'url';

export class AddonServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'AddonServiceError';
  }
}

export class AddonServiceImpl implements IAddonService {
  private formValidator: IAddOnFormValidator;

  constructor(formValidator: IAddOnFormValidator) {
    this.formValidator = formValidator;
  }

  async validateAndUploadMedia(mediaItems: Array<{type: string, url: string}>) {
    try {
      const validationResult = await this.formValidator.validateMediaItems(mediaItems);
      if (!validationResult.isValid) {
        throw new AddonServiceError('Media validation failed', 'MEDIA_VALIDATION_ERROR');
      }
      // Media upload logic here
    } catch (error) {
      throw new AddonServiceError(
        error instanceof Error ? error.message : 'Media upload failed',
        'MEDIA_UPLOAD_ERROR'
      );
    }
  }
}

/**
 * Implementation of the Add-on Service
 */
export class AddonServiceImpl implements IAddonService {
  /**
   * Validate an add-on entity
   * @param addon The add-on to validate
   * @returns Validation result
   */
  validateAddon(addon: Addon): AddonValidationResult {
    const errors: string[] = [];
    const addonData = addon.toObject();
    
    // Validate name
    if (!addonData.name || addonData.name.trim().length < 3) {
      errors.push('Add-on name must be at least 3 characters long');
    }
    
    // Validate description
    if (!addonData.description || addonData.description.trim().length < 10) {
      errors.push('Add-on description must be at least 10 characters long');
    }
    
    // Validate category
    if (!addonData.category || addonData.category.trim().length === 0) {
      errors.push('Add-on category is required');
    }
    
    // Validate pricing
    if (addonData.pricing.basePrice < 0) {
      errors.push('Add-on price cannot be negative');
    }
    
    if (addonData.pricing.commissionRate < 0 || addonData.pricing.commissionRate > 100) {
      errors.push('Commission rate must be between 0 and 100');
    }
    
    if (addonData.pricing.maxQuantity !== undefined && addonData.pricing.maxQuantity <= 0) {
      errors.push('Maximum quantity must be greater than 0');
    }
    
    // Validate media
    if (addonData.media.length === 0) {
      errors.push('At least one media item is required');
    }
    
    // Validate partner ID
    if (addonData.type === 'partner' && !addonData.partnerId) {
      errors.push('Partner ID is required for partner add-ons');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate an add-on's media
   * @param addon The add-on with media to validate
   * @returns Validation result with a promise
   */
  async validateAddonMedia(addon: Addon): Promise<AddonMediaValidationResult> {
    const errors: string[] = [];
    const addonData = addon.toObject();
    
    // No media to validate
    if (addonData.media.length === 0) {
      return {
        isValid: false,
        errors: ['At least one media item is required']
      };
    }
    
    // Validate each media URL
    const validationPromises = addonData.media.map(async (media, index) => {
      try {
        // Skip validation for relative URLs as they will be caught in a different validation
        if (media.url.startsWith('/')) {
          errors.push(`Media URL at index ${index} is a relative URL: ${media.url}`);
          return;
        }
        
        // Validate URL format
        try {
          new URL(media.url);
        } catch (error) {
          errors.push(`Invalid URL format for media at index ${index}: ${media.url}`);
          return;
        }
        
        // Check if the URL is accessible and has the correct content type
        const mediaType = media.type;
        const expectedContentTypePrefix = mediaType === 'image' ? 'image/' : 'video/';
        
        const isValid = await this.validateUrl(media.url, expectedContentTypePrefix);
        
        if (!isValid.valid) {
          errors.push(`Invalid media URL at index ${index}: ${media.url}. ${isValid.reason}`);
        }
      } catch (error) {
        errors.push(`Error validating media URL at index ${index}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    });
    
    // Wait for all validations to complete
    await Promise.all(validationPromises);
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Validate a URL by checking if it's accessible and has the expected content type
   * @param url The URL to validate
   * @param expectedContentTypePrefix The expected content type prefix
   * @returns Validation result
   */
  private async validateUrl(url: string, expectedContentTypePrefix: string): Promise<{ valid: boolean; reason?: string }> {
    return new Promise((resolve) => {
      const urlObj = new URL(url);
      const options = {
        method: 'HEAD',
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        timeout: 5000 // 5 second timeout
      };
      
      const protocol = urlObj.protocol === 'https:' ? https : http;
      
      const req = protocol.request(options, (res) => {
        if (res.statusCode !== 200) {
          resolve({ 
            valid: false, 
            reason: `Received status code ${res.statusCode}` 
          });
          return;
        }
        
        const contentType = res.headers['content-type'] || '';
        
        if (!contentType.startsWith(expectedContentTypePrefix)) {
          resolve({ 
            valid: false, 
            reason: `Expected ${expectedContentTypePrefix} content type, got ${contentType}` 
          });
          return;
        }
        
        resolve({ valid: true });
      });
      
      req.on('error', (error) => {
        resolve({ 
          valid: false, 
          reason: `Request failed: ${error.message}` 
        });
      });
      
      req.on('timeout', () => {
        req.destroy();
        resolve({ 
          valid: false, 
          reason: 'Request timed out' 
        });
      });
      
      req.end();
    });
  }
}