/**
 * Mock Addon Bundle Repository
 * 
 * This class provides a mock implementation of the IAddonBundleRepository interface
 * for testing bundling use cases without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IAddonBundleRepository } from '../../../../core/application/ports/repositories/addon-bundle-repository';
import { AddonBundle } from '../../../../core/domain/addon/addon-bundle';
import { BundleQueryOptions, PagedBundles } from '../../../../core/application/ports/repositories/addon-bundle-repository';

export class MockAddonBundleRepository extends BaseMockRepository implements IAddonBundleRepository {
  // In-memory storage for addon bundles
  private bundles: Map<string, AddonBundle> = new Map();
  
  /**
   * Create a new addon bundle
   * @param bundle Addon bundle to create
   */
  async create(bundle: AddonBundle): Promise<string> {
    return this.executeMethod<string>('create', [bundle], () => {
      const id = bundle.id || `mock-bundle-${Date.now()}`;
      this.bundles.set(id, {...bundle, id});
      return id;
    });
  }
  
  /**
   * Get an addon bundle by ID
   * @param id Bundle ID
   */
  async getById(id: string): Promise<AddonBundle | null> {
    return this.executeMethod<AddonBundle | null>('getById', [id], () => {
      return this.bundles.has(id) ? this.bundles.get(id) || null : null;
    });
  }
  
  /**
   * Get a bundle by yacht/experience ID
   * @param yachtId Yacht/experience ID
   */
  async getByYachtId(yachtId: string): Promise<AddonBundle | null> {
    return this.executeMethod<AddonBundle | null>('getByYachtId', [yachtId], () => {
      const bundle = Array.from(this.bundles.values())
        .find(b => b.experienceId === yachtId);
      
      return bundle || null;
    });
  }
  
  /**
   * Get bundles by experience ID
   * @param experienceId Experience ID
   */
  async getByExperienceId(experienceId: string): Promise<AddonBundle | null> {
    return this.executeMethod<AddonBundle | null>('getByExperienceId', [experienceId], () => {
      const bundle = Array.from(this.bundles.values())
        .find(b => b.experienceId === experienceId);
      
      return bundle || null;
    });
  }
  
  /**
   * Update an existing addon bundle
   * @param id Bundle ID
   * @param bundle Updated bundle data
   */
  async update(id: string, bundle: Partial<AddonBundle>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, bundle], () => {
      if (!this.bundles.has(id)) {
        return false;
      }
      
      const existingBundle = this.bundles.get(id);
      if (!existingBundle) return false;
      
      this.bundles.set(id, { ...existingBundle, ...bundle, id });
      return true;
    });
  }
  
  /**
   * Update a bundle by yacht/experience ID
   * @param yachtId Yacht/experience ID
   * @param bundle Updated bundle data
   */
  async updateByYachtId(yachtId: string, bundle: Partial<AddonBundle>): Promise<boolean> {
    return this.executeMethod<boolean>('updateByYachtId', [yachtId, bundle], () => {
      const existingBundle = Array.from(this.bundles.values())
        .find(b => b.experienceId === yachtId);
      
      if (!existingBundle) {
        return false;
      }
      
      this.bundles.set(existingBundle.id, { ...existingBundle, ...bundle });
      return true;
    });
  }
  
  /**
   * Delete an addon bundle
   * @param id Bundle ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      if (!this.bundles.has(id)) {
        return false;
      }
      
      return this.bundles.delete(id);
    });
  }
  
  /**
   * Delete a bundle by yacht/experience ID
   * @param yachtId Yacht/experience ID 
   */
  async deleteByYachtId(yachtId: string): Promise<boolean> {
    return this.executeMethod<boolean>('deleteByYachtId', [yachtId], () => {
      const bundleId = Array.from(this.bundles.entries())
        .find(([_, bundle]) => bundle.experienceId === yachtId)?.[0];
      
      if (!bundleId) {
        return false;
      }
      
      return this.bundles.delete(bundleId);
    });
  }
  
  /**
   * Find bundles that include a specific addon
   * @param addonId Addon ID
   * @param options Query options
   */
  async findByAddonId(addonId: string, options?: BundleQueryOptions): Promise<PagedBundles> {
    return this.executeMethod<PagedBundles>('findByAddonId', [addonId, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const matchingBundles = Array.from(this.bundles.values())
        .filter(bundle => {
          const hasIncludedAddon = bundle.includedAddOns?.some(addon => addon.addOnId === addonId);
          const hasOptionalAddon = bundle.optionalAddOns?.some(addon => addon.addOnId === addonId);
          return hasIncludedAddon || hasOptionalAddon;
        });
      
      const totalCount = matchingBundles.length;
      const startIndex = (page - 1) * pageSize;
      const items = matchingBundles.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Find bundles created by a specific partner
   * @param partnerId Partner ID
   * @param options Query options
   */
  async findByPartnerId(partnerId: string, options?: BundleQueryOptions): Promise<PagedBundles> {
    return this.executeMethod<PagedBundles>('findByPartnerId', [partnerId, options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      const partnerBundles = Array.from(this.bundles.values())
        .filter(bundle => {
          const hasPartnerIncludedAddon = bundle.includedAddOns?.some(addon => 
            addon.partnerId === partnerId
          );
          const hasPartnerOptionalAddon = bundle.optionalAddOns?.some(addon => 
            addon.partnerId === partnerId
          );
          return hasPartnerIncludedAddon || hasPartnerOptionalAddon;
        });
      
      const totalCount = partnerBundles.length;
      const startIndex = (page - 1) * pageSize;
      const items = partnerBundles.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Check if a bundle exists for a yacht
   * @param yachtId Yacht ID
   */
  async exists(yachtId: string): Promise<boolean> {
    return this.executeMethod<boolean>('exists', [yachtId], () => {
      return Array.from(this.bundles.values())
        .some(bundle => bundle.experienceId === yachtId);
    });
  }
  
  /**
   * Count bundles matching criteria
   * @param options Query options
   */
  async count(options?: BundleQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredBundles = Array.from(this.bundles.values());
      
      // Apply filters
      if (options?.experienceId) {
        filteredBundles = filteredBundles.filter(bundle => 
          bundle.experienceId === options.experienceId
        );
      }
      
      if (options?.addonId) {
        filteredBundles = filteredBundles.filter(bundle => {
          const hasIncludedAddon = bundle.includedAddOns?.some(addon => 
            addon.addOnId === options.addonId
          );
          const hasOptionalAddon = bundle.optionalAddOns?.some(addon => 
            addon.addOnId === options.addonId
          );
          return hasIncludedAddon || hasOptionalAddon;
        });
      }
      
      if (options?.partnerId) {
        filteredBundles = filteredBundles.filter(bundle => {
          const hasPartnerIncludedAddon = bundle.includedAddOns?.some(addon => 
            addon.partnerId === options.partnerId
          );
          const hasPartnerOptionalAddon = bundle.optionalAddOns?.some(addon => 
            addon.partnerId === options.partnerId
          );
          return hasPartnerIncludedAddon || hasPartnerOptionalAddon;
        });
      }
      
      return filteredBundles.length;
    });
  }
  
  /**
   * Set mock bundles for testing
   * @param bundles Array of bundles to use as mock data
   */
  setMockBundles(bundles: AddonBundle[]): void {
    this.bundles.clear();
    for (const bundle of bundles) {
      this.bundles.set(bundle.id, bundle);
    }
  }
  
  /**
   * Clear all mock bundles
   */
  clearMockBundles(): void {
    this.bundles.clear();
  }
}