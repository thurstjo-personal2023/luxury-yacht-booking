/**
 * Mock Addon Repository
 * 
 * This class provides a mock implementation of the IAddonRepository interface
 * for testing use cases and controllers without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IAddonRepository } from '../../../../core/application/ports/repositories/addon-repository';
import { Addon } from '../../../../core/domain/addon/addon';
import { AddonType } from '../../../../core/domain/addon/addon-type';
import { PagedAddons } from '../../../../core/application/ports/repositories/addon-repository';
import { AddonQueryOptions } from '../../../../core/application/ports/repositories/addon-repository';

export class MockAddonRepository extends BaseMockRepository implements IAddonRepository {
  // In-memory storage for addons
  private addons: Map<string, Addon> = new Map();
  
  /**
   * Create a new addon
   * @param addon Addon to create
   */
  async create(addon: Addon): Promise<string> {
    return this.executeMethod<string>('create', [addon], () => {
      const id = addon.id || `mock-addon-${Date.now()}`;
      this.addons.set(id, {...addon, id});
      return id;
    });
  }
  
  /**
   * Get an addon by ID
   * @param id Addon ID
   */
  async getById(id: string): Promise<Addon | null> {
    return this.executeMethod<Addon | null>('getById', [id], () => {
      return this.addons.has(id) ? this.addons.get(id) || null : null;
    });
  }
  
  /**
   * Update an existing addon
   * @param id Addon ID
   * @param addon Updated addon data
   */
  async update(id: string, addon: Partial<Addon>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, addon], () => {
      if (!this.addons.has(id)) {
        return false;
      }
      
      const existingAddon = this.addons.get(id);
      if (!existingAddon) return false;
      
      this.addons.set(id, { ...existingAddon, ...addon, id });
      return true;
    });
  }
  
  /**
   * Delete an addon
   * @param id Addon ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      if (!this.addons.has(id)) {
        return false;
      }
      
      return this.addons.delete(id);
    });
  }
  
  /**
   * Find addons by the partner who created them
   * @param partnerId Partner ID
   * @param options Query options for pagination and sorting
   */
  async findByPartnerId(partnerId: string, options?: AddonQueryOptions): Promise<PagedAddons> {
    return this.executeMethod<PagedAddons>('findByPartnerId', [partnerId, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const partnerAddons = Array.from(this.addons.values())
        .filter(addon => addon.partnerId === partnerId);
      
      const totalCount = partnerAddons.length;
      const startIndex = (page - 1) * pageSize;
      const items = partnerAddons.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find addons by their type
   * @param type Addon type (SERVICE or PRODUCT)
   * @param options Query options
   */
  async findByType(type: AddonType, options?: AddonQueryOptions): Promise<PagedAddons> {
    return this.executeMethod<PagedAddons>('findByType', [type, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const typeAddons = Array.from(this.addons.values())
        .filter(addon => addon.type === type);
      
      const totalCount = typeAddons.length;
      const startIndex = (page - 1) * pageSize;
      const items = typeAddons.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find addons by their category
   * @param category Addon category
   * @param options Query options
   */
  async findByCategory(category: string, options?: AddonQueryOptions): Promise<PagedAddons> {
    return this.executeMethod<PagedAddons>('findByCategory', [category, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const categoryAddons = Array.from(this.addons.values())
        .filter(addon => addon.category === category);
      
      const totalCount = categoryAddons.length;
      const startIndex = (page - 1) * pageSize;
      const items = categoryAddons.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find addons by tags
   * @param tags List of tags to match (addon must have ALL tags)
   * @param options Query options
   */
  async findByTags(tags: string[], options?: AddonQueryOptions): Promise<PagedAddons> {
    return this.executeMethod<PagedAddons>('findByTags', [tags, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const taggedAddons = Array.from(this.addons.values())
        .filter(addon => tags.every(tag => addon.tags?.includes(tag)));
      
      const totalCount = taggedAddons.length;
      const startIndex = (page - 1) * pageSize;
      const items = taggedAddons.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Search for addons matching criteria
   * @param options Query options
   */
  async search(options?: AddonQueryOptions): Promise<PagedAddons> {
    return this.executeMethod<PagedAddons>('search', [options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      let filteredAddons = Array.from(this.addons.values());
      
      // Apply filters
      if (options?.type) {
        filteredAddons = filteredAddons.filter(addon => addon.type === options.type);
      }
      
      if (options?.category) {
        filteredAddons = filteredAddons.filter(addon => addon.category === options.category);
      }
      
      if (options?.partnerId) {
        filteredAddons = filteredAddons.filter(addon => addon.partnerId === options.partnerId);
      }
      
      if (options?.query) {
        const query = options.query.toLowerCase();
        filteredAddons = filteredAddons.filter(addon => 
          addon.name.toLowerCase().includes(query) || 
          addon.description.toLowerCase().includes(query)
        );
      }
      
      if (options?.tags && options.tags.length > 0) {
        filteredAddons = filteredAddons.filter(addon => 
          options.tags!.every(tag => addon.tags?.includes(tag))
        );
      }
      
      if (options?.isAvailable !== undefined) {
        filteredAddons = filteredAddons.filter(addon => addon.isAvailable === options.isAvailable);
      }
      
      const totalCount = filteredAddons.length;
      const startIndex = (page - 1) * pageSize;
      const items = filteredAddons.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find addons by their IDs
   * @param ids Array of addon IDs
   */
  async findByIds(ids: string[]): Promise<Addon[]> {
    return this.executeMethod<Addon[]>('findByIds', [ids], () => {
      return ids
        .map(id => this.addons.get(id))
        .filter((addon): addon is Addon => addon !== undefined);
    });
  }
  
  /**
   * Count addons matching criteria
   * @param options Query options
   */
  async count(options?: AddonQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredAddons = Array.from(this.addons.values());
      
      // Apply filters
      if (options?.type) {
        filteredAddons = filteredAddons.filter(addon => addon.type === options.type);
      }
      
      if (options?.category) {
        filteredAddons = filteredAddons.filter(addon => addon.category === options.category);
      }
      
      if (options?.partnerId) {
        filteredAddons = filteredAddons.filter(addon => addon.partnerId === options.partnerId);
      }
      
      if (options?.isAvailable !== undefined) {
        filteredAddons = filteredAddons.filter(addon => addon.isAvailable === options.isAvailable);
      }
      
      return filteredAddons.length;
    });
  }
  
  /**
   * Set mock addons for testing
   * @param addons Array of addons to use as mock data
   */
  setMockAddons(addons: Addon[]): void {
    this.addons.clear();
    for (const addon of addons) {
      this.addons.set(addon.id, addon);
    }
  }
  
  /**
   * Clear all mock addons
   */
  clearMockAddons(): void {
    this.addons.clear();
  }
}