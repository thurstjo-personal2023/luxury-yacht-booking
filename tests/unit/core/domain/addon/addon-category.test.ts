/**
 * Addon Category Tests
 * 
 * Tests for the AddonCategory value object in the domain layer.
 */

import { AddonCategory, StandardAddonCategory, isStandardCategory } from '../../../../../core/domain/addon/addon-category';

describe('AddonCategory', () => {
  describe('constructor', () => {
    it('should create a valid category with a standard value', () => {
      const category = new AddonCategory(StandardAddonCategory.FOOD_BEVERAGE);
      
      expect(category.value).toBe(StandardAddonCategory.FOOD_BEVERAGE);
      expect(category.isStandard).toBe(true);
    });
    
    it('should create a valid category with a custom value', () => {
      const category = new AddonCategory('Custom Category');
      
      expect(category.value).toBe('Custom Category');
      expect(category.isStandard).toBe(false);
    });
    
    it('should normalize case for standard categories', () => {
      // Mixed case for a standard category
      const category = new AddonCategory('fOoD & bEvErAgE');
      
      // Should normalize to the standard version
      expect(category.value).toBe(StandardAddonCategory.FOOD_BEVERAGE);
      expect(category.isStandard).toBe(true);
    });
    
    it('should trim whitespace from category values', () => {
      const category = new AddonCategory('  Custom Category  ');
      
      expect(category.value).toBe('Custom Category');
    });
    
    it('should default to OTHER for invalid inputs', () => {
      // Null input
      const category1 = new AddonCategory(null as any);
      expect(category1.value).toBe(StandardAddonCategory.OTHER);
      
      // Empty string
      const category2 = new AddonCategory('');
      expect(category2.value).toBe(StandardAddonCategory.OTHER);
      
      // Whitespace only
      const category3 = new AddonCategory('   ');
      expect(category3.value).toBe(StandardAddonCategory.OTHER);
    });
  });
  
  describe('isStandard property', () => {
    it('should return true for standard categories', () => {
      // Check all standard categories
      Object.values(StandardAddonCategory).forEach(categoryValue => {
        const category = new AddonCategory(categoryValue);
        expect(category.isStandard).toBe(true);
      });
    });
    
    it('should return false for custom categories', () => {
      const customCategories = [
        'Premium Service',
        'Special Package',
        'VIP Experience'
      ];
      
      customCategories.forEach(categoryValue => {
        const category = new AddonCategory(categoryValue);
        expect(category.isStandard).toBe(false);
      });
    });
  });
  
  describe('equals method', () => {
    it('should return true for identical categories', () => {
      const category1 = new AddonCategory('Food & Beverage');
      const category2 = new AddonCategory('Food & Beverage');
      
      expect(category1.equals(category2)).toBe(true);
    });
    
    it('should return true for case-insensitive matches', () => {
      const category1 = new AddonCategory('Food & Beverage');
      const category2 = new AddonCategory('food & beverage');
      
      expect(category1.equals(category2)).toBe(true);
    });
    
    it('should return false for different categories', () => {
      const category1 = new AddonCategory('Food & Beverage');
      const category2 = new AddonCategory('Entertainment');
      
      expect(category1.equals(category2)).toBe(false);
    });
  });
  
  describe('toString method', () => {
    it('should return the string representation', () => {
      const category = new AddonCategory('Food & Beverage');
      
      expect(category.toString()).toBe('Food & Beverage');
    });
  });
  
  describe('isStandardCategory function', () => {
    it('should return true for standard categories', () => {
      // Check all standard categories
      Object.values(StandardAddonCategory).forEach(categoryValue => {
        expect(isStandardCategory(categoryValue)).toBe(true);
      });
    });
    
    it('should return false for custom categories', () => {
      expect(isStandardCategory('Custom Category')).toBe(false);
      expect(isStandardCategory('Premium Service')).toBe(false);
    });
    
    it('should return false for case-different standard categories', () => {
      // Standard categories are case-sensitive
      expect(isStandardCategory('food & beverage')).toBe(false);
      expect(isStandardCategory('ENTERTAINMENT')).toBe(false);
    });
  });
  
  describe('StandardAddonCategory enum', () => {
    it('should define all expected categories', () => {
      expect(StandardAddonCategory.FOOD_BEVERAGE).toBe('Food & Beverage');
      expect(StandardAddonCategory.ENTERTAINMENT).toBe('Entertainment');
      expect(StandardAddonCategory.TRANSPORTATION).toBe('Transportation');
      expect(StandardAddonCategory.WELLNESS).toBe('Wellness');
      expect(StandardAddonCategory.ACTIVITIES).toBe('Activities');
      expect(StandardAddonCategory.PHOTOGRAPHY).toBe('Photography');
      expect(StandardAddonCategory.DECORATION).toBe('Decoration');
      expect(StandardAddonCategory.EQUIPMENT).toBe('Equipment');
      expect(StandardAddonCategory.TOUR).toBe('Tour');
      expect(StandardAddonCategory.OTHER).toBe('Other');
    });
  });
});