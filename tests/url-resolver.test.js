/**
 * URL Resolver Service Tests
 * 
 * This file contains tests for the URL Resolver service.
 */

const { UrlResolverService } = require('../core/domain/media/url-resolver');

describe('UrlResolverService', () => {
  let resolver;
  
  beforeEach(() => {
    // Create a new resolver for each test with development environment
    resolver = new UrlResolverService('development');
  });
  
  describe('isRelativeUrl', () => {
    test('should identify relative URLs correctly', () => {
      expect(resolver.isRelativeUrl('/images/logo.png')).toBe(true);
      expect(resolver.isRelativeUrl('images/logo.png')).toBe(true);
      expect(resolver.isRelativeUrl('./images/logo.png')).toBe(true);
      expect(resolver.isRelativeUrl('/yacht-placeholder.jpg')).toBe(true);
    });
    
    test('should identify absolute URLs correctly', () => {
      expect(resolver.isRelativeUrl('https://example.com/image.jpg')).toBe(false);
      expect(resolver.isRelativeUrl('http://example.com/image.jpg')).toBe(false);
      expect(resolver.isRelativeUrl('https://storage.googleapis.com/path/to/image.jpg')).toBe(false);
    });
    
    test('should handle edge cases', () => {
      expect(resolver.isRelativeUrl('')).toBe(false);
      expect(resolver.isRelativeUrl(null)).toBe(false);
      expect(resolver.isRelativeUrl(undefined)).toBe(false);
      expect(resolver.isRelativeUrl(123)).toBe(false);
    });
  });
  
  describe('resolveUrl', () => {
    test('should resolve relative URLs correctly', () => {
      const baseUrl = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';
      
      expect(resolver.resolveUrl('/images/logo.png')).toBe(`${baseUrl}/images/logo.png`);
      expect(resolver.resolveUrl('images/logo.png')).toBe(`${baseUrl}/images/logo.png`);
      expect(resolver.resolveUrl('/yacht-placeholder.jpg')).toBe(`${baseUrl}/yacht-placeholder.jpg`);
    });
    
    test('should not modify absolute URLs', () => {
      const absoluteUrl = 'https://example.com/image.jpg';
      expect(resolver.resolveUrl(absoluteUrl)).toBe(absoluteUrl);
      
      const storageUrl = 'https://storage.googleapis.com/path/to/image.jpg';
      expect(resolver.resolveUrl(storageUrl)).toBe(storageUrl);
    });
    
    test('should handle edge cases', () => {
      expect(resolver.resolveUrl('')).toBe('');
      expect(resolver.resolveUrl(null)).toBe(null);
      expect(resolver.resolveUrl(undefined)).toBe(undefined);
    });
    
    test('should handle production environment', () => {
      const prodResolver = new UrlResolverService('production');
      expect(prodResolver.resolveUrl('/images/logo.png')).toBe('https://www.etoileyachts.com/images/logo.png');
    });
  });
  
  describe('processDocument', () => {
    test('should resolve URLs in document fields', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: '/images/yacht.jpg',
        coverImage: {
          url: '/images/cover.jpg'
        },
        media: [
          { url: '/images/gallery1.jpg' },
          { url: 'https://example.com/gallery2.jpg' }
        ]
      };
      
      const mediaFields = ['imageUrl', 'coverImage.url', 'media.[0].url', 'media.[1].url'];
      const processed = resolver.processDocument(document, mediaFields);
      
      const baseUrl = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';
      
      expect(processed.imageUrl).toBe(`${baseUrl}/images/yacht.jpg`);
      expect(processed.coverImage.url).toBe(`${baseUrl}/images/cover.jpg`);
      expect(processed.media[0].url).toBe(`${baseUrl}/images/gallery1.jpg`);
      expect(processed.media[1].url).toBe('https://example.com/gallery2.jpg'); // Should not change
    });
    
    test('should auto-detect media fields if none provided', () => {
      const document = {
        id: 'yacht-123',
        name: 'Luxury Yacht',
        imageUrl: '/images/yacht.jpg',
        coverImage: {
          url: '/images/cover.jpg'
        }
      };
      
      const processed = resolver.processDocument(document);
      const baseUrl = 'https://491f404d-c45b-465e-abd0-1bf1a522988f-00-1vx2q8nj9olr6.janeway.replit.dev';
      
      expect(processed.imageUrl).toBe(`${baseUrl}/images/yacht.jpg`);
      expect(processed.coverImage.url).toBe(`${baseUrl}/images/cover.jpg`);
    });
    
    test('should handle empty or invalid documents', () => {
      expect(resolver.processDocument(null)).toBe(null);
      expect(resolver.processDocument(undefined)).toBe(undefined);
      expect(resolver.processDocument({})).toEqual({});
      expect(resolver.processDocument('string')).toBe('string');
    });
  });
  
  describe('_getNestedValue and _setNestedValue', () => {
    test('should get and set nested values correctly', () => {
      const doc = {
        a: {
          b: {
            c: 'value'
          }
        },
        arr: [
          { id: 1 },
          { id: 2 }
        ]
      };
      
      // Test getting nested values
      expect(resolver._getNestedValue(doc, 'a.b.c')).toBe('value');
      expect(resolver._getNestedValue(doc, 'arr.[0].id')).toBe(1);
      expect(resolver._getNestedValue(doc, 'nonexistent')).toBe(undefined);
      
      // Test setting nested values
      resolver._setNestedValue(doc, 'a.b.c', 'newValue');
      expect(doc.a.b.c).toBe('newValue');
      
      resolver._setNestedValue(doc, 'arr.[1].id', 3);
      expect(doc.arr[1].id).toBe(3);
      
      // Test creating nested paths
      resolver._setNestedValue(doc, 'x.y.z', 'created');
      expect(doc.x.y.z).toBe('created');
    });
  });
});