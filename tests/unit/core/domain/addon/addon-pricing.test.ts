/**
 * Addon Pricing Tests
 * 
 * Tests for the AddonPricing value object in the domain layer.
 */

import { AddonPricing, PricingModel, AddonPricingError } from '../../../../../core/domain/addon/addon-pricing';

describe('AddonPricing', () => {
  describe('constructor', () => {
    it('should create a valid fixed pricing model', () => {
      const pricing = new AddonPricing(100, 10, PricingModel.FIXED);
      
      expect(pricing.basePrice).toBe(100);
      expect(pricing.commissionRate).toBe(10);
      expect(pricing.model).toBe(PricingModel.FIXED);
      expect(pricing.pricingTiers).toEqual([]);
      expect(pricing.maxQuantity).toBeUndefined();
    });
    
    it('should create a valid per-person pricing model', () => {
      const pricing = new AddonPricing(50, 15, PricingModel.PER_PERSON, [], 10);
      
      expect(pricing.basePrice).toBe(50);
      expect(pricing.commissionRate).toBe(15);
      expect(pricing.model).toBe(PricingModel.PER_PERSON);
      expect(pricing.pricingTiers).toEqual([]);
      expect(pricing.maxQuantity).toBe(10);
    });
    
    it('should create a valid tiered pricing model', () => {
      const tiers = [
        { minQuantity: 1, price: 100 },
        { minQuantity: 5, price: 90 },
        { minQuantity: 10, price: 80 }
      ];
      
      const pricing = new AddonPricing(100, 10, PricingModel.TIERED, tiers);
      
      expect(pricing.basePrice).toBe(100);
      expect(pricing.commissionRate).toBe(10);
      expect(pricing.model).toBe(PricingModel.TIERED);
      expect(pricing.pricingTiers).toEqual(tiers);
    });
    
    it('should throw an error for negative base price', () => {
      expect(() => new AddonPricing(-50, 10)).toThrow(AddonPricingError);
      expect(() => new AddonPricing(-50, 10)).toThrow('Base price cannot be negative');
    });
    
    it('should throw an error for invalid commission rate', () => {
      expect(() => new AddonPricing(100, -10)).toThrow(AddonPricingError);
      expect(() => new AddonPricing(100, -10)).toThrow('Commission rate must be between 0 and 100');
      
      expect(() => new AddonPricing(100, 110)).toThrow(AddonPricingError);
      expect(() => new AddonPricing(100, 110)).toThrow('Commission rate must be between 0 and 100');
    });
    
    it('should throw an error for invalid pricing tiers', () => {
      const invalidTiers = [
        { minQuantity: 0, price: 100 }, // Invalid min quantity
        { minQuantity: 5, price: 90 }
      ];
      
      expect(() => new AddonPricing(100, 10, PricingModel.TIERED, invalidTiers))
        .toThrow('Tier minimum quantity must be a positive number');
      
      const duplicateTiers = [
        { minQuantity: 5, price: 100 },
        { minQuantity: 5, price: 90 } // Duplicate min quantity
      ];
      
      expect(() => new AddonPricing(100, 10, PricingModel.TIERED, duplicateTiers))
        .toThrow('Duplicate minimum quantities in pricing tiers');
    });
    
    it('should throw an error for invalid max quantity', () => {
      expect(() => new AddonPricing(100, 10, PricingModel.FIXED, [], 0))
        .toThrow('Maximum quantity must be a positive integer');
      
      expect(() => new AddonPricing(100, 10, PricingModel.FIXED, [], -5))
        .toThrow('Maximum quantity must be a positive integer');
      
      expect(() => new AddonPricing(100, 10, PricingModel.FIXED, [], 1.5))
        .toThrow('Maximum quantity must be a positive integer');
    });
  });
  
  describe('calculatePrice', () => {
    it('should calculate price correctly for fixed pricing', () => {
      const pricing = new AddonPricing(100, 10, PricingModel.FIXED);
      
      expect(pricing.calculatePrice()).toBe(100); // Default quantity = 1
      expect(pricing.calculatePrice(1)).toBe(100);
      expect(pricing.calculatePrice(5)).toBe(100);
      expect(pricing.calculatePrice(10)).toBe(100);
    });
    
    it('should calculate price correctly for per-person pricing', () => {
      const pricing = new AddonPricing(50, 10, PricingModel.PER_PERSON);
      
      expect(pricing.calculatePrice()).toBe(50); // Default quantity = 1
      expect(pricing.calculatePrice(1)).toBe(50);
      expect(pricing.calculatePrice(5)).toBe(250); // 50 * 5
      expect(pricing.calculatePrice(10)).toBe(500); // 50 * 10
    });
    
    it('should calculate price correctly for tiered pricing', () => {
      const tiers = [
        { minQuantity: 1, price: 100 },
        { minQuantity: 5, price: 450 }, // 90 per person
        { minQuantity: 10, price: 800 } // 80 per person
      ];
      
      const pricing = new AddonPricing(100, 10, PricingModel.TIERED, tiers);
      
      expect(pricing.calculatePrice(1)).toBe(100);
      expect(pricing.calculatePrice(4)).toBe(100); // Uses base price * quantity since no tier applies
      expect(pricing.calculatePrice(5)).toBe(450);
      expect(pricing.calculatePrice(9)).toBe(450);
      expect(pricing.calculatePrice(10)).toBe(800);
      expect(pricing.calculatePrice(15)).toBe(800);
    });
    
    it('should throw an error for quantity <= 0', () => {
      const pricing = new AddonPricing(100, 10);
      
      expect(() => pricing.calculatePrice(0)).toThrow(AddonPricingError);
      expect(() => pricing.calculatePrice(0)).toThrow('Quantity must be greater than 0');
      
      expect(() => pricing.calculatePrice(-5)).toThrow(AddonPricingError);
      expect(() => pricing.calculatePrice(-5)).toThrow('Quantity must be greater than 0');
    });
    
    it('should throw an error when quantity exceeds max quantity', () => {
      const pricing = new AddonPricing(100, 10, PricingModel.FIXED, [], 5);
      
      expect(pricing.calculatePrice(5)).toBe(100); // Max quantity
      
      expect(() => pricing.calculatePrice(6)).toThrow(AddonPricingError);
      expect(() => pricing.calculatePrice(6)).toThrow('Quantity exceeds maximum allowed (5)');
    });
  });
  
  describe('calculateCommission', () => {
    it('should calculate commission correctly', () => {
      const pricing = new AddonPricing(100, 10, PricingModel.FIXED);
      
      expect(pricing.calculateCommission()).toBe(10); // 10% of 100
      expect(pricing.calculateCommission(1)).toBe(10);
      
      const perPersonPricing = new AddonPricing(50, 15, PricingModel.PER_PERSON);
      
      expect(perPersonPricing.calculateCommission(1)).toBe(7.5); // 15% of 50
      expect(perPersonPricing.calculateCommission(5)).toBe(37.5); // 15% of 250
    });
  });
  
  describe('calculateNetPrice', () => {
    it('should calculate net price correctly', () => {
      const pricing = new AddonPricing(100, 10, PricingModel.FIXED);
      
      expect(pricing.calculateNetPrice()).toBe(90); // 100 - 10
      expect(pricing.calculateNetPrice(1)).toBe(90);
      
      const perPersonPricing = new AddonPricing(50, 20, PricingModel.PER_PERSON);
      
      expect(perPersonPricing.calculateNetPrice(1)).toBe(40); // 50 - 10
      expect(perPersonPricing.calculateNetPrice(5)).toBe(200); // 250 - 50
    });
  });
  
  describe('pricingTiers getter', () => {
    it('should return a copy of pricing tiers to ensure immutability', () => {
      const tiers = [
        { minQuantity: 1, price: 100 },
        { minQuantity: 5, price: 450 }
      ];
      
      const pricing = new AddonPricing(100, 10, PricingModel.TIERED, tiers);
      
      const returnedTiers = pricing.pricingTiers;
      
      // Verify it returns an accurate copy
      expect(returnedTiers).toEqual(tiers);
      
      // Modify the returned array
      returnedTiers.push({ minQuantity: 10, price: 800 });
      
      // The original pricing tiers should be unchanged
      expect(pricing.pricingTiers).toEqual(tiers);
    });
  });
});