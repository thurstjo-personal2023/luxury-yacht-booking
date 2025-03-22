/**
 * Addon Entity Tests
 * 
 * Tests for the Addon entity in the domain layer.
 */

import { Addon, AddonError, AddonMedia } from '../../../../../core/domain/addon/addon';
import { AddonType } from '../../../../../core/domain/addon/addon-type';
import { PricingModel } from '../../../../../core/domain/addon/addon-pricing';

describe('Addon Entity', () => {
  describe('constructor and factory method', () => {
    it('should create a valid addon with minimal properties', () => {
      const addon = new Addon({
        id: 'test-addon-1',
        name: 'Test Addon',
        description: 'Test description',
        pricing: {
          basePrice: 100,
          commissionRate: 10
        }
      });
      
      expect(addon.id).toBe('test-addon-1');
      expect(addon.productId).toBe('test-addon-1'); // Default to id
      expect(addon.name).toBe('Test Addon');
      expect(addon.description).toBe('Test description');
      expect(addon.type).toBe(AddonType.SERVICE); // Default type
      expect(addon.pricing.basePrice).toBe(100);
      expect(addon.pricing.commissionRate).toBe(10);
      expect(addon.media).toEqual([]);
      expect(addon.isAvailable).toBe(true); // Default availability
      expect(addon.tags).toEqual([]);
      expect(addon.partnerId).toBeUndefined();
      expect(addon.createdAt).toBeInstanceOf(Date);
      expect(addon.updatedAt).toBeInstanceOf(Date);
    });
    
    it('should create a valid addon with all properties', () => {
      const media: AddonMedia[] = [
        { type: 'image', url: 'https://example.com/image1.jpg', title: 'Image 1' },
        { type: 'video', url: 'https://example.com/video1.mp4' }
      ];
      
      const now = new Date();
      
      const addon = new Addon({
        id: 'test-addon-2',
        productId: 'product-123',
        name: 'Full Addon',
        description: 'Complete addon description',
        type: AddonType.PRODUCT,
        category: 'food',
        pricing: {
          basePrice: 200,
          commissionRate: 15,
          model: PricingModel.PER_PERSON,
          maxQuantity: 10
        },
        media,
        mainImageUrl: 'https://example.com/image1.jpg',
        isAvailable: false,
        tags: ['food', 'beverage'],
        partnerId: 'partner-123',
        createdAt: now,
        updatedAt: now
      });
      
      expect(addon.id).toBe('test-addon-2');
      expect(addon.productId).toBe('product-123');
      expect(addon.name).toBe('Full Addon');
      expect(addon.description).toBe('Complete addon description');
      expect(addon.type).toBe(AddonType.PRODUCT);
      expect(addon.category.value).toBe('food');
      expect(addon.pricing.basePrice).toBe(200);
      expect(addon.pricing.commissionRate).toBe(15);
      expect(addon.pricing.model).toBe(PricingModel.PER_PERSON);
      expect(addon.pricing.maxQuantity).toBe(10);
      expect(addon.media).toEqual(media);
      expect(addon.mainImageUrl).toBe('https://example.com/image1.jpg');
      expect(addon.isAvailable).toBe(false);
      expect(addon.tags).toEqual(['food', 'beverage']);
      expect(addon.partnerId).toBe('partner-123');
      expect(addon.createdAt).toEqual(now);
      expect(addon.updatedAt).toEqual(now);
    });
    
    it('should throw an error for invalid required fields', () => {
      // Missing ID
      expect(() => new Addon({
        id: '',
        name: 'Test Addon',
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 }
      })).toThrow(AddonError);
      
      // Missing name
      expect(() => new Addon({
        id: 'test-id',
        name: '',
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 }
      })).toThrow(AddonError);
      
      // Name too short
      expect(() => new Addon({
        id: 'test-id',
        name: 'AB', // Less than 3 chars
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 }
      })).toThrow(AddonError);
      
      // Name too long
      expect(() => new Addon({
        id: 'test-id',
        name: 'A'.repeat(101), // Over 100 chars
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 }
      })).toThrow(AddonError);
      
      // Description too long
      expect(() => new Addon({
        id: 'test-id',
        name: 'Test Addon',
        description: 'A'.repeat(1001), // Over 1000 chars
        pricing: { basePrice: 100, commissionRate: 10 }
      })).toThrow(AddonError);
    });
    
    it('should validate and clean media items', () => {
      const validMedia: AddonMedia[] = [
        { type: 'image', url: 'https://example.com/image1.jpg', title: 'Image 1' },
        { type: 'video', url: 'https://example.com/video1.mp4' }
      ];
      
      const mixedMedia = [
        ...validMedia,
        { type: 'invalid' as any, url: 'https://example.com/something.xyz' }, // Invalid type
        { type: 'image', url: '' }, // Missing URL
        { type: 'image', url: '  https://example.com/image2.jpg  ', title: '  Trimmed  ' } // Untrimmed
      ];
      
      const addon = new Addon({
        id: 'test-addon',
        name: 'Media Test Addon',
        description: 'Testing media validation',
        pricing: { basePrice: 100, commissionRate: 10 },
        media: mixedMedia
      });
      
      // Should only include valid media and trim values
      expect(addon.media).toHaveLength(3); // 2 valid + 1 trimmed
      expect(addon.media[2].url).toBe('https://example.com/image2.jpg');
      expect(addon.media[2].title).toBe('Trimmed');
    });
    
    it('should set main image URL from media if not provided', () => {
      const media: AddonMedia[] = [
        { type: 'image', url: 'https://example.com/image1.jpg' },
        { type: 'video', url: 'https://example.com/video1.mp4' }
      ];
      
      const addon = new Addon({
        id: 'test-addon',
        name: 'Image Test Addon',
        description: 'Testing main image',
        pricing: { basePrice: 100, commissionRate: 10 },
        media
      });
      
      // Should select the first image as main
      expect(addon.mainImageUrl).toBe('https://example.com/image1.jpg');
    });
  });
  
  describe('state-changing methods', () => {
    let addon: Addon;
    
    beforeEach(() => {
      // Create a fresh addon for each test
      addon = new Addon({
        id: 'test-addon',
        name: 'Test Addon',
        description: 'Test description',
        type: AddonType.SERVICE,
        category: 'tours',
        pricing: {
          basePrice: 100,
          commissionRate: 10
        },
        media: [
          { type: 'image', url: 'https://example.com/image1.jpg', title: 'Image 1' }
        ],
        tags: ['tour']
      });
    });
    
    it('should update name', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.updateName('Updated Addon Name');
      
      expect(addon.name).toBe('Updated Addon Name');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should update description', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.updateDescription('Updated description text');
      
      expect(addon.description).toBe('Updated description text');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should update category', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.updateCategory('adventure');
      
      expect(addon.category.value).toBe('adventure');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should update pricing', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.updatePricing({
        basePrice: 150,
        commissionRate: 15,
        model: PricingModel.PER_PERSON,
        maxQuantity: 5
      });
      
      expect(addon.pricing.basePrice).toBe(150);
      expect(addon.pricing.commissionRate).toBe(15);
      expect(addon.pricing.model).toBe(PricingModel.PER_PERSON);
      expect(addon.pricing.maxQuantity).toBe(5);
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should update media', () => {
      const originalDate = addon.updatedAt;
      const newMedia: AddonMedia[] = [
        { type: 'image', url: 'https://example.com/new-image.jpg' },
        { type: 'video', url: 'https://example.com/new-video.mp4' }
      ];
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.updateMedia(newMedia);
      
      expect(addon.media).toEqual(newMedia);
      expect(addon.mainImageUrl).toBe('https://example.com/new-image.jpg'); // Should update main image
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should add media item', () => {
      const originalDate = addon.updatedAt;
      const newItem: AddonMedia = { type: 'video', url: 'https://example.com/video1.mp4' };
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.addMedia(newItem);
      
      expect(addon.media).toHaveLength(2);
      expect(addon.media[1]).toEqual(newItem);
      expect(addon.mainImageUrl).toBe('https://example.com/image1.jpg'); // Should not change
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should remove media item by URL', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = addon.removeMedia('https://example.com/image1.jpg');
      
      expect(result).toBe(true);
      expect(addon.media).toHaveLength(0);
      expect(addon.mainImageUrl).toBeUndefined(); // Main image should be removed
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should return false when removing non-existent media item', () => {
      const originalDate = addon.updatedAt;
      const result = addon.removeMedia('https://example.com/nonexistent.jpg');
      
      expect(result).toBe(false);
      expect(addon.media).toHaveLength(1); // Should not change
      expect(addon.updatedAt).toEqual(originalDate); // Should not update
    });
    
    it('should set the main image URL', () => {
      // Add another image
      addon.addMedia({ type: 'image', url: 'https://example.com/image2.jpg' });
      
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = addon.setMainImage('https://example.com/image2.jpg');
      
      expect(result).toBe(true);
      expect(addon.mainImageUrl).toBe('https://example.com/image2.jpg');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should not set main image if URL does not exist or is not an image', () => {
      // Add a video
      addon.addMedia({ type: 'video', url: 'https://example.com/video1.mp4' });
      
      const originalDate = addon.updatedAt;
      
      // Try to set non-existent URL
      let result = addon.setMainImage('https://example.com/nonexistent.jpg');
      expect(result).toBe(false);
      
      // Try to set video as main image
      result = addon.setMainImage('https://example.com/video1.mp4');
      expect(result).toBe(false);
      
      // Main image should remain unchanged
      expect(addon.mainImageUrl).toBe('https://example.com/image1.jpg');
      expect(addon.updatedAt).toEqual(originalDate); // Should not update
    });
    
    it('should set availability', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      addon.setAvailability(false);
      
      expect(addon.isAvailable).toBe(false);
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should add a tag', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = addon.addTag('premium');
      
      expect(result).toBe(true);
      expect(addon.tags).toContain('premium');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should not add duplicate or invalid tags', () => {
      // Add a tag first
      addon.addTag('premium');
      
      const originalDate = addon.updatedAt;
      
      // Try to add the same tag (case insensitive)
      let result = addon.addTag('PREMIUM');
      expect(result).toBe(false);
      
      // Try to add empty tag
      result = addon.addTag('');
      expect(result).toBe(false);
      
      // Try to add null/undefined
      result = addon.addTag(null as any);
      expect(result).toBe(false);
      
      // Tags should remain unchanged
      expect(addon.tags).toEqual(['tour', 'premium']);
      expect(addon.updatedAt).toEqual(originalDate); // Should not update
    });
    
    it('should remove a tag', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = addon.removeTag('tour');
      
      expect(result).toBe(true);
      expect(addon.tags).not.toContain('tour');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should handle case-insensitive tag removal', () => {
      const originalDate = addon.updatedAt;
      
      // Wait to ensure updatedAt will be different
      jest.advanceTimersByTime(1000);
      
      const result = addon.removeTag('TOUR');
      
      expect(result).toBe(true);
      expect(addon.tags).not.toContain('tour');
      expect(addon.updatedAt.getTime()).toBeGreaterThan(originalDate.getTime());
    });
    
    it('should return false when removing non-existent tag', () => {
      const originalDate = addon.updatedAt;
      const result = addon.removeTag('nonexistent');
      
      expect(result).toBe(false);
      expect(addon.tags).toEqual(['tour']); // Should not change
      expect(addon.updatedAt).toEqual(originalDate); // Should not update
    });
  });
  
  describe('createReference', () => {
    it('should create a reference object for bundling', () => {
      const addon = new Addon({
        id: 'test-addon',
        productId: 'product-123',
        name: 'Test Addon',
        description: 'Test description',
        type: AddonType.SERVICE,
        category: 'tours',
        pricing: {
          basePrice: 100,
          commissionRate: 10,
          maxQuantity: 5
        },
        media: [
          { type: 'image', url: 'https://example.com/image1.jpg' }
        ],
        partnerId: 'partner-123'
      });
      
      // Create a reference (not required)
      const reference = addon.createReference(false);
      
      expect(reference.addOnId).toBe('product-123');
      expect(reference.partnerId).toBe('partner-123');
      expect(reference.name).toBe('Test Addon');
      expect(reference.description).toBe('Test description');
      expect(reference.pricing).toBe(100);
      expect(reference.isRequired).toBe(false);
      expect(reference.commissionRate).toBe(10);
      expect(reference.maxQuantity).toBe(5);
      expect(reference.category).toBe('tours');
      expect(reference.mediaUrl).toBe('https://example.com/image1.jpg');
      
      // Create a reference (required)
      const requiredReference = addon.createReference(true);
      expect(requiredReference.isRequired).toBe(true);
    });
  });
  
  describe('toObject', () => {
    it('should convert addon to a plain object representation', () => {
      const now = new Date();
      
      const addon = new Addon({
        id: 'test-addon',
        productId: 'product-123',
        name: 'Test Addon',
        description: 'Test description',
        type: AddonType.SERVICE,
        category: 'tours',
        pricing: {
          basePrice: 100,
          commissionRate: 10
        },
        media: [
          { type: 'image', url: 'https://example.com/image1.jpg' }
        ],
        partnerId: 'partner-123',
        createdAt: now,
        updatedAt: now
      });
      
      const obj = addon.toObject();
      
      expect(obj.id).toBe('test-addon');
      expect(obj.productId).toBe('product-123');
      expect(obj.name).toBe('Test Addon');
      expect(obj.description).toBe('Test description');
      expect(obj.type).toBe(AddonType.SERVICE);
      expect(obj.category).toBe('tours');
      expect(obj.pricing).toBe(100);
      expect(obj.commissionRate).toBe(10);
      expect(obj.pricingModel).toBe(PricingModel.FIXED);
      expect(obj.media).toEqual([{ type: 'image', url: 'https://example.com/image1.jpg' }]);
      expect(obj.mainImageUrl).toBe('https://example.com/image1.jpg');
      expect(obj.partnerId).toBe('partner-123');
      expect(obj.createdAt).toEqual(now);
      expect(obj.updatedAt).toEqual(now);
      
      // Legacy fields for backward compatibility
      expect(obj.availability).toBe(true);
      expect(obj.createdDate).toEqual(now);
      expect(obj.lastUpdatedDate).toEqual(now);
    });
  });
  
  describe('isPartnerOwned', () => {
    it('should return true if addon has partnerId', () => {
      const addon = new Addon({
        id: 'test-addon',
        name: 'Test Addon',
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 },
        partnerId: 'partner-123'
      });
      
      expect(addon.isPartnerOwned).toBe(true);
    });
    
    it('should return false if addon has no partnerId', () => {
      const addon = new Addon({
        id: 'test-addon',
        name: 'Test Addon',
        description: 'Test description',
        pricing: { basePrice: 100, commissionRate: 10 }
      });
      
      expect(addon.isPartnerOwned).toBe(false);
    });
  });
});