/**
 * Add-on Bundling Service Interface
 * 
 * This interface defines the domain service for bundling add-ons with yacht experiences.
 * It provides business logic related to add-on bundling independent of the persistence mechanism.
 */

import { Addon } from '../addon/addon';
import { AddonBundle, AddonReference } from '../addon/addon-bundle';

/**
 * Result of bundling operations
 */
export interface BundlingResult {
  success: boolean;
  bundle?: AddonBundle;
  errors?: string[];
}

/**
 * Add-on selection for bundling
 */
export interface AddonSelection {
  addon: Addon;
  isRequired: boolean;
  customPrice?: number;
  customCommissionRate?: number;
}

/**
 * Bundling validation options
 */
export interface BundlingValidationOptions {
  maxIncludedAddons?: number;
  maxOptionalAddons?: number;
  maxTotalAddons?: number;
  allowedCategories?: string[];
  exclusivePartnerIds?: string[];
}

/**
 * Add-on Bundling Service interface
 * Provides domain-level operations for bundling add-ons with yacht experiences
 */
export interface IAddonBundlingService {
  /**
   * Create a new add-on bundle for a yacht experience
   * @param experienceId The ID of the yacht experience
   * @param addons The add-ons to include in the bundle
   * @param options Optional validation options
   * @returns Result of the bundling operation
   */
  createBundle(
    experienceId: string,
    addons: AddonSelection[],
    options?: BundlingValidationOptions
  ): BundlingResult;
  
  /**
   * Update an existing add-on bundle
   * @param bundle The existing bundle to update
   * @param addons The add-ons to include in the updated bundle
   * @param options Optional validation options
   * @returns Result of the bundling operation
   */
  updateBundle(
    bundle: AddonBundle,
    addons: AddonSelection[],
    options?: BundlingValidationOptions
  ): BundlingResult;
  
  /**
   * Convert an add-on entity to a reference for bundling
   * @param addon The add-on entity
   * @param isRequired Whether the add-on is required
   * @param customPrice Optional custom price to override the add-on's base price
   * @param customCommissionRate Optional custom commission rate
   * @returns An add-on reference for bundling
   */
  createAddonReference(
    addon: Addon,
    isRequired: boolean,
    customPrice?: number,
    customCommissionRate?: number
  ): AddonReference;
  
  /**
   * Validate an add-on bundle
   * @param bundle The bundle to validate
   * @param options Optional validation options
   * @returns True if valid, false otherwise with errors
   */
  validateBundle(
    bundle: AddonBundle,
    options?: BundlingValidationOptions
  ): { isValid: boolean; errors: string[] };
  
  /**
   * Calculate the total price of a yacht experience with bundled add-ons
   * @param experienceBasePrice The base price of the yacht experience
   * @param bundle The add-on bundle
   * @param includeOptionalAddons Whether to include optional add-ons in the calculation
   * @returns The total price including add-ons
   */
  calculateTotalPrice(
    experienceBasePrice: number,
    bundle: AddonBundle,
    includeOptionalAddons?: boolean
  ): number;
  
  /**
   * Calculate the total commission for a bundle
   * @param bundle The add-on bundle
   * @param includeOptionalAddons Whether to include optional add-ons in the calculation
   * @returns The total commission amount
   */
  calculateTotalCommission(
    bundle: AddonBundle,
    includeOptionalAddons?: boolean
  ): number;
  
  /**
   * Calculate the commission by partner
   * @param bundle The add-on bundle
   * @returns Map of partner IDs to commission amounts
   */
  calculateCommissionByPartner(
    bundle: AddonBundle
  ): Map<string, number>;
}