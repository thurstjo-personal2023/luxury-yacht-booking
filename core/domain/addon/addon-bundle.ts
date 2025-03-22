/**
 * Add-on Bundle Entity
 * 
 * This entity represents a bundle of add-ons associated with a yacht experience.
 * It includes both required (included) and optional add-ons.
 */

import { AddonError } from './addon';

/**
 * Reference to an add-on that can be bundled with a yacht experience
 */
export interface AddonReference {
  addOnId: string;
  partnerId?: string;
  name: string;
  description?: string;
  pricing: number;
  isRequired: boolean;
  commissionRate: number;
  maxQuantity?: number;
  category?: string;
  mediaUrl?: string;
}

/**
 * Pricing information for the add-on bundle
 */
export interface BundlePricing {
  // Total price of all required add-ons
  requiredAddonsTotal: number;
  
  // Total price if all optional add-ons are selected
  optionalAddonsTotal: number;
  
  // Total partner commission on all required add-ons
  requiredCommissionTotal: number;
  
  // Total partner commission if all optional add-ons are selected
  optionalCommissionTotal: number;
}

/**
 * AddonBundle entity
 * Represents a collection of add-ons bundled with a yacht experience
 */
export class AddonBundle {
  private readonly _experienceId: string;
  private _includedAddons: AddonReference[];
  private _optionalAddons: AddonReference[];
  
  /**
   * Create a new AddonBundle
   * @param experienceId The ID of the yacht experience
   * @param includedAddons The included (required) add-ons
   * @param optionalAddons The optional add-ons
   */
  constructor(
    experienceId: string,
    includedAddons: AddonReference[] = [],
    optionalAddons: AddonReference[] = []
  ) {
    this._experienceId = this.validateExperienceId(experienceId);
    this._includedAddons = this.validateAddons(includedAddons, true);
    this._optionalAddons = this.validateAddons(optionalAddons, false);
    
    // Ensure there are no duplicates across both arrays
    this.validateNoDuplicates();
  }
  
  /**
   * Get the experience ID
   */
  get experienceId(): string {
    return this._experienceId;
  }
  
  /**
   * Get the included add-ons (returns a copy to maintain immutability)
   */
  get includedAddons(): AddonReference[] {
    return [...this._includedAddons];
  }
  
  /**
   * Get the optional add-ons (returns a copy to maintain immutability)
   */
  get optionalAddons(): AddonReference[] {
    return [...this._optionalAddons];
  }
  
  /**
   * Get all add-ons (both included and optional)
   */
  get allAddons(): AddonReference[] {
    return [...this._includedAddons, ...this._optionalAddons];
  }
  
  /**
   * Get the count of included add-ons
   */
  get includedCount(): number {
    return this._includedAddons.length;
  }
  
  /**
   * Get the count of optional add-ons
   */
  get optionalCount(): number {
    return this._optionalAddons.length;
  }
  
  /**
   * Get the total count of all add-ons
   */
  get totalCount(): number {
    return this.includedCount + this.optionalCount;
  }
  
  /**
   * Get the pricing information for the bundle
   */
  get pricing(): BundlePricing {
    const requiredAddonsTotal = this._includedAddons.reduce(
      (sum, addon) => sum + addon.pricing,
      0
    );
    
    const optionalAddonsTotal = this._optionalAddons.reduce(
      (sum, addon) => sum + addon.pricing,
      0
    );
    
    const requiredCommissionTotal = this._includedAddons.reduce(
      (sum, addon) => sum + (addon.pricing * addon.commissionRate / 100),
      0
    );
    
    const optionalCommissionTotal = this._optionalAddons.reduce(
      (sum, addon) => sum + (addon.pricing * addon.commissionRate / 100),
      0
    );
    
    return {
      requiredAddonsTotal,
      optionalAddonsTotal,
      requiredCommissionTotal,
      optionalCommissionTotal
    };
  }
  
  /**
   * Add an included add-on
   * @param addon The add-on to add
   * @returns True if the add-on was added, false if it already exists
   */
  addIncludedAddon(addon: AddonReference): boolean {
    // Ensure add-on isn't already in either array
    if (this.hasAddon(addon.addOnId)) {
      return false;
    }
    
    // Validate and add the add-on
    const validatedAddon = this.validateAddon(addon, true);
    this._includedAddons.push(validatedAddon);
    return true;
  }
  
  /**
   * Add an optional add-on
   * @param addon The add-on to add
   * @returns True if the add-on was added, false if it already exists
   */
  addOptionalAddon(addon: AddonReference): boolean {
    // Ensure add-on isn't already in either array
    if (this.hasAddon(addon.addOnId)) {
      return false;
    }
    
    // Validate and add the add-on
    const validatedAddon = this.validateAddon(addon, false);
    this._optionalAddons.push(validatedAddon);
    return true;
  }
  
  /**
   * Remove an add-on
   * @param addonId The ID of the add-on to remove
   * @returns True if the add-on was removed, false if it wasn't found
   */
  removeAddon(addonId: string): boolean {
    const includedIndex = this._includedAddons.findIndex(addon => addon.addOnId === addonId);
    if (includedIndex !== -1) {
      this._includedAddons.splice(includedIndex, 1);
      return true;
    }
    
    const optionalIndex = this._optionalAddons.findIndex(addon => addon.addOnId === addonId);
    if (optionalIndex !== -1) {
      this._optionalAddons.splice(optionalIndex, 1);
      return true;
    }
    
    return false;
  }
  
  /**
   * Move an add-on from included to optional
   * @param addonId The ID of the add-on to move
   * @returns True if the add-on was moved, false if it wasn't found
   */
  moveToOptional(addonId: string): boolean {
    const includedIndex = this._includedAddons.findIndex(addon => addon.addOnId === addonId);
    if (includedIndex === -1) {
      return false;
    }
    
    const addon = { ...this._includedAddons[includedIndex], isRequired: false };
    this._includedAddons.splice(includedIndex, 1);
    this._optionalAddons.push(addon);
    return true;
  }
  
  /**
   * Move an add-on from optional to included
   * @param addonId The ID of the add-on to move
   * @returns True if the add-on was moved, false if it wasn't found
   */
  moveToIncluded(addonId: string): boolean {
    const optionalIndex = this._optionalAddons.findIndex(addon => addon.addOnId === addonId);
    if (optionalIndex === -1) {
      return false;
    }
    
    const addon = { ...this._optionalAddons[optionalIndex], isRequired: true };
    this._optionalAddons.splice(optionalIndex, 1);
    this._includedAddons.push(addon);
    return true;
  }
  
  /**
   * Update an add-on's properties
   * @param addonId The ID of the add-on to update
   * @param updates The updates to apply
   * @returns True if the add-on was updated, false if it wasn't found
   */
  updateAddon(addonId: string, updates: Partial<Omit<AddonReference, 'addOnId' | 'isRequired'>>): boolean {
    // Check included add-ons
    const includedIndex = this._includedAddons.findIndex(addon => addon.addOnId === addonId);
    if (includedIndex !== -1) {
      this._includedAddons[includedIndex] = {
        ...this._includedAddons[includedIndex],
        ...updates
      };
      return true;
    }
    
    // Check optional add-ons
    const optionalIndex = this._optionalAddons.findIndex(addon => addon.addOnId === addonId);
    if (optionalIndex !== -1) {
      this._optionalAddons[optionalIndex] = {
        ...this._optionalAddons[optionalIndex],
        ...updates
      };
      return true;
    }
    
    return false;
  }
  
  /**
   * Check if the bundle has a specific add-on
   * @param addonId The ID of the add-on to check for
   * @returns True if the add-on exists in the bundle, false otherwise
   */
  hasAddon(addonId: string): boolean {
    return this._includedAddons.some(addon => addon.addOnId === addonId) ||
           this._optionalAddons.some(addon => addon.addOnId === addonId);
  }
  
  /**
   * Get a specific add-on
   * @param addonId The ID of the add-on to get
   * @returns The add-on or undefined if not found
   */
  getAddon(addonId: string): AddonReference | undefined {
    return this._includedAddons.find(addon => addon.addOnId === addonId) ||
           this._optionalAddons.find(addon => addon.addOnId === addonId);
  }
  
  /**
   * Check if an add-on is included (required)
   * @param addonId The ID of the add-on to check
   * @returns True if the add-on is included, false otherwise
   */
  isIncluded(addonId: string): boolean {
    return this._includedAddons.some(addon => addon.addOnId === addonId);
  }
  
  /**
   * Check if an add-on is optional
   * @param addonId The ID of the add-on to check
   * @returns True if the add-on is optional, false otherwise
   */
  isOptional(addonId: string): boolean {
    return this._optionalAddons.some(addon => addon.addOnId === addonId);
  }
  
  /**
   * Validate the experience ID
   * @param id The ID to validate
   * @returns The validated ID
   */
  private validateExperienceId(id: string): string {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new AddonError('Experience ID is required');
    }
    return id.trim();
  }
  
  /**
   * Validate an array of add-ons
   * @param addons The add-ons to validate
   * @param isRequired Whether these are required add-ons
   * @returns The validated add-ons array
   */
  private validateAddons(addons: AddonReference[], isRequired: boolean): AddonReference[] {
    if (!Array.isArray(addons)) {
      return [];
    }
    
    return addons.map(addon => this.validateAddon(addon, isRequired));
  }
  
  /**
   * Validate a single add-on
   * @param addon The add-on to validate
   * @param isRequired Whether this add-on is required
   * @returns The validated add-on
   */
  private validateAddon(addon: AddonReference, isRequired: boolean): AddonReference {
    if (!addon.addOnId || typeof addon.addOnId !== 'string' || addon.addOnId.trim() === '') {
      throw new AddonError('Add-on ID is required');
    }
    
    if (!addon.name || typeof addon.name !== 'string' || addon.name.trim() === '') {
      throw new AddonError('Add-on name is required');
    }
    
    if (typeof addon.pricing !== 'number' || isNaN(addon.pricing) || addon.pricing < 0) {
      throw new AddonError('Add-on pricing must be a non-negative number');
    }
    
    if (typeof addon.commissionRate !== 'number' || isNaN(addon.commissionRate) ||
        addon.commissionRate < 0 || addon.commissionRate > 100) {
      throw new AddonError('Commission rate must be between 0 and 100');
    }
    
    // Ensure isRequired matches the collection it's going into
    return {
      ...addon,
      addOnId: addon.addOnId.trim(),
      name: addon.name.trim(),
      description: addon.description ? addon.description.trim() : undefined,
      isRequired
    };
  }
  
  /**
   * Validate that there are no duplicate add-ons across both arrays
   */
  private validateNoDuplicates(): void {
    const allAddonIds = [...this._includedAddons, ...this._optionalAddons].map(addon => addon.addOnId);
    const uniqueAddonIds = new Set(allAddonIds);
    
    if (allAddonIds.length !== uniqueAddonIds.size) {
      throw new AddonError('Duplicate add-ons are not allowed in a bundle');
    }
  }
  
  /**
   * Convert the bundle to a plain object representation
   * @returns A plain object representation of the bundle
   */
  toObject(): {
    experienceId: string;
    includedAddOns: AddonReference[];
    optionalAddOns: AddonReference[];
  } {
    return {
      experienceId: this._experienceId,
      includedAddOns: this._includedAddons,
      optionalAddOns: this._optionalAddons
    };
  }
}