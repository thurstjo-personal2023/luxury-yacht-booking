/**
 * Addon Type Tests
 * 
 * Tests for the AddonType enum and related functions in the domain layer.
 */

import { AddonType, isValidAddonType, getDefaultAddonType } from '../../../../../core/domain/addon/addon-type';

describe('AddonType', () => {
  describe('enum values', () => {
    it('should define SERVICE type', () => {
      expect(AddonType.SERVICE).toBe('service');
    });

    it('should define PRODUCT type', () => {
      expect(AddonType.PRODUCT).toBe('product');
    });

    it('should define EXPERIENCE type', () => {
      expect(AddonType.EXPERIENCE).toBe('experience');
    });
  });

  describe('isValidAddonType', () => {
    it('should return true for valid addon types', () => {
      expect(isValidAddonType('service')).toBe(true);
      expect(isValidAddonType('product')).toBe(true);
      expect(isValidAddonType('experience')).toBe(true);
    });

    it('should return false for invalid addon types', () => {
      expect(isValidAddonType('invalid')).toBe(false);
      expect(isValidAddonType('')).toBe(false);
      expect(isValidAddonType('SERVICE')).toBe(false); // Case sensitive
    });
  });

  describe('getDefaultAddonType', () => {
    it('should return SERVICE as the default type', () => {
      expect(getDefaultAddonType()).toBe(AddonType.SERVICE);
    });
  });
});