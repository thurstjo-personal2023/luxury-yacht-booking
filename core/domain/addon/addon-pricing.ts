/**
 * Add-on Pricing Value Object
 * 
 * This value object represents the pricing information for an add-on, including
 * base price, commission rate, and optional quantity-based pricing rules.
 */

/**
 * Error thrown when addon pricing validation fails
 */
export class AddonPricingError extends Error {
  constructor(message: string) {
    super(`Addon Pricing Error: ${message}`);
    this.name = 'AddonPricingError';
  }
}

/**
 * Quantity-based pricing tier
 */
export interface PricingTier {
  minQuantity: number;
  price: number;
}

/**
 * Pricing model for add-ons
 */
export enum PricingModel {
  /**
   * Fixed pricing - same price regardless of quantity
   */
  FIXED = 'fixed',
  
  /**
   * Per-person pricing - price is multiplied by the number of people
   */
  PER_PERSON = 'per_person',
  
  /**
   * Tiered pricing - price changes based on quantity tiers
   */
  TIERED = 'tiered'
}

/**
 * AddonPricing value object
 * Represents the pricing details for an add-on
 */
export class AddonPricing {
  private readonly _basePrice: number;
  private readonly _commissionRate: number;
  private readonly _model: PricingModel;
  private readonly _pricingTiers: PricingTier[];
  private readonly _maxQuantity?: number;
  
  /**
   * Create a new AddonPricing
   * @param basePrice The base price of the add-on
   * @param commissionRate The commission rate for the add-on (percentage)
   * @param model The pricing model (fixed, per-person, tiered)
   * @param pricingTiers Optional pricing tiers for tiered pricing
   * @param maxQuantity Optional maximum quantity that can be purchased
   */
  constructor(
    basePrice: number,
    commissionRate: number,
    model: PricingModel = PricingModel.FIXED,
    pricingTiers: PricingTier[] = [],
    maxQuantity?: number
  ) {
    // Validate inputs
    this.validateBasePrice(basePrice);
    this.validateCommissionRate(commissionRate);
    this.validatePricingTiers(pricingTiers, model);
    this.validateMaxQuantity(maxQuantity);
    
    // Set properties
    this._basePrice = basePrice;
    this._commissionRate = commissionRate;
    this._model = model;
    this._pricingTiers = model === PricingModel.TIERED ? [...pricingTiers] : [];
    this._maxQuantity = maxQuantity;
  }
  
  /**
   * Get the base price
   */
  get basePrice(): number {
    return this._basePrice;
  }
  
  /**
   * Get the commission rate
   */
  get commissionRate(): number {
    return this._commissionRate;
  }
  
  /**
   * Get the pricing model
   */
  get model(): PricingModel {
    return this._model;
  }
  
  /**
   * Get the pricing tiers (returns a copy to maintain immutability)
   */
  get pricingTiers(): PricingTier[] {
    return [...this._pricingTiers];
  }
  
  /**
   * Get the maximum quantity
   */
  get maxQuantity(): number | undefined {
    return this._maxQuantity;
  }
  
  /**
   * Calculate the price for a given quantity
   * @param quantity The quantity to calculate the price for
   * @returns The calculated price
   */
  calculatePrice(quantity: number = 1): number {
    if (quantity <= 0) {
      throw new AddonPricingError('Quantity must be greater than 0');
    }
    
    if (this._maxQuantity !== undefined && quantity > this._maxQuantity) {
      throw new AddonPricingError(`Quantity exceeds maximum allowed (${this._maxQuantity})`);
    }
    
    switch (this._model) {
      case PricingModel.FIXED:
        return this._basePrice;
        
      case PricingModel.PER_PERSON:
        return this._basePrice * quantity;
        
      case PricingModel.TIERED:
        if (this._pricingTiers.length === 0) {
          return this._basePrice * quantity;
        }
        
        // Find applicable tier
        const applicableTier = [...this._pricingTiers]
          .sort((a, b) => b.minQuantity - a.minQuantity)
          .find(tier => quantity >= tier.minQuantity);
          
        return applicableTier ? applicableTier.price : this._basePrice * quantity;
        
      default:
        return this._basePrice;
    }
  }
  
  /**
   * Calculate the commission amount for a given quantity
   * @param quantity The quantity to calculate the commission for
   * @returns The calculated commission amount
   */
  calculateCommission(quantity: number = 1): number {
    const price = this.calculatePrice(quantity);
    return (price * this._commissionRate) / 100;
  }
  
  /**
   * Calculate the net price (after commission) for a given quantity
   * @param quantity The quantity to calculate the net price for
   * @returns The calculated net price
   */
  calculateNetPrice(quantity: number = 1): number {
    const price = this.calculatePrice(quantity);
    const commission = this.calculateCommission(quantity);
    return price - commission;
  }
  
  /**
   * Validate the base price
   * @param price The price to validate
   */
  private validateBasePrice(price: number): void {
    if (typeof price !== 'number' || isNaN(price)) {
      throw new AddonPricingError('Base price must be a valid number');
    }
    
    if (price < 0) {
      throw new AddonPricingError('Base price cannot be negative');
    }
  }
  
  /**
   * Validate the commission rate
   * @param rate The commission rate to validate
   */
  private validateCommissionRate(rate: number): void {
    if (typeof rate !== 'number' || isNaN(rate)) {
      throw new AddonPricingError('Commission rate must be a valid number');
    }
    
    if (rate < 0 || rate > 100) {
      throw new AddonPricingError('Commission rate must be between 0 and 100');
    }
  }
  
  /**
   * Validate the pricing tiers
   * @param tiers The pricing tiers to validate
   * @param model The pricing model
   */
  private validatePricingTiers(tiers: PricingTier[], model: PricingModel): void {
    if (model !== PricingModel.TIERED || !tiers || tiers.length === 0) {
      return;
    }
    
    // Check tier structure
    for (const tier of tiers) {
      if (typeof tier.minQuantity !== 'number' || tier.minQuantity <= 0) {
        throw new AddonPricingError('Tier minimum quantity must be a positive number');
      }
      
      if (typeof tier.price !== 'number' || tier.price < 0) {
        throw new AddonPricingError('Tier price must be a non-negative number');
      }
    }
    
    // Check for duplicate minimum quantities
    const minQuantities = tiers.map(tier => tier.minQuantity);
    if (new Set(minQuantities).size !== minQuantities.length) {
      throw new AddonPricingError('Duplicate minimum quantities in pricing tiers');
    }
  }
  
  /**
   * Validate the maximum quantity
   * @param maxQuantity The maximum quantity to validate
   */
  private validateMaxQuantity(maxQuantity?: number): void {
    if (maxQuantity === undefined) {
      return;
    }
    
    if (typeof maxQuantity !== 'number' || maxQuantity <= 0 || !Number.isInteger(maxQuantity)) {
      throw new AddonPricingError('Maximum quantity must be a positive integer');
    }
  }
}