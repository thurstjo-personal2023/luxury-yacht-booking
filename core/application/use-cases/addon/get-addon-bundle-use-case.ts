/**
 * Get Add-on Bundle Use Case
 * 
 * This use case handles retrieving add-on bundle details for a yacht experience.
 */

import { AddonBundle } from '../../../domain/addon/addon-bundle';
import { IAddonBundleRepository } from '../../ports/repositories/addon-bundle-repository';

/**
 * Result of the get add-on bundle operation
 */
export interface GetAddonBundleResult {
  success: boolean;
  bundle?: AddonBundle;
  error?: string;
}

/**
 * Get Add-on Bundle Use Case
 * Handles retrieving add-on bundle details
 */
export class GetAddonBundleUseCase {
  constructor(
    private readonly bundleRepository: IAddonBundleRepository
  ) {}
  
  /**
   * Execute the use case to get a bundle by ID
   * @param id The ID of the bundle to retrieve
   * @returns The result of the operation
   */
  async executeById(id: string): Promise<GetAddonBundleResult> {
    try {
      const bundle = await this.bundleRepository.getById(id);
      
      if (!bundle) {
        return {
          success: false,
          error: `Add-on bundle with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        bundle
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Execute the use case to get a bundle by yacht ID
   * @param yachtId The yacht ID associated with the bundle
   * @returns The result of the operation
   */
  async executeByYachtId(yachtId: string): Promise<GetAddonBundleResult> {
    try {
      const bundle = await this.bundleRepository.getByYachtId(yachtId);
      
      if (!bundle) {
        return {
          success: false,
          error: `Add-on bundle for yacht with ID ${yachtId} not found`
        };
      }
      
      return {
        success: true,
        bundle
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Execute the use case to get all bundles that include a specific add-on
   * @param addonId The ID of the add-on
   * @returns The result of the operation with an array of bundles
   */
  async executeByAddonId(addonId: string): Promise<{ success: boolean; bundles?: AddonBundle[]; error?: string }> {
    try {
      const result = await this.bundleRepository.findByAddonId(addonId);
      
      return {
        success: true,
        bundles: result.items
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}