/**
 * Add-on Entity
 * 
 * This entity represents an add-on service or product that can be bundled with
 * yacht experiences. It encapsulates all data and behavior related to add-ons.
 */

import { AddonType, isValidAddonType, getDefaultAddonType } from './addon-type';
import { AddonCategory, StandardAddonCategory } from './addon-category';
import { AddonPricing, PricingModel } from './addon-pricing';

/**
 * Error thrown when addon validation fails
 */
export class AddonError extends Error {
  constructor(message: string) {
    super(`Addon Error: ${message}`);
    this.name = 'AddonError';
  }
}

/**
 * Media item for an add-on
 */
export interface AddonMedia {
  type: 'image' | 'video';
  url: string;
  title?: string;
  sortOrder?: number;
}

/**
 * Addon entity
 * Represents a service or product add-on that can be bundled with yacht experiences
 */
export class Addon {
  private readonly _id: string;
  private _productId: string;
  private _name: string;
  private _description: string;
  private _type: AddonType;
  private _category: AddonCategory;
  private _pricing: AddonPricing;
  private _media: AddonMedia[];
  private _mainImageUrl?: string;
  private _isAvailable: boolean;
  private _tags: string[];
  private _partnerId?: string;
  private _createdAt: Date;
  private _updatedAt: Date;
  
  /**
   * Create a new Addon
   * @param params The addon parameters
   */
  constructor(params: {
    id: string;
    productId?: string;
    name: string;
    description: string;
    type?: AddonType | string;
    category?: string;
    pricing: {
      basePrice: number;
      commissionRate: number;
      model?: PricingModel;
      maxQuantity?: number;
    };
    media?: AddonMedia[];
    mainImageUrl?: string;
    isAvailable?: boolean;
    tags?: string[];
    partnerId?: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    // Required fields
    this._id = this.validateId(params.id);
    this._productId = params.productId || params.id;
    this._name = this.validateName(params.name);
    this._description = this.validateDescription(params.description);
    
    // Type and category
    this._type = this.validateType(params.type);
    this._category = new AddonCategory(params.category || StandardAddonCategory.OTHER);
    
    // Pricing
    this._pricing = new AddonPricing(
      params.pricing.basePrice,
      params.pricing.commissionRate,
      params.pricing.model || PricingModel.FIXED,
      [],
      params.pricing.maxQuantity
    );
    
    // Media
    this._media = this.validateMedia(params.media || []);
    this._mainImageUrl = params.mainImageUrl || this.findMainImageUrl();
    
    // Additional fields
    this._isAvailable = params.isAvailable !== undefined ? !!params.isAvailable : true;
    this._tags = params.tags || [];
    this._partnerId = params.partnerId;
    
    // Timestamps
    this._createdAt = params.createdAt || new Date();
    this._updatedAt = params.updatedAt || new Date();
  }
  
  // Getters
  
  /**
   * Get the addon ID
   */
  get id(): string {
    return this._id;
  }
  
  /**
   * Get the product ID (for backward compatibility)
   */
  get productId(): string {
    return this._productId;
  }
  
  /**
   * Get the addon name
   */
  get name(): string {
    return this._name;
  }
  
  /**
   * Get the addon description
   */
  get description(): string {
    return this._description;
  }
  
  /**
   * Get the addon type
   */
  get type(): AddonType {
    return this._type;
  }
  
  /**
   * Get the addon category
   */
  get category(): AddonCategory {
    return this._category;
  }
  
  /**
   * Get the addon pricing
   */
  get pricing(): AddonPricing {
    return this._pricing;
  }
  
  /**
   * Get the addon media (returns a copy to maintain immutability)
   */
  get media(): AddonMedia[] {
    return [...this._media];
  }
  
  /**
   * Get the main image URL
   */
  get mainImageUrl(): string | undefined {
    return this._mainImageUrl;
  }
  
  /**
   * Get the availability status
   */
  get isAvailable(): boolean {
    return this._isAvailable;
  }
  
  /**
   * Get the addon tags (returns a copy to maintain immutability)
   */
  get tags(): string[] {
    return [...this._tags];
  }
  
  /**
   * Get the partner ID
   */
  get partnerId(): string | undefined {
    return this._partnerId;
  }
  
  /**
   * Get the creation date
   */
  get createdAt(): Date {
    return new Date(this._createdAt);
  }
  
  /**
   * Get the last update date
   */
  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }
  
  /**
   * Check if this addon is owned by a partner
   */
  get isPartnerOwned(): boolean {
    return !!this._partnerId;
  }
  
  // State-changing methods
  
  /**
   * Update the addon name
   * @param name The new name
   */
  updateName(name: string): void {
    this._name = this.validateName(name);
    this._updatedAt = new Date();
  }
  
  /**
   * Update the addon description
   * @param description The new description
   */
  updateDescription(description: string): void {
    this._description = this.validateDescription(description);
    this._updatedAt = new Date();
  }
  
  /**
   * Update the addon category
   * @param category The new category
   */
  updateCategory(category: string): void {
    this._category = new AddonCategory(category);
    this._updatedAt = new Date();
  }
  
  /**
   * Update the addon pricing
   * @param pricing The new pricing parameters
   */
  updatePricing(pricing: {
    basePrice: number;
    commissionRate: number;
    model?: PricingModel;
    maxQuantity?: number;
  }): void {
    this._pricing = new AddonPricing(
      pricing.basePrice,
      pricing.commissionRate,
      pricing.model || this._pricing.model,
      this._pricing.pricingTiers,
      pricing.maxQuantity !== undefined ? pricing.maxQuantity : this._pricing.maxQuantity
    );
    this._updatedAt = new Date();
  }
  
  /**
   * Update the addon media
   * @param media The new media array
   */
  updateMedia(media: AddonMedia[]): void {
    this._media = this.validateMedia(media);
    this._mainImageUrl = this.findMainImageUrl();
    this._updatedAt = new Date();
  }
  
  /**
   * Add a media item
   * @param media The media item to add
   */
  addMedia(media: AddonMedia): void {
    this._media = this.validateMedia([...this._media, media]);
    if (!this._mainImageUrl && media.type === 'image') {
      this._mainImageUrl = media.url;
    }
    this._updatedAt = new Date();
  }
  
  /**
   * Remove a media item by URL
   * @param url The URL of the media item to remove
   * @returns True if the media item was removed, false otherwise
   */
  removeMedia(url: string): boolean {
    const initialLength = this._media.length;
    this._media = this._media.filter(item => item.url !== url);
    
    if (this._media.length < initialLength) {
      // If we removed the main image, update it
      if (this._mainImageUrl === url) {
        this._mainImageUrl = this.findMainImageUrl();
      }
      
      this._updatedAt = new Date();
      return true;
    }
    
    return false;
  }
  
  /**
   * Set the main image URL
   * @param url The URL of the image to set as main
   * @returns True if the main image was set, false otherwise
   */
  setMainImage(url: string): boolean {
    // Verify that the URL exists in the media array and is an image
    const mediaItem = this._media.find(item => item.url === url);
    if (!mediaItem || mediaItem.type !== 'image') {
      return false;
    }
    
    this._mainImageUrl = url;
    this._updatedAt = new Date();
    return true;
  }
  
  /**
   * Set the availability status
   * @param isAvailable The new availability status
   */
  setAvailability(isAvailable: boolean): void {
    this._isAvailable = !!isAvailable;
    this._updatedAt = new Date();
  }
  
  /**
   * Add a tag
   * @param tag The tag to add
   * @returns True if the tag was added, false if it already exists
   */
  addTag(tag: string): boolean {
    if (!tag || typeof tag !== 'string' || tag.trim() === '') {
      return false;
    }
    
    const normalizedTag = tag.trim().toLowerCase();
    if (this._tags.some(t => t.toLowerCase() === normalizedTag)) {
      return false;
    }
    
    this._tags.push(tag.trim());
    this._updatedAt = new Date();
    return true;
  }
  
  /**
   * Remove a tag
   * @param tag The tag to remove
   * @returns True if the tag was removed, false otherwise
   */
  removeTag(tag: string): boolean {
    if (!tag || typeof tag !== 'string') {
      return false;
    }
    
    const normalizedTag = tag.trim().toLowerCase();
    const initialLength = this._tags.length;
    this._tags = this._tags.filter(t => t.toLowerCase() !== normalizedTag);
    
    if (this._tags.length < initialLength) {
      this._updatedAt = new Date();
      return true;
    }
    
    return false;
  }
  
  // Validation methods
  
  /**
   * Validate the addon ID
   * @param id The ID to validate
   * @returns The validated ID
   */
  private validateId(id: string): string {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new AddonError('Addon ID is required');
    }
    return id.trim();
  }
  
  /**
   * Validate the addon name
   * @param name The name to validate
   * @returns The validated name
   */
  private validateName(name: string): string {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new AddonError('Addon name is required');
    }
    
    const trimmed = name.trim();
    if (trimmed.length < 3) {
      throw new AddonError('Addon name must be at least 3 characters long');
    }
    
    if (trimmed.length > 100) {
      throw new AddonError('Addon name cannot exceed 100 characters');
    }
    
    return trimmed;
  }
  
  /**
   * Validate the addon description
   * @param description The description to validate
   * @returns The validated description
   */
  private validateDescription(description: string): string {
    if (!description || typeof description !== 'string') {
      return '';
    }
    
    const trimmed = description.trim();
    if (trimmed.length > 1000) {
      throw new AddonError('Addon description cannot exceed 1000 characters');
    }
    
    return trimmed;
  }
  
  /**
   * Validate the addon type
   * @param type The type to validate
   * @returns The validated type
   */
  private validateType(type?: AddonType | string): AddonType {
    if (!type) {
      return getDefaultAddonType();
    }
    
    if (typeof type === 'string' && isValidAddonType(type)) {
      return type as AddonType;
    }
    
    return getDefaultAddonType();
  }
  
  /**
   * Validate the addon media
   * @param media The media array to validate
   * @returns The validated media array
   */
  private validateMedia(media: AddonMedia[]): AddonMedia[] {
    if (!Array.isArray(media)) {
      return [];
    }
    
    return media.filter(item => {
      // Must have a valid type and URL
      if (!item || !item.url || typeof item.url !== 'string' || item.url.trim() === '') {
        return false;
      }
      
      if (item.type !== 'image' && item.type !== 'video') {
        return false;
      }
      
      return true;
    }).map(item => ({
      type: item.type,
      url: item.url.trim(),
      title: item.title ? item.title.trim() : undefined,
      sortOrder: typeof item.sortOrder === 'number' ? item.sortOrder : undefined
    }));
  }
  
  /**
   * Find the main image URL from the media array
   * @returns The URL of the first image in the media array, or undefined if none exist
   */
  private findMainImageUrl(): string | undefined {
    const firstImage = this._media.find(item => item.type === 'image');
    return firstImage?.url;
  }
  
  /**
   * Create an addon reference for bundling with yacht experiences
   * @param isRequired Whether this add-on is mandatory for the experience
   * @returns An object with add-on reference data
   */
  createReference(isRequired: boolean = false): {
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
  } {
    return {
      addOnId: this._productId,
      partnerId: this._partnerId,
      name: this._name,
      description: this._description || undefined,
      pricing: this._pricing.basePrice,
      isRequired,
      commissionRate: this._pricing.commissionRate,
      maxQuantity: this._pricing.maxQuantity,
      category: this._category.value,
      mediaUrl: this._mainImageUrl
    };
  }
  
  /**
   * Convert the addon to a plain object representation
   * @returns A plain object representation of the addon
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      productId: this._productId,
      name: this._name,
      description: this._description,
      type: this._type,
      category: this._category.value,
      pricing: this._pricing.basePrice,
      commissionRate: this._pricing.commissionRate,
      pricingModel: this._pricing.model,
      maxQuantity: this._pricing.maxQuantity,
      media: this._media,
      mainImageUrl: this._mainImageUrl,
      isAvailable: this._isAvailable,
      tags: this._tags,
      partnerId: this._partnerId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      
      // Legacy fields for backward compatibility
      availability: this._isAvailable,
      createdDate: this._createdAt,
      lastUpdatedDate: this._updatedAt
    };
  }
}