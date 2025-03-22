/**
 * Delete Add-on Use Case
 * 
 * This use case handles the deletion of add-ons from the system.
 * It ensures the add-on exists and handles any necessary cleanup.
 */

import { IAddonRepository } from '../../ports/repositories/addon-repository';
import { IAddonBundleRepository } from '../../ports/repositories/addon-bundle-repository';

/**
 * Result of the delete add-on operation
 */
export interface DeleteAddonResult {
  success: boolean;
  error?: string;
}

/**
 * Delete Add-on Use Case
 * Handles the deletion of add-ons
 */
export class DeleteAddonUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository,
    private readonly bundleRepository: IAddonBundleRepository
  ) {}
  
  /**
   * Execute the use case
   * @param id The ID of the add-on to delete
   * @returns The result of the operation
   */
  async execute(id: string): Promise<DeleteAddonResult> {
    try {
      // Check if the add-on exists
      const addonExists = await this.addonRepository.exists(id);
      if (!addonExists) {
        return {
          success: false,
          error: `Add-on with ID ${id} not found`
        };
      }
      
      // Check if the add-on is included in any bundles
      const bundles = await this.bundleRepository.findByAddonId(id, { limit: 1 });
      if (bundles.items.length > 0) {
        return {
          success: false,
          error: 'Cannot delete add-on that is being used in yacht experiences. Remove it from all yacht experiences first.'
        };
      }
      
      // Delete the add-on
      const deleted = await this.addonRepository.delete(id);
      
      return {
        success: deleted,
        error: deleted ? undefined : 'Failed to delete add-on'
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}