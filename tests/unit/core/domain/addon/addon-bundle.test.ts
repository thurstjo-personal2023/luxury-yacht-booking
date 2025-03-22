/**
 * Addon Bundle Tests
 * 
 * Tests for the AddonBundle entity in the domain layer.
 */

import { AddonBundle, AddonReference } from '../../../../../core/domain/addon/addon-bundle';
import { AddonError } from '../../../../../core/domain/addon/addon';

describe('AddonBundle', () => {
  // Sample add-on references for testing
  const createSampleAddons = (): { included: AddonReference[]; optional: AddonReference[] } => {
    const included: AddonReference[] = [
      {
        addOnId: 'addon-1',
        partnerId: 'partner-1',
        name: 'Guided Tour',
        description: 'Professional guided tour',
        pricing: 100,
        isRequired: true,
        commissionRate: 10,
        category: 'tours',
        mediaUrl: 'https://example.com/tour.jpg'
      },
      {
        addOnId: 'addon-2',
        name: 'Catering Service',
        pricing: 150,
        isRequired: true,
        commissionRate: 15,
        category: 'food'
      }
    ];
    
    const optional: AddonReference[] = [
      {
        addOnId: 'addon-3',
        partnerId: 'partner-2',
        name: 'Photography Package',
        description: 'Professional photography',
        pricing: 75,
        isRequired: false,
        commissionRate: 20,
        category: 'photography',
        mediaUrl: 'https://example.com/photo.jpg'
      }
    ];
    
    return { included, optional };
  };
  
  describe('constructor', () => {
    it('should create a valid bundle with included and optional add-ons', () => {
      const { included, optional } = createSampleAddons();
      const bundle = new AddonBundle('exp-123', included, optional);
      
      expect(bundle.experienceId).toBe('exp-123');
      expect(bundle.includedAddons).toEqual(included);
      expect(bundle.optionalAddons).toEqual(optional);
      expect(bundle.allAddons).toHaveLength(3);
      expect(bundle.includedCount).toBe(2);
      expect(bundle.optionalCount).toBe(1);
      expect(bundle.totalCount).toBe(3);
    });
    
    it('should create a valid bundle with minimal properties', () => {
      const bundle = new AddonBundle('exp-123');
      
      expect(bundle.experienceId).toBe('exp-123');
      expect(bundle.includedAddons).toEqual([]);
      expect(bundle.optionalAddons).toEqual([]);
      expect(bundle.allAddons).toEqual([]);
      expect(bundle.includedCount).toBe(0);
      expect(bundle.optionalCount).toBe(0);
      expect(bundle.totalCount).toBe(0);
    });
    
    it('should throw an error for invalid experience ID', () => {
      expect(() => new AddonBundle('')).toThrow(AddonError);
      expect(() => new AddonBundle('  ')).toThrow(AddonError);
      expect(() => new AddonBundle(null as any)).toThrow(AddonError);
    });
    
    it('should throw an error for invalid add-on references', () => {
      const invalidAddon: AddonReference = {
        addOnId: '',  // Invalid ID
        name: 'Bad Addon',
        pricing: 100,
        isRequired: true,
        commissionRate: 10
      };
      
      expect(() => new AddonBundle('exp-123', [invalidAddon])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', [invalidAddon])).toThrow('Add-on ID is required');
      
      const missingName: AddonReference = {
        addOnId: 'addon-x',
        name: '',  // Invalid name
        pricing: 100,
        isRequired: true,
        commissionRate: 10
      };
      
      expect(() => new AddonBundle('exp-123', [missingName])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', [missingName])).toThrow('Add-on name is required');
      
      const invalidPricing: AddonReference = {
        addOnId: 'addon-x',
        name: 'Test Addon',
        pricing: -10,  // Invalid price
        isRequired: true,
        commissionRate: 10
      };
      
      expect(() => new AddonBundle('exp-123', [invalidPricing])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', [invalidPricing])).toThrow('Add-on pricing must be a non-negative number');
      
      const invalidCommission: AddonReference = {
        addOnId: 'addon-x',
        name: 'Test Addon',
        pricing: 100,
        isRequired: true,
        commissionRate: 110  // Invalid commission
      };
      
      expect(() => new AddonBundle('exp-123', [invalidCommission])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', [invalidCommission])).toThrow('Commission rate must be between 0 and 100');
    });
    
    it('should throw an error for duplicate add-ons', () => {
      const duplicateAddon: AddonReference = {
        addOnId: 'addon-1',  // Duplicate ID
        name: 'Duplicate Addon',
        pricing: 100,
        isRequired: true,
        commissionRate: 10
      };
      
      const { included, optional } = createSampleAddons();
      
      // Duplicate in included addons
      expect(() => new AddonBundle('exp-123', [...included, duplicateAddon])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', [...included, duplicateAddon])).toThrow('Duplicate add-ons are not allowed in a bundle');
      
      // Duplicate across included and optional addons
      expect(() => new AddonBundle('exp-123', included, [duplicateAddon, ...optional])).toThrow(AddonError);
      expect(() => new AddonBundle('exp-123', included, [duplicateAddon, ...optional])).toThrow('Duplicate add-ons are not allowed in a bundle');
    });
    
    it('should ensure isRequired flag matches the collection it belongs to', () => {
      // Add-on with isRequired=false but placed in included collection
      const wrongRequired: AddonReference = {
        addOnId: 'addon-x',
        name: 'Wrong Required Flag',
        pricing: 100,
        isRequired: false,  // Wrong flag for included
        commissionRate: 10
      };
      
      const bundle = new AddonBundle('exp-123', [wrongRequired]);
      
      // Should correct the flag
      expect(bundle.includedAddons[0].isRequired).toBe(true);
      
      // Add-on with isRequired=true but placed in optional collection
      const wrongOptional: AddonReference = {
        addOnId: 'addon-y',
        name: 'Wrong Optional Flag',
        pricing: 100,
        isRequired: true,  // Wrong flag for optional
        commissionRate: 10
      };
      
      const bundle2 = new AddonBundle('exp-123', [], [wrongOptional]);
      
      // Should correct the flag
      expect(bundle2.optionalAddons[0].isRequired).toBe(false);
    });
  });
  
  describe('pricing calculations', () => {
    it('should correctly calculate bundle pricing', () => {
      const { included, optional } = createSampleAddons();
      const bundle = new AddonBundle('exp-123', included, optional);
      
      const pricing = bundle.pricing;
      
      // Required add-ons total = 100 + 150 = 250
      expect(pricing.requiredAddonsTotal).toBe(250);
      
      // Optional add-ons total = 75
      expect(pricing.optionalAddonsTotal).toBe(75);
      
      // Required commission total = (100 * 0.1) + (150 * 0.15) = 10 + 22.5 = 32.5
      expect(pricing.requiredCommissionTotal).toBe(32.5);
      
      // Optional commission total = 75 * 0.2 = 15
      expect(pricing.optionalCommissionTotal).toBe(15);
    });
    
    it('should handle empty add-ons in pricing calculation', () => {
      const bundle = new AddonBundle('exp-123');
      
      const pricing = bundle.pricing;
      
      expect(pricing.requiredAddonsTotal).toBe(0);
      expect(pricing.optionalAddonsTotal).toBe(0);
      expect(pricing.requiredCommissionTotal).toBe(0);
      expect(pricing.optionalCommissionTotal).toBe(0);
    });
  });
  
  describe('add-on management methods', () => {
    let bundle: AddonBundle;
    
    beforeEach(() => {
      const { included, optional } = createSampleAddons();
      bundle = new AddonBundle('exp-123', included, optional);
    });
    
    it('should add an included add-on', () => {
      const newAddon: AddonReference = {
        addOnId: 'addon-4',
        name: 'New Included Addon',
        pricing: 200,
        isRequired: true,
        commissionRate: 10
      };
      
      const result = bundle.addIncludedAddon(newAddon);
      
      expect(result).toBe(true);
      expect(bundle.includedCount).toBe(3);
      expect(bundle.hasAddon('addon-4')).toBe(true);
      expect(bundle.isIncluded('addon-4')).toBe(true);
    });
    
    it('should add an optional add-on', () => {
      const newAddon: AddonReference = {
        addOnId: 'addon-5',
        name: 'New Optional Addon',
        pricing: 50,
        isRequired: false,
        commissionRate: 5
      };
      
      const result = bundle.addOptionalAddon(newAddon);
      
      expect(result).toBe(true);
      expect(bundle.optionalCount).toBe(2);
      expect(bundle.hasAddon('addon-5')).toBe(true);
      expect(bundle.isOptional('addon-5')).toBe(true);
    });
    
    it('should not add duplicate add-ons', () => {
      const duplicateAddon: AddonReference = {
        addOnId: 'addon-1', // Already exists as included
        name: 'Duplicate Addon',
        pricing: 200,
        isRequired: true,
        commissionRate: 10
      };
      
      // Try to add to included
      let result = bundle.addIncludedAddon(duplicateAddon);
      expect(result).toBe(false);
      expect(bundle.includedCount).toBe(2); // No change
      
      // Try to add to optional
      result = bundle.addOptionalAddon(duplicateAddon);
      expect(result).toBe(false);
      expect(bundle.optionalCount).toBe(1); // No change
    });
    
    it('should remove an add-on', () => {
      // Remove an included add-on
      let result = bundle.removeAddon('addon-1');
      
      expect(result).toBe(true);
      expect(bundle.includedCount).toBe(1);
      expect(bundle.hasAddon('addon-1')).toBe(false);
      
      // Remove an optional add-on
      result = bundle.removeAddon('addon-3');
      
      expect(result).toBe(true);
      expect(bundle.optionalCount).toBe(0);
      expect(bundle.hasAddon('addon-3')).toBe(false);
    });
    
    it('should return false when removing non-existent add-on', () => {
      const result = bundle.removeAddon('non-existent');
      
      expect(result).toBe(false);
      expect(bundle.totalCount).toBe(3); // No change
    });
    
    it('should move add-on from included to optional', () => {
      const result = bundle.moveToOptional('addon-1');
      
      expect(result).toBe(true);
      expect(bundle.includedCount).toBe(1);
      expect(bundle.optionalCount).toBe(2);
      expect(bundle.isIncluded('addon-1')).toBe(false);
      expect(bundle.isOptional('addon-1')).toBe(true);
      
      // Verify that the isRequired flag was updated
      const addon = bundle.getAddon('addon-1');
      expect(addon?.isRequired).toBe(false);
    });
    
    it('should move add-on from optional to included', () => {
      const result = bundle.moveToIncluded('addon-3');
      
      expect(result).toBe(true);
      expect(bundle.includedCount).toBe(3);
      expect(bundle.optionalCount).toBe(0);
      expect(bundle.isIncluded('addon-3')).toBe(true);
      expect(bundle.isOptional('addon-3')).toBe(false);
      
      // Verify that the isRequired flag was updated
      const addon = bundle.getAddon('addon-3');
      expect(addon?.isRequired).toBe(true);
    });
    
    it('should return false when moving non-existent add-on', () => {
      // Try to move non-existent add-on from included to optional
      let result = bundle.moveToOptional('non-existent');
      expect(result).toBe(false);
      
      // Try to move non-existent add-on from optional to included
      result = bundle.moveToIncluded('non-existent');
      expect(result).toBe(false);
    });
    
    it('should update an add-on', () => {
      const updates = {
        name: 'Updated Addon',
        description: 'Updated description',
        pricing: 120,
        commissionRate: 12
      };
      
      // Update an included add-on
      let result = bundle.updateAddon('addon-1', updates);
      
      expect(result).toBe(true);
      
      let updatedAddon = bundle.getAddon('addon-1');
      expect(updatedAddon?.name).toBe('Updated Addon');
      expect(updatedAddon?.description).toBe('Updated description');
      expect(updatedAddon?.pricing).toBe(120);
      expect(updatedAddon?.commissionRate).toBe(12);
      expect(updatedAddon?.isRequired).toBe(true); // Should not change
      
      // Update an optional add-on
      result = bundle.updateAddon('addon-3', { name: 'Updated Optional', pricing: 80 });
      
      expect(result).toBe(true);
      
      updatedAddon = bundle.getAddon('addon-3');
      expect(updatedAddon?.name).toBe('Updated Optional');
      expect(updatedAddon?.pricing).toBe(80);
      expect(updatedAddon?.isRequired).toBe(false); // Should not change
    });
    
    it('should return false when updating non-existent add-on', () => {
      const result = bundle.updateAddon('non-existent', { name: 'Updated Addon' });
      
      expect(result).toBe(false);
    });
  });
  
  describe('query methods', () => {
    let bundle: AddonBundle;
    
    beforeEach(() => {
      const { included, optional } = createSampleAddons();
      bundle = new AddonBundle('exp-123', included, optional);
    });
    
    it('should check if an add-on exists in the bundle', () => {
      expect(bundle.hasAddon('addon-1')).toBe(true);
      expect(bundle.hasAddon('addon-3')).toBe(true);
      expect(bundle.hasAddon('non-existent')).toBe(false);
    });
    
    it('should get an add-on by ID', () => {
      const addon1 = bundle.getAddon('addon-1');
      expect(addon1).toBeDefined();
      expect(addon1?.name).toBe('Guided Tour');
      
      const addon3 = bundle.getAddon('addon-3');
      expect(addon3).toBeDefined();
      expect(addon3?.name).toBe('Photography Package');
      
      const nonExistent = bundle.getAddon('non-existent');
      expect(nonExistent).toBeUndefined();
    });
    
    it('should check if an add-on is included', () => {
      expect(bundle.isIncluded('addon-1')).toBe(true);
      expect(bundle.isIncluded('addon-2')).toBe(true);
      expect(bundle.isIncluded('addon-3')).toBe(false);
      expect(bundle.isIncluded('non-existent')).toBe(false);
    });
    
    it('should check if an add-on is optional', () => {
      expect(bundle.isOptional('addon-1')).toBe(false);
      expect(bundle.isOptional('addon-2')).toBe(false);
      expect(bundle.isOptional('addon-3')).toBe(true);
      expect(bundle.isOptional('non-existent')).toBe(false);
    });
  });
  
  describe('toObject', () => {
    it('should convert the bundle to a plain object representation', () => {
      const { included, optional } = createSampleAddons();
      const bundle = new AddonBundle('exp-123', included, optional);
      
      const obj = bundle.toObject();
      
      expect(obj.experienceId).toBe('exp-123');
      expect(obj.includedAddOns).toEqual(included);
      expect(obj.optionalAddOns).toEqual(optional);
    });
  });
});