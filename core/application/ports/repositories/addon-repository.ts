/**
 * Add-on Repository Interface
 * 
 * This interface defines the contract for accessing and manipulating add-on data.
 * It abstracts away the specific data storage mechanism, allowing for different
 * implementations (Firestore, SQL, etc.) while maintaining the same domain logic.
 */

import { Addon } from '../../../domain/addon/addon';
import { AddonType } from '../../../domain/addon/addon-type';

/**
 * Filtering options for querying add-ons
 */
export interface AddonQueryOptions {
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
  limit?: number;
  offset?: number;
}

/**
 * Paged result of add-ons
 */
export interface PagedAddons {
  items: Addon[];
  totalCount: number;
  hasMore: boolean;
}

/**
 * Add-on Repository interface
 * Defines methods for managing add-on persistence
 */
export interface IAddonRepository {
  /**
   * Get an add-on by ID
   * @param id The add-on ID
   * @returns The add-on, or null if not found
   */
  getById(id: string): Promise<Addon | null>;
  
  /**
   * Get an add-on by product ID
   * @param productId The product ID
   * @returns The add-on, or null if not found
   */
  getByProductId(productId: string): Promise<Addon | null>;
  
  /**
   * Find add-ons that match the specified criteria
   * @param options Query options for filtering and sorting
   * @returns Paged result containing matching add-ons
   */
  find(options: AddonQueryOptions): Promise<PagedAddons>;
  
  /**
   * Find add-ons by partner ID
   * @param partnerId The partner ID
   * @param options Additional query options
   * @returns Paged result containing the partner's add-ons
   */
  findByPartnerId(partnerId: string, options?: Omit<AddonQueryOptions, 'partnerId'>): Promise<PagedAddons>;
  
  /**
   * Find add-ons by category
   * @param category The category
   * @param options Additional query options
   * @returns Paged result containing add-ons in the specified category
   */
  findByCategory(category: string, options?: Omit<AddonQueryOptions, 'category'>): Promise<PagedAddons>;
  
  /**
   * Find add-ons by tags
   * @param tags The tags to search for (AND logic)
   * @param options Additional query options
   * @returns Paged result containing add-ons with all specified tags
   */
  findByTags(tags: string[], options?: Omit<AddonQueryOptions, 'tags'>): Promise<PagedAddons>;
  
  /**
   * Save an add-on
   * @param addon The add-on to save
   * @returns The saved add-on with any auto-generated fields
   */
  save(addon: Addon): Promise<Addon>;
  
  /**
   * Delete an add-on
   * @param id The ID of the add-on to delete
   * @returns True if the add-on was deleted, false if it wasn't found
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Check if an add-on exists
   * @param id The add-on ID
   * @returns True if the add-on exists, false otherwise
   */
  exists(id: string): Promise<boolean>;
  
  /**
   * Count add-ons that match the specified criteria
   * @param options Query options for filtering
   * @returns The count of matching add-ons
   */
  count(options?: Partial<AddonQueryOptions>): Promise<number>;
}