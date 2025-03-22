/**
 * Add-on Service Interface
 * 
 * This interface defines the domain service for add-on operations.
 * It provides business logic related to add-ons independent of the persistence mechanism.
 */

import { Addon } from '../addon/addon';
import { AddonType } from '../addon/addon-type';
import { AddonBundle } from '../addon/addon-bundle';

/**
 * Filtering options for retrieving add-ons
 */
export interface AddonFilterOptions {
  type?: AddonType;
  category?: string;
  partnerId?: string;
  isAvailable?: boolean;
  tags?: string[];
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * Result of validation operations
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Add-on Service interface
 * Provides domain-level operations for add-ons
 */
export interface IAddonService {
  /**
   * Validate an add-on entity
   * @param addon The add-on to validate
   * @returns Validation result
   */
  validateAddon(addon: Addon): ValidationResult;
  
  /**
   * Validate an add-on bundle
   * @param bundle The add-on bundle to validate
   * @returns Validation result
   */
  validateBundle(bundle: AddonBundle): ValidationResult;
  
  /**
   * Calculate the total price for an add-on bundle
   * @param bundle The add-on bundle
   * @param options Optional calculation options
   * @returns The total price
   */
  calculateBundlePrice(bundle: AddonBundle, options?: {
    includeOptional?: boolean;
    selectedOptionalIds?: string[];
    quantity?: number;
  }): number;
  
  /**
   * Calculate the total commission for an add-on bundle
   * @param bundle The add-on bundle
   * @param options Optional calculation options
   * @returns The total commission amount
   */
  calculateBundleCommission(bundle: AddonBundle, options?: {
    includeOptional?: boolean;
    selectedOptionalIds?: string[];
    quantity?: number;
  }): number;
  
  /**
   * Check if an add-on is compatible with a yacht experience
   * @param addon The add-on to check
   * @param experienceId The ID of the yacht experience
   * @returns True if compatible, false otherwise
   */
  isCompatibleWithExperience(addon: Addon, experienceId: string): Promise<boolean>;
  
  /**
   * Get recommended add-ons for a yacht experience
   * @param experienceId The ID of the yacht experience
   * @param limit Maximum number of recommendations to return
   * @returns Array of recommended add-ons
   */
  getRecommendedAddons(experienceId: string, limit?: number): Promise<Addon[]>;
  
  /**
   * Generate a unique product ID for a new add-on
   * @param partnerId Optional partner ID
   * @param type The add-on type
   * @returns A unique product ID
   */
  generateProductId(partnerId?: string, type?: AddonType): string;
  
  /**
   * Check if an add-on has valid media
   * @param addon The add-on to check
   * @returns Validation result for the media
   */
  validateAddonMedia(addon: Addon): Promise<ValidationResult>;
}