/**
 * Add-On Test Utilities
 * 
 * This module provides utilities for testing add-on functionality,
 * including test data generation and helper functions.
 */

import { Addon } from '../../core/domain/addon/addon';
import { AddonType } from '../../core/domain/addon/addon-type';
import { AddonBundle } from '../../core/domain/addon/addon-bundle';
import { AddonReference } from '../../core/domain/addon/addon-reference';

/**
 * Generate a random ID
 * @param prefix Prefix for the ID
 */
export function generateId(prefix: string = 'test'): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

/**
 * Create a test addon for testing
 * @param overrides Properties to override
 */
export function createTestAddon(overrides: Partial<Addon> = {}): Addon {
  return {
    id: generateId('addon'),
    partnerId: overrides.partnerId || generateId('partner'),
    name: overrides.name || `Test Add-on ${Date.now()}`,
    description: overrides.description || 'This is a test add-on for unit testing',
    type: overrides.type || AddonType.SERVICE,
    category: overrides.category || 'Catering',
    pricing: overrides.pricing !== undefined ? overrides.pricing : 199.99,
    commissionRate: overrides.commissionRate !== undefined ? overrides.commissionRate : 0.15,
    maxQuantity: overrides.maxQuantity !== undefined ? overrides.maxQuantity : 5,
    media: overrides.media || [
      { url: 'https://example.com/test-image.jpg', type: 'image' }
    ],
    isAvailable: overrides.isAvailable !== undefined ? overrides.isAvailable : true,
    tags: overrides.tags || ['test', 'addon', 'service'],
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create multiple test addons
 * @param count Number of addons to create
 * @param baseOverrides Base properties to override for all addons
 */
export function createTestAddons(count: number, baseOverrides: Partial<Addon> = {}): Addon[] {
  return Array.from({ length: count }, (_, index) => 
    createTestAddon({
      ...baseOverrides,
      id: `${baseOverrides.id || 'addon'}-${index + 1}`,
      name: `${baseOverrides.name || 'Test Add-on'} ${index + 1}`
    })
  );
}

/**
 * Create an addon reference for bundling
 * @param addon The addon to reference
 * @param isRequired Whether the addon is required
 */
export function createAddonReference(addon: Addon, isRequired: boolean = false): AddonReference {
  return {
    addOnId: addon.id,
    partnerId: addon.partnerId,
    name: addon.name,
    description: addon.description,
    pricing: addon.pricing,
    isRequired,
    commissionRate: addon.commissionRate,
    maxQuantity: addon.maxQuantity,
    category: addon.category,
    mediaUrl: addon.media?.[0]?.url
  };
}

/**
 * Create a test bundle for testing
 * @param experienceId ID of the yacht experience
 * @param includedAddons Required addons
 * @param optionalAddons Optional addons
 * @param overrides Properties to override
 */
export function createTestBundle(
  experienceId: string,
  includedAddons: Addon[] = [],
  optionalAddons: Addon[] = [],
  overrides: Partial<AddonBundle> = {}
): AddonBundle {
  return {
    id: overrides.id || generateId('bundle'),
    experienceId,
    includedAddOns: includedAddons.map(addon => createAddonReference(addon, true)),
    optionalAddOns: optionalAddons.map(addon => createAddonReference(addon, false)),
    createdAt: overrides.createdAt || new Date(),
    updatedAt: overrides.updatedAt || new Date(),
    ...overrides
  };
}

/**
 * Create request context for authenticated requests
 * @param userId User ID
 * @param role User role
 */
export function createAuthContext(userId: string, role: 'producer' | 'partner' | 'consumer' = 'partner') {
  return {
    user: {
      uid: userId,
      role
    }
  };
}

/**
 * Assert that two addons are equal (excluding timestamps)
 * @param actual Actual addon
 * @param expected Expected addon
 */
export function assertAddonsEqual(actual: Addon, expected: Addon): void {
  // Compare essential properties
  expect(actual.id).toEqual(expected.id);
  expect(actual.partnerId).toEqual(expected.partnerId);
  expect(actual.name).toEqual(expected.name);
  expect(actual.description).toEqual(expected.description);
  expect(actual.type).toEqual(expected.type);
  expect(actual.category).toEqual(expected.category);
  expect(actual.pricing).toEqual(expected.pricing);
  expect(actual.commissionRate).toEqual(expected.commissionRate);
  expect(actual.maxQuantity).toEqual(expected.maxQuantity);
  expect(actual.isAvailable).toEqual(expected.isAvailable);
  
  // Compare media if present
  if (expected.media) {
    expect(actual.media?.length).toEqual(expected.media.length);
    expected.media.forEach((expectedMedia, index) => {
      expect(actual.media?.[index].url).toEqual(expectedMedia.url);
      expect(actual.media?.[index].type).toEqual(expectedMedia.type);
    });
  }
  
  // Compare tags if present
  if (expected.tags) {
    expect(actual.tags?.sort()).toEqual(expected.tags.sort());
  }
}

/**
 * Assert that two bundles are equal (excluding timestamps)
 * @param actual Actual bundle
 * @param expected Expected bundle
 */
export function assertBundlesEqual(actual: AddonBundle, expected: AddonBundle): void {
  // Compare essential properties
  expect(actual.id).toEqual(expected.id);
  expect(actual.experienceId).toEqual(expected.experienceId);
  
  // Compare included add-ons
  if (expected.includedAddOns) {
    expect(actual.includedAddOns?.length).toEqual(expected.includedAddOns.length);
    expected.includedAddOns.forEach((expectedAddon, index) => {
      expect(actual.includedAddOns?.[index].addOnId).toEqual(expectedAddon.addOnId);
      expect(actual.includedAddOns?.[index].partnerId).toEqual(expectedAddon.partnerId);
      expect(actual.includedAddOns?.[index].name).toEqual(expectedAddon.name);
      expect(actual.includedAddOns?.[index].pricing).toEqual(expectedAddon.pricing);
      expect(actual.includedAddOns?.[index].isRequired).toEqual(expectedAddon.isRequired);
      expect(actual.includedAddOns?.[index].commissionRate).toEqual(expectedAddon.commissionRate);
    });
  }
  
  // Compare optional add-ons
  if (expected.optionalAddOns) {
    expect(actual.optionalAddOns?.length).toEqual(expected.optionalAddOns.length);
    expected.optionalAddOns.forEach((expectedAddon, index) => {
      expect(actual.optionalAddOns?.[index].addOnId).toEqual(expectedAddon.addOnId);
      expect(actual.optionalAddOns?.[index].partnerId).toEqual(expectedAddon.partnerId);
      expect(actual.optionalAddOns?.[index].name).toEqual(expectedAddon.name);
      expect(actual.optionalAddOns?.[index].pricing).toEqual(expectedAddon.pricing);
      expect(actual.optionalAddOns?.[index].isRequired).toEqual(expectedAddon.isRequired);
      expect(actual.optionalAddOns?.[index].commissionRate).toEqual(expectedAddon.commissionRate);
    });
  }
}