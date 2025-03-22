/**
 * List Add-ons Use Case
 * 
 * This use case handles listing and filtering add-ons in the system.
 */

import { Addon } from '../../../domain/addon/addon';
import { AddonType } from '../../../domain/addon/addon-type';
import { IAddonRepository, AddonQueryOptions, PagedAddons } from '../../ports/repositories/addon-repository';

/**
 * Input for listing add-ons
 */
export interface ListAddonsInput {
  type?: AddonType;
  category?: string;
  partnerId?: string;
  isAvailable?: boolean;
  tags?: string[];
  searchTerm?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'createdAt' | 'updatedAt';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

/**
 * Result of the list add-ons operation
 */
export interface ListAddonsResult {
  success: boolean;
  addons?: Addon[];
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
  error?: string;
}

/**
 * List Add-ons Use Case
 * Handles listing and filtering add-ons
 */
export class ListAddonsUseCase {
  constructor(
    private readonly addonRepository: IAddonRepository
  ) {}
  
  /**
   * Execute the use case
   * @param input The input parameters for listing add-ons
   * @returns The result of the operation
   */
  async execute(input: ListAddonsInput = {}): Promise<ListAddonsResult> {
    try {
      const page = input.page || 1;
      const pageSize = input.pageSize || 20;
      
      // Prepare query options
      const queryOptions: AddonQueryOptions = {
        type: input.type,
        category: input.category,
        partnerId: input.partnerId,
        isAvailable: input.isAvailable,
        tags: input.tags,
        searchTerm: input.searchTerm,
        minPrice: input.minPrice,
        maxPrice: input.maxPrice,
        sortBy: input.sortBy,
        sortDirection: input.sortDirection,
        limit: pageSize,
        offset: (page - 1) * pageSize
      };
      
      // Query the repository
      const result: PagedAddons = await this.addonRepository.find(queryOptions);
      
      // Calculate total pages
      const totalPages = Math.ceil(result.totalCount / pageSize);
      
      return {
        success: true,
        addons: result.items,
        totalCount: result.totalCount,
        totalPages,
        currentPage: page
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
  
  /**
   * Execute the use case to list add-ons by partner ID
   * @param partnerId The partner ID
   * @param input Additional input parameters
   * @returns The result of the operation
   */
  async executeByPartnerId(partnerId: string, input: Omit<ListAddonsInput, 'partnerId'> = {}): Promise<ListAddonsResult> {
    return this.execute({ ...input, partnerId });
  }
  
  /**
   * Execute the use case to list add-ons by category
   * @param category The category
   * @param input Additional input parameters
   * @returns The result of the operation
   */
  async executeByCategory(category: string, input: Omit<ListAddonsInput, 'category'> = {}): Promise<ListAddonsResult> {
    return this.execute({ ...input, category });
  }
  
  /**
   * Execute the use case to list add-ons by tags
   * @param tags The tags to filter by
   * @param input Additional input parameters
   * @returns The result of the operation
   */
  async executeByTags(tags: string[], input: Omit<ListAddonsInput, 'tags'> = {}): Promise<ListAddonsResult> {
    return this.execute({ ...input, tags });
  }
}