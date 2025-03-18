/**
 * Blob URL Resolver Test Suite
 * 
 * This file contains tests for the blob URL resolution functionality.
 */

const { scanForBlobUrls, setNestedValue, getPlaceholderForContext } = require('../scripts/blob-url-resolver-test-exports');

// Test suite for scanForBlobUrls function
describe('scanForBlobUrls', () => {
  test('finds blob URLs in simple object', () => {
    const testData = {
      image: 'blob:https://example.com/123-456',
      title: 'Test Object'
    };
    
    const results = scanForBlobUrls(testData);
    
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('image');
    expect(results[0].value).toBe('blob:https://example.com/123-456');
  });
  
  test('finds blob URLs in nested object', () => {
    const testData = {
      info: {
        profile: {
          avatar: 'blob:https://example.com/123-456'
        }
      },
      title: 'Test Object'
    };
    
    const results = scanForBlobUrls(testData);
    
    expect(results).toHaveLength(1);
    expect(results[0].path).toBe('info.profile.avatar');
    expect(results[0].value).toBe('blob:https://example.com/123-456');
  });
  
  test('finds blob URLs in arrays', () => {
    const testData = {
      images: [
        'blob:https://example.com/123-456',
        'https://example.com/normal-image.jpg',
        'blob:https://example.com/789-012'
      ]
    };
    
    const results = scanForBlobUrls(testData);
    
    expect(results).toHaveLength(2);
    expect(results[0].path).toBe('images.[0]');
    expect(results[0].value).toBe('blob:https://example.com/123-456');
    expect(results[1].path).toBe('images.[2]');
    expect(results[1].value).toBe('blob:https://example.com/789-012');
  });
  
  test('finds blob URLs in complex nested structure', () => {
    const testData = {
      media: [
        {
          type: 'image',
          url: 'blob:https://example.com/123-456'
        },
        {
          type: 'video',
          url: 'https://example.com/normal-video.mp4'
        }
      ],
      profile: {
        avatar: 'blob:https://example.com/789-012'
      }
    };
    
    const results = scanForBlobUrls(testData);
    
    expect(results).toHaveLength(2);
    expect(results[0].path).toBe('media.[0].url');
    expect(results[0].value).toBe('blob:https://example.com/123-456');
    expect(results[1].path).toBe('profile.avatar');
    expect(results[1].value).toBe('blob:https://example.com/789-012');
  });
  
  test('handles null and undefined values', () => {
    const testData = {
      image: null,
      profile: undefined,
      title: 'Test Object'
    };
    
    const results = scanForBlobUrls(testData);
    
    expect(results).toHaveLength(0);
  });
});

// Test suite for setNestedValue function
describe('setNestedValue', () => {
  test('sets a value at the top level', () => {
    const obj = {
      name: 'Test',
      value: 'Original'
    };
    
    const result = setNestedValue(obj, 'value', 'Updated');
    
    expect(result.value).toBe('Updated');
    expect(obj.value).toBe('Updated'); // Should modify the original object
  });
  
  test('sets a value in a nested object', () => {
    const obj = {
      profile: {
        name: 'Test',
        avatar: 'Original'
      }
    };
    
    const result = setNestedValue(obj, 'profile.avatar', 'Updated');
    
    expect(result.profile.avatar).toBe('Updated');
    expect(obj.profile.avatar).toBe('Updated');
  });
  
  test('sets a value in an array', () => {
    const obj = {
      images: ['image1.jpg', 'image2.jpg', 'image3.jpg']
    };
    
    const result = setNestedValue(obj, 'images.[1]', 'updated.jpg');
    
    expect(result.images[1]).toBe('updated.jpg');
    expect(obj.images[1]).toBe('updated.jpg');
  });
  
  test('sets a value in a complex nested structure', () => {
    const obj = {
      media: [
        {
          type: 'image',
          url: 'original.jpg'
        },
        {
          type: 'video',
          url: 'original.mp4'
        }
      ]
    };
    
    const result = setNestedValue(obj, 'media.[0].url', 'updated.jpg');
    
    expect(result.media[0].url).toBe('updated.jpg');
    expect(obj.media[0].url).toBe('updated.jpg');
  });
  
  test('creates missing objects in path', () => {
    const obj = {};
    
    const result = setNestedValue(obj, 'profile.avatar', 'new.jpg');
    
    expect(result.profile.avatar).toBe('new.jpg');
    expect(obj.profile.avatar).toBe('new.jpg');
  });
});

// Test suite for getPlaceholderForContext function
describe('getPlaceholderForContext', () => {
  test('returns avatar placeholder for profile and avatar fields', () => {
    expect(getPlaceholderForContext('profile.avatar')).toContain('avatar-placeholder');
    expect(getPlaceholderForContext('user.profilePhoto')).toContain('avatar-placeholder');
  });
  
  test('returns thumbnail placeholder for thumbnail fields', () => {
    expect(getPlaceholderForContext('thumbnailUrl')).toContain('thumbnail-placeholder');
    expect(getPlaceholderForContext('media.thumbnail')).toContain('thumbnail-placeholder');
  });
  
  test('returns video placeholder for video fields', () => {
    expect(getPlaceholderForContext('videoUrl')).toContain('video-placeholder');
    expect(getPlaceholderForContext('media.video')).toContain('video-placeholder');
  });
  
  test('returns yacht placeholder for yacht fields', () => {
    expect(getPlaceholderForContext('yacht.coverImage')).toContain('yacht-placeholder');
    expect(getPlaceholderForContext('yachtImage')).toContain('yacht-placeholder');
  });
  
  test('returns addon placeholder for addon fields', () => {
    expect(getPlaceholderForContext('addon.image')).toContain('addon-placeholder');
    expect(getPlaceholderForContext('addonPhoto')).toContain('addon-placeholder');
  });
  
  test('returns generic image placeholder for other fields', () => {
    expect(getPlaceholderForContext('generic.image')).toContain('yacht-placeholder');
    expect(getPlaceholderForContext('photo')).toContain('yacht-placeholder');
  });
});