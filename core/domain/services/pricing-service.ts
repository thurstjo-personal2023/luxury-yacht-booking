/**
 * Pricing Service
 * 
 * Domain service for calculating prices and handling pricing logic
 */

import { BookingItem, BookingItemType } from '../booking/booking-item';
import { TimeSlot } from '../booking/time-slot';

/**
 * Discount type
 */
export enum DiscountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage'
}

/**
 * Discount information
 */
export interface Discount {
  type: DiscountType;
  value: number;
  code?: string;
  description?: string;
}

/**
 * Pricing strategy interface
 */
export interface PricingStrategy {
  calculatePrice(basePrice: number, quantity: number, options: Record<string, any>): number;
}

/**
 * Standard pricing strategy - simple multiplication
 */
export class StandardPricingStrategy implements PricingStrategy {
  calculatePrice(basePrice: number, quantity: number, _options: Record<string, any>): number {
    return basePrice * quantity;
  }
}

/**
 * Time-based pricing strategy - adjusts price based on time slot
 */
export class TimeBasedPricingStrategy implements PricingStrategy {
  private morningMultiplier: number;
  private afternoonMultiplier: number;
  private eveningMultiplier: number;
  
  constructor(
    morningMultiplier: number = 0.8,  // Default: 20% discount for morning
    afternoonMultiplier: number = 1.0, // Default: standard price for afternoon
    eveningMultiplier: number = 1.2   // Default: 20% premium for evening
  ) {
    this.morningMultiplier = morningMultiplier;
    this.afternoonMultiplier = afternoonMultiplier;
    this.eveningMultiplier = eveningMultiplier;
  }
  
  calculatePrice(basePrice: number, quantity: number, options: Record<string, any>): number {
    const timeSlot = options.timeSlot as TimeSlot;
    if (!timeSlot) {
      return basePrice * quantity;
    }
    
    let multiplier = this.afternoonMultiplier; // Default
    
    switch (timeSlot.type) {
      case 'morning':
        multiplier = this.morningMultiplier;
        break;
      case 'evening':
        multiplier = this.eveningMultiplier;
        break;
    }
    
    return basePrice * quantity * multiplier;
  }
}

/**
 * Seasonal pricing strategy - adjusts price based on season
 */
export class SeasonalPricingStrategy implements PricingStrategy {
  private seasonalMultipliers: Map<string, number>;
  private defaultMultiplier: number;
  
  constructor(
    seasonalMultipliers: Map<string, number>,
    defaultMultiplier: number = 1.0
  ) {
    this.seasonalMultipliers = seasonalMultipliers;
    this.defaultMultiplier = defaultMultiplier;
  }
  
  calculatePrice(basePrice: number, quantity: number, options: Record<string, any>): number {
    const date = options.date as Date;
    if (!date) {
      return basePrice * quantity * this.defaultMultiplier;
    }
    
    // Determine season based on month
    const month = date.getMonth() + 1; // January is 0
    
    let season = 'regular';
    
    // Example season determination - can be customized
    if ([12, 1, 2].includes(month)) {
      season = 'winter';
    } else if ([6, 7, 8].includes(month)) {
      season = 'summer';
    } else if ([3, 4, 5].includes(month)) {
      season = 'spring';
    } else {
      season = 'fall';
    }
    
    const multiplier = this.seasonalMultipliers.get(season) || this.defaultMultiplier;
    
    return basePrice * quantity * multiplier;
  }
}

/**
 * Pricing service for handling pricing calculations
 */
export class PricingService {
  private pricingStrategy: PricingStrategy;
  
  constructor(pricingStrategy: PricingStrategy = new StandardPricingStrategy()) {
    this.pricingStrategy = pricingStrategy;
  }
  
  /**
   * Set pricing strategy
   */
  setPricingStrategy(strategy: PricingStrategy): void {
    this.pricingStrategy = strategy;
  }
  
  /**
   * Calculate price for a booking item
   */
  calculateItemPrice(
    item: BookingItem,
    options: Record<string, any> = {}
  ): number {
    return this.pricingStrategy.calculatePrice(
      item.unitPrice,
      item.quantity,
      options
    );
  }
  
  /**
   * Calculate total price for booking items
   */
  calculateTotalPrice(
    items: BookingItem[],
    discounts: Discount[] = []
  ): number {
    // Sum all item prices
    const subtotal = items.reduce((total, item) => {
      return total + item.totalPrice;
    }, 0);
    
    // Apply discounts
    const discountAmount = this.calculateDiscountAmount(subtotal, discounts);
    
    return Math.max(0, subtotal - discountAmount);
  }
  
  /**
   * Calculate discount amount based on provided discounts
   */
  private calculateDiscountAmount(subtotal: number, discounts: Discount[]): number {
    if (!discounts || discounts.length === 0) {
      return 0;
    }
    
    return discounts.reduce((totalDiscount, discount) => {
      let discountAmount = 0;
      
      if (discount.type === DiscountType.FIXED) {
        discountAmount = discount.value;
      } else if (discount.type === DiscountType.PERCENTAGE) {
        discountAmount = (subtotal * discount.value) / 100;
      }
      
      return totalDiscount + discountAmount;
    }, 0);
  }
  
  /**
   * Calculate partner commissions
   */
  calculatePartnerCommissions(items: BookingItem[]): Map<string, number> {
    const commissions = new Map<string, number>();
    
    // Filter for partner items (add-ons) with commission
    const partnerItems = items.filter(item => 
      item.isPartnerItem() && 
      item.commissionRate !== undefined && 
      item.commissionAmount !== undefined
    );
    
    // Group by partner ID and sum commissions
    partnerItems.forEach(item => {
      if (item.providerId && item.commissionAmount) {
        const currentAmount = commissions.get(item.providerId) || 0;
        commissions.set(item.providerId, currentAmount + item.commissionAmount);
      }
    });
    
    return commissions;
  }
  
  /**
   * Apply a discount to a booking total
   */
  applyDiscount(
    total: number, 
    discount: Discount
  ): number {
    if (discount.type === DiscountType.FIXED) {
      return Math.max(0, total - discount.value);
    } else {
      const discountAmount = (total * discount.value) / 100;
      return Math.max(0, total - discountAmount);
    }
  }
  
  /**
   * Calculate total with taxes and fees
   */
  calculateTotalWithTaxesAndFees(
    subtotal: number,
    taxRate: number = 0,
    flatFees: number = 0,
    percentageFees: number = 0
  ): {
    subtotal: number;
    taxAmount: number;
    feesAmount: number;
    total: number;
  } {
    const taxAmount = (subtotal * taxRate) / 100;
    const percentageFeeAmount = (subtotal * percentageFees) / 100;
    const feesAmount = flatFees + percentageFeeAmount;
    const total = subtotal + taxAmount + feesAmount;
    
    return {
      subtotal,
      taxAmount,
      feesAmount,
      total
    };
  }
}