/**
 * Bundle Add-ons Use Case
 * 
 * This use case handles the bundling of add-ons with yacht experiences.
 * It ensures the add-ons exist and handles pricing validation.
 */

import { IAddonRepository } from '../../ports/repositories/addon-repository';
import { IAddonBundleRepository } from '../../ports/repositories/addon-bundle-repository';
import { AddonBundle } from '../../../domain/addon/addon-bundle';
import { IAddonBundlingService } from '../../../domain/services/addon-bundling-service';
import { AddOnReference } from '../../../../shared/firestore-schema';

/**
 * Input data for bundling add-ons with yacht experiences
 */
export interface BundleAddonsInput {
  yachtId: string;
  includedAddOns?: {
    addonId: string;
    partnerId?: string;
    pricing?: number;
    maxQuantity?: number;
  }[];
  optionalAddOns?: {
    addonId: string;
    partnerId?: string;
    pricing?: number;
    maxQuantity?: number;
  }[];
}

/**
 * Result of the bundle add-ons operation
 */
export interface BundleAddonsResult {
  success: boolean;
  bundle?: AddonBundle;
  includedAddOnsReferences?: AddOnReference[];
  optionalAddOnsReferences?: AddOnReference[];
  error?: string;
  errors?: string[];
}

/**
 * Bundle Add-ons Use Case
 * Handles the bundling of add-ons with yacht experiences
 */
export class BundleAddonsUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository,
    private readonly bundleRepository: IAddonBundleRepository,
    private readonly bundlingService: IAddonBundlingService
  ) {}
  
  /**
   * Execute the use case
   * @param input The input data for bundling add-ons
   * @returns The result of the operation
   */
  async execute(input: BundleAddonsInput): Promise<BundleAddonsResult> {
    try {
      const { yachtId, includedAddOns = [], optionalAddOns = [] } = input;
      const errors: string[] = [];
      
      // Validate that the yacht exists
      const existingBundle = await this.bundleRepository.getByYachtId(yachtId);
      if (!existingBundle) {
        return {
          success: false,
          error: `Yacht with ID ${yachtId} not found or has no bundle configuration`
        };
      }
      
      // Get all add-ons to be bundled
      const allAddonIds = [
        ...includedAddOns.map(a => a.addonId),
        ...optionalAddOns.map(a => a.addonId)
      ];
      
      // Check for duplicates
      const uniqueAddonIds = new Set(allAddonIds);
      if (uniqueAddonIds.size !== allAddonIds.length) {
        return {
          success: false,
          error: 'Duplicate add-ons found. An add-on cannot be both included and optional.'
        };
      }
      
      // Fetch all add-ons at once
      const addons = await this.addonRepository.findByIds(Array.from(uniqueAddonIds));
      
      // Map of addon ID to addon
      const addonMap = new Map(addons.map(addon => [addon.id, addon]));
      
      // Process included add-ons
      const includedAddOnRefs: AddOnReference[] = [];
      for (const includedAddon of includedAddOns) {
        const addon = addonMap.get(includedAddon.addonId);
        if (!addon) {
          errors.push(`Add-on with ID ${includedAddon.addonId} not found`);
          continue;
        }
        
        if (!addon.isAvailable) {
          errors.push(`Add-on "${addon.name}" is not available for bundling`);
          continue;
        }
        
        // Create add-on reference for Firestore
        includedAddOnRefs.push({
          addOnId: addon.id,
          partnerId: addon.partnerId,
          name: addon.name,
          description: addon.description,
          pricing: includedAddon.pricing ?? addon.pricing.basePrice,
          isRequired: true,
          commissionRate: addon.pricing.commissionRate,
          maxQuantity: includedAddon.maxQuantity ?? addon.pricing.maxQuantity,
          category: addon.category,
          mediaUrl: addon.media.length > 0 ? addon.media[0].url : undefined
        });
      }
      
      // Process optional add-ons
      const optionalAddOnRefs: AddOnReference[] = [];
      for (const optionalAddon of optionalAddOns) {
        const addon = addonMap.get(optionalAddon.addonId);
        if (!addon) {
          errors.push(`Add-on with ID ${optionalAddon.addonId} not found`);
          continue;
        }
        
        if (!addon.isAvailable) {
          errors.push(`Add-on "${addon.name}" is not available for bundling`);
          continue;
        }
        
        // Create add-on reference for Firestore
        optionalAddOnRefs.push({
          addOnId: addon.id,
          partnerId: addon.partnerId,
          name: addon.name,
          description: addon.description,
          pricing: optionalAddon.pricing ?? addon.pricing.basePrice,
          isRequired: false,
          commissionRate: addon.pricing.commissionRate,
          maxQuantity: optionalAddon.maxQuantity ?? addon.pricing.maxQuantity,
          category: addon.category,
          mediaUrl: addon.media.length > 0 ? addon.media[0].url : undefined
        });
      }
      
      // If there are errors, return them
      if (errors.length > 0) {
        return {
          success: false,
          errors
        };
      }
      
      // Create or update the bundle
      existingBundle.updateAddons(
        includedAddOnRefs.map(ref => ({
          addonId: ref.addOnId,
          partnerId: ref.partnerId,
          required: true,
          pricing: ref.pricing,
          maxQuantity: ref.maxQuantity
        })),
        optionalAddOnRefs.map(ref => ({
          addonId: ref.addOnId,
          partnerId: ref.partnerId,
          required: false,
          pricing: ref.pricing,
          maxQuantity: ref.maxQuantity
        }))
      );
      
      // Validate the bundle
      const validationResult = this.bundlingService.validateBundle(existingBundle);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }
      
      // Save the bundle
      const savedBundle = await this.bundleRepository.save(existingBundle);
      
      return {
        success: true,
        bundle: savedBundle,
        includedAddOnsReferences: includedAddOnRefs,
        optionalAddOnsReferences: optionalAddOnRefs
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}