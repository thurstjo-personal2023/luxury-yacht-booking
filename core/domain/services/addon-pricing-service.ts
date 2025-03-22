/**
 * Add-on Pricing Service Interface
 * 
 * This interface defines the domain service for add-on pricing operations.
 * It provides business logic related to pricing, discounts, and commissions.
 */

import { Addon } from '../addon/addon';
import { AddonBundle } from '../addon/addon-bundle';
import { PricingModel } from '../addon/addon-pricing';

/**
 * Discount calculation options
 */
export interface DiscountOptions {
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minimumPurchase?: number;
  maximumDiscount?: number;
}

/**
 * Commission calculation result
 */
export interface CommissionResult {
  totalCommission: number;
  commissionByPartner: { [partnerId: string]: number };
}

/**
 * Pricing calculation result
 */
export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  total: number;
  commissions: CommissionResult;
}

/**
 * Add-on Pricing Service interface
 * Provides domain-level operations for pricing calculations
 */
export interface IAddonPricingService {
  /**
   * Calculate the price for an add-on
   * @param addon The add-on
   * @param quantity The quantity
   * @param customPrice Optional custom price to override the add-on's base price
   * @returns The calculated price
   */
  calculateAddonPrice(
    addon: Addon,
    quantity: number,
    customPrice?: number
  ): number;
  
  /**
   * Calculate the commission for an add-on
   * @param addon The add-on
   * @param price The price (after any custom price adjustments)
   * @param customCommissionRate Optional custom commission rate
   * @returns The calculated commission
   */
  calculateAddonCommission(
    addon: Addon,
    price: number,
    customCommissionRate?: number
  ): number;
  
  /**
   * Calculate pricing for a bundle of add-ons
   * @param bundle The add-on bundle
   * @param options Optional calculation options
   * @returns The pricing result
   */
  calculateBundlePricing(
    bundle: AddonBundle,
    options?: {
      includeOptional?: boolean;
      selectedOptionalIds?: string[];
      quantity?: number;
      discountOptions?: DiscountOptions;
    }
  ): PricingResult;
  
  /**
   * Apply a discount to a price
   * @param price The original price
   * @param options The discount options
   * @returns The discounted price
   */
  applyDiscount(
    price: number,
    options: DiscountOptions
  ): { 
    originalPrice: number;
    discountAmount: number;
    finalPrice: number;
  };
  
  /**
   * Suggest optimal pricing model for an add-on
   * @param addon The add-on
   * @param historicalPurchaseData Optional historical purchase data
   * @returns The recommended pricing model
   */
  suggestPricingModel(
    addon: Addon,
    historicalPurchaseData?: any[]
  ): PricingModel;
  
  /**
   * Calculate the commission split for a multi-partner experience
   * @param totalCommission The total commission amount
   * @param partnerContributions Map of partner IDs to their contribution percentage
   * @returns Map of partner IDs to their commission amount
   */
  calculateCommissionSplit(
    totalCommission: number,
    partnerContributions: Map<string, number>
  ): Map<string, number>;
  
  /**
   * Validate a commission rate
   * @param commissionRate The commission rate to validate
   * @param partnerId Optional partner ID for partner-specific validation
   * @returns True if valid, false otherwise with error message
   */
  validateCommissionRate(
    commissionRate: number,
    partnerId?: string
  ): { isValid: boolean; error?: string };
}