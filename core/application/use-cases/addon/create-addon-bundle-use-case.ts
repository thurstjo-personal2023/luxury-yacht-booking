/**
 * Create Add-on Bundle Use Case
 * 
 * This use case handles the creation of a new add-on bundle for a yacht experience.
 */

import { IAddonBundleRepository } from '../../ports/repositories/addon-bundle-repository';
import { AddonBundle } from '../../../domain/addon/addon-bundle';
import { IAddonBundlingService } from '../../../domain/services/addon-bundling-service';

/**
 * Input data for creating an add-on bundle
 */
export interface CreateAddonBundleInput {
  yachtId: string;
  includedAddons?: {
    addonId: string;
    partnerId?: string;
    pricing: number;
    maxQuantity?: number;
  }[];
  optionalAddons?: {
    addonId: string;
    partnerId?: string;
    pricing: number;
    maxQuantity?: number;
  }[];
}

/**
 * Result of the create add-on bundle operation
 */
export interface CreateAddonBundleResult {
  success: boolean;
  bundle?: AddonBundle;
  error?: string;
  errors?: string[];
}

/**
 * Create Add-on Bundle Use Case
 * Handles the creation of a new add-on bundle
 */
export class CreateAddonBundleUseCase {
  constructor(
    private readonly bundleRepository: IAddonBundleRepository,
    private readonly bundlingService: IAddonBundlingService
  ) {}
  
  /**
   * Execute the use case
   * @param input The input data for creating an add-on bundle
   * @returns The result of the operation
   */
  async execute(input: CreateAddonBundleInput): Promise<CreateAddonBundleResult> {
    try {
      const { yachtId, includedAddons = [], optionalAddons = [] } = input;
      
      // Check if a bundle already exists for this yacht
      const existingBundle = await this.bundleRepository.getByYachtId(yachtId);
      if (existingBundle) {
        return {
          success: false,
          error: `Add-on bundle already exists for yacht with ID ${yachtId}`
        };
      }
      
      // Create a new bundle entity
      const bundle = AddonBundle.create({
        yachtId,
        includedAddons: includedAddons.map(addon => ({
          addonId: addon.addonId,
          partnerId: addon.partnerId,
          required: true,
          pricing: addon.pricing,
          maxQuantity: addon.maxQuantity
        })),
        optionalAddons: optionalAddons.map(addon => ({
          addonId: addon.addonId,
          partnerId: addon.partnerId,
          required: false,
          pricing: addon.pricing,
          maxQuantity: addon.maxQuantity
        }))
      });
      
      // Validate the bundle
      const validationResult = this.bundlingService.validateBundle(bundle);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }
      
      // Save the bundle
      const savedBundle = await this.bundleRepository.save(bundle);
      
      return {
        success: true,
        bundle: savedBundle
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}