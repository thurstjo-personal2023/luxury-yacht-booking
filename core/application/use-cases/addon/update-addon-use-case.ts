/**
 * Update Add-on Use Case
 * 
 * This use case handles the updating of existing add-ons in the system.
 * It enforces business rules and validations before persisting the changes.
 */

import { Addon } from '../../../domain/addon/addon';
import { AddonType } from '../../../domain/addon/addon-type';
import { IAddonRepository } from '../../ports/repositories/addon-repository';
import { IAddonService } from '../../../domain/services/addon-service';

/**
 * Input data for updating an add-on
 */
export interface UpdateAddonInput {
  id: string;
  name?: string;
  description?: string;
  type?: AddonType;
  category?: string;
  pricing?: {
    basePrice?: number;
    commissionRate?: number;
    maxQuantity?: number;
  };
  media?: Array<{
    type: 'image' | 'video';
    url: string;
    title?: string;
  }>;
  isAvailable?: boolean;
  tags?: string[];
}

/**
 * Result of the update add-on operation
 */
export interface UpdateAddonResult {
  success: boolean;
  addon?: Addon;
  errors?: string[];
}

/**
 * Update Add-on Use Case
 * Handles the updating of existing add-ons
 */
export class UpdateAddonUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository,
    private readonly addonService: IAddonService
  ) {}
  
  /**
   * Execute the use case
   * @param input The input data for updating an add-on
   * @returns The result of the operation
   */
  async execute(input: UpdateAddonInput): Promise<UpdateAddonResult> {
    try {
      // Retrieve the existing add-on
      const existingAddon = await this.addonRepository.getById(input.id);
      if (!existingAddon) {
        return {
          success: false,
          errors: [`Add-on with ID ${input.id} not found`]
        };
      }
      
      // Apply updates to the add-on entity
      if (input.name !== undefined) {
        existingAddon.updateName(input.name);
      }
      
      if (input.description !== undefined) {
        existingAddon.updateDescription(input.description);
      }
      
      if (input.category !== undefined) {
        existingAddon.updateCategory(input.category);
      }
      
      if (input.pricing !== undefined) {
        existingAddon.updatePricing({
          basePrice: input.pricing.basePrice !== undefined 
            ? input.pricing.basePrice 
            : existingAddon.pricing.basePrice,
          commissionRate: input.pricing.commissionRate !== undefined 
            ? input.pricing.commissionRate 
            : existingAddon.pricing.commissionRate,
          maxQuantity: input.pricing.maxQuantity
        });
      }
      
      if (input.media !== undefined) {
        existingAddon.updateMedia(input.media);
      }
      
      if (input.isAvailable !== undefined) {
        existingAddon.setAvailability(input.isAvailable);
      }
      
      if (input.tags !== undefined) {
        // Remove all existing tags and add new ones
        existingAddon.toObject().tags.forEach(tag => {
          existingAddon.removeTag(tag);
        });
        
        input.tags.forEach(tag => {
          existingAddon.addTag(tag);
        });
      }
      
      // Validate the updated add-on
      const validationResult = this.addonService.validateAddon(existingAddon);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }
      
      // Validate the add-on media if it was updated
      if (input.media !== undefined) {
        const mediaValidationResult = await this.addonService.validateAddonMedia(existingAddon);
        if (!mediaValidationResult.isValid) {
          return {
            success: false,
            errors: mediaValidationResult.errors
          };
        }
      }
      
      // Save the updated add-on to the repository
      const savedAddon = await this.addonRepository.save(existingAddon);
      
      return {
        success: true,
        addon: savedAddon
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error occurred']
      };
    }
  }
}