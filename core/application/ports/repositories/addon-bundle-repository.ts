/**
 * Add-on Bundle Repository Interface
 * 
 * This interface defines the contract for accessing and manipulating add-on bundle data.
 * It abstracts away the specific data storage mechanism, allowing for different
 * implementations while maintaining the same domain logic.
 */

import { AddonBundle } from '../../../domain/addon/addon-bundle';

/**
 * Filtering options for querying add-on bundles
 */
export interface BundleQueryOptions {
  experienceIds?: string[];
  partnerIds?: string[];
  sortBy?: 'experienceId' | 'includedCount' | 'optionalCount';
  sortDirection?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Paged result of add-on bundles
 */
export interface PagedBundles {
  items: AddonBundle[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Add-on Bundle Repository interface
 * Defines methods for managing add-on bundle persistence
 */
export interface IAddonBundleRepository {
  /**
   * Get a bundle by experience ID
   * @param experienceId The experience ID
   * @returns The bundle, or null if not found
   */
  getByExperienceId(experienceId: string): Promise<AddonBundle | null>;
  
  /**
   * Find bundles that match the specified criteria
   * @param options Query options for filtering and sorting
   * @returns Paged result containing matching bundles
   */
  find(options: BundleQueryOptions): Promise<PagedBundles>;
  
  /**
   * Find bundles that include a specific add-on
   * @param addonId The add-on ID
   * @param options Additional query options
   * @returns Paged result containing bundles that include the add-on
   */
  findByAddonId(addonId: string, options?: Omit<BundleQueryOptions, 'addonId'>): Promise<PagedBundles>;
  
  /**
   * Find bundles associated with a specific partner
   * @param partnerId The partner ID
   * @param options Additional query options
   * @returns Paged result containing bundles with add-ons from the partner
   */
  findByPartnerId(partnerId: string, options?: Omit<BundleQueryOptions, 'partnerIds'>): Promise<PagedBundles>;
  
  /**
   * Save a bundle
   * @param bundle The bundle to save
   * @returns The saved bundle
   */
  save(bundle: AddonBundle): Promise<AddonBundle>;
  
  /**
   * Delete a bundle
   * @param experienceId The ID of the experience whose bundle should be deleted
   * @returns True if the bundle was deleted, false if it wasn't found
   */
  delete(experienceId: string): Promise<boolean>;
  
  /**
   * Check if a bundle exists for an experience
   * @param experienceId The experience ID
   * @returns True if a bundle exists, false otherwise
   */
  exists(experienceId: string): Promise<boolean>;
  
  /**
   * Count bundles that match the specified criteria
   * @param options Query options for filtering
   * @returns The count of matching bundles
   */
  count(options?: Partial<BundleQueryOptions>): Promise<number>;
}