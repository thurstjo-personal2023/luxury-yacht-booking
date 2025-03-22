/**
 * Add-on Bundling Service Implementation
 * 
 * This service implements the IAddonBundlingService interface.
 */

import { IAddonBundlingService, BundleValidationResult } from '../../core/domain/services/addon-bundling-service';
import { AddonBundle } from '../../core/domain/addon/addon-bundle';
import { IAddonRepository } from '../../core/application/ports/repositories/addon-repository';

/**
 * Implementation of the Add-on Bundling Service
 */
export class AddonBundlingServiceImpl implements IAddonBundlingService {
  constructor(
    private readonly addonRepository: IAddonRepository
  ) {}
  
  /**
   * Validate an add-on bundle
   * @param bundle The bundle to validate
   * @returns Validation result
   */
  async validateBundle(bundle: AddonBundle): Promise<BundleValidationResult> {
    const errors: string[] = [];
    const bundleData = bundle.toObject();
    
    // Check that the yacht ID is valid
    if (!bundleData.yachtId) {
      errors.push('Yacht ID is required');
    }
    
    // Get all add-on IDs in the bundle
    const addonIds = [
      ...bundleData.includedAddons.map(a => a.addonId),
      ...bundleData.optionalAddons.map(a => a.addonId)
    ];
    
    // Check for duplicate add-on IDs
    const uniqueAddonIds = new Set(addonIds);
    if (uniqueAddonIds.size !== addonIds.length) {
      errors.push('Duplicate add-on IDs found in the bundle');
    }
    
    // If no add-ons at all, that's valid (it means the bundle is being cleared)
    if (addonIds.length === 0) {
      return {
        isValid: true,
        errors: []
      };
    }
    
    try {
      // Verify that all add-ons exist
      const addons = await this.addonRepository.findByIds(Array.from(uniqueAddonIds));
      
      // Check if all add-ons were found
      if (addons.length !== uniqueAddonIds.size) {
        const foundAddonIds = new Set(addons.map(a => a.id));
        const missingAddonIds = Array.from(uniqueAddonIds).filter(id => !foundAddonIds.has(id));
        
        errors.push(`The following add-ons were not found: ${missingAddonIds.join(', ')}`);
      }
      
      // Check if all add-ons are available
      const unavailableAddons = addons.filter(a => !a.isAvailable);
      if (unavailableAddons.length > 0) {
        errors.push(`The following add-ons are not available: ${unavailableAddons.map(a => a.name).join(', ')}`);
      }
      
      // Create a map of add-on ID to add-on for pricing validation
      const addonMap = new Map(addons.map(addon => [addon.id, addon]));
      
      // Validate included add-ons
      for (const includedAddon of bundleData.includedAddons) {
        const addon = addonMap.get(includedAddon.addonId);
        if (addon) {
          // Validate pricing
          if (includedAddon.pricing < 0) {
            errors.push(`Pricing for included add-on ${addon.name} (${addon.id}) cannot be negative`);
          }
          
          // Validate max quantity
          if (includedAddon.maxQuantity !== undefined && includedAddon.maxQuantity <= 0) {
            errors.push(`Max quantity for included add-on ${addon.name} (${addon.id}) must be greater than 0`);
          }
        }
      }
      
      // Validate optional add-ons
      for (const optionalAddon of bundleData.optionalAddons) {
        const addon = addonMap.get(optionalAddon.addonId);
        if (addon) {
          // Validate pricing
          if (optionalAddon.pricing < 0) {
            errors.push(`Pricing for optional add-on ${addon.name} (${addon.id}) cannot be negative`);
          }
          
          // Validate max quantity
          if (optionalAddon.maxQuantity !== undefined && optionalAddon.maxQuantity <= 0) {
            errors.push(`Max quantity for optional add-on ${addon.name} (${addon.id}) must be greater than 0`);
          }
        }
      }
    } catch (error) {
      errors.push(`Error validating bundle: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  /**
   * Calculate the total price of a bundle
   * @param bundle The bundle to calculate the price for
   * @returns The total price
   */
  async calculateBundlePrice(bundle: AddonBundle): Promise<number> {
    const bundleData = bundle.toObject();
    let totalPrice = 0;
    
    // Get all add-on IDs in the bundle
    const addonIds = [
      ...bundleData.includedAddons.map(a => a.addonId),
      ...bundleData.optionalAddons.map(a => a.addonId)
    ];
    
    // If no add-ons, return 0
    if (addonIds.length === 0) {
      return 0;
    }
    
    // Sum up the prices of the included add-ons
    for (const includedAddon of bundleData.includedAddons) {
      totalPrice += includedAddon.pricing;
    }
    
    return totalPrice;
  }
}