/**
 * Get Add-on Use Case
 * 
 * This use case handles retrieving add-on details from the system.
 */

import { Addon } from '../../../domain/addon/addon';
import { IAddonRepository } from '../../ports/repositories/addon-repository';

/**
 * Result of the get add-on operation
 */
export interface GetAddonResult {
  success: boolean;
  addon?: Addon;
  error?: string;
}

/**
 * Get Add-on Use Case
 * Handles retrieving add-on details
 */
export class GetAddonUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository
  ) {}
  
  /**
   * Execute the use case to get an add-on by ID
   * @param id The ID of the add-on to retrieve
   * @returns The result of the operation
   */
  async executeById(id: string): Promise<GetAddonResult> {
    try {
      const addon = await this.addonRepository.getById(id);
      
      if (!addon) {
        return {
          success: false,
          error: `Add-on with ID ${id} not found`
        };
      }
      
      return {
        success: true,
        addon
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Execute the use case to get an add-on by product ID
   * @param productId The product ID of the add-on to retrieve
   * @returns The result of the operation
   */
  async executeByProductId(productId: string): Promise<GetAddonResult> {
    try {
      const addon = await this.addonRepository.getByProductId(productId);
      
      if (!addon) {
        return {
          success: false,
          error: `Add-on with product ID ${productId} not found`
        };
      }
      
      return {
        success: true,
        addon
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}