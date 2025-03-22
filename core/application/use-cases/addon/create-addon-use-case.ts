/**
 * Create Add-on Use Case
 * 
 * This use case handles the creation of new add-ons in the system.
 * It enforces business rules and validations before persisting the add-on.
 */

import { Addon } from '../../../domain/addon/addon';
import { AddonType } from '../../../domain/addon/addon-type';
import { IAddonRepository } from '../../ports/repositories/addon-repository';
import { IAddonService } from '../../../domain/services/addon-service';

/**
 * Input data for creating an add-on
 */
export interface CreateAddonInput {
  name: string;
  description: string;
  type?: AddonType;
  category?: string;
  partnerId?: string;
  pricing: {
    basePrice: number;
    commissionRate: number;
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
 * Result of the create add-on operation
 */
export interface CreateAddonResult {
  success: boolean;
  addon?: Addon;
  errors?: string[];
}

/**
 * Create Add-on Use Case
 * Handles the creation of new add-ons
 */
export class CreateAddonUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository,
    private readonly addonService: IAddonService
  ) {}
  
  /**
   * Execute the use case
   * @param input The input data for creating an add-on
   * @returns The result of the operation
   */
  async execute(input: CreateAddonInput): Promise<CreateAddonResult> {
    try {
      // Generate a unique ID for the new add-on
      const productId = this.addonService.generateProductId(input.partnerId, input.type);
      
      // Create the add-on entity
      const addon = new Addon({
        id: productId,
        productId,
        name: input.name,
        description: input.description,
        type: input.type,
        category: input.category,
        pricing: {
          basePrice: input.pricing.basePrice,
          commissionRate: input.pricing.commissionRate,
          maxQuantity: input.pricing.maxQuantity
        },
        media: input.media,
        isAvailable: input.isAvailable,
        tags: input.tags,
        partnerId: input.partnerId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Validate the add-on
      const validationResult = this.addonService.validateAddon(addon);
      if (!validationResult.isValid) {
        return {
          success: false,
          errors: validationResult.errors
        };
      }
      
      // Validate the add-on media
      const mediaValidationResult = await this.addonService.validateAddonMedia(addon);
      if (!mediaValidationResult.isValid) {
        return {
          success: false,
          errors: mediaValidationResult.errors
        };
      }
      
      // Save the add-on to the repository
      const savedAddon = await this.addonRepository.save(addon);
      
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