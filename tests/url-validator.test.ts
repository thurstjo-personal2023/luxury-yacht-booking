/**
 * URL Validator Test Suite
 * 
 * This file contains tests for the URL validation functionality.
 */
import { 
  validateUrl, 
  validateImageUrl, 
  validateVideoUrl, 
  isImageUrl, 
  isVideoUrl, 
  extractUrls 
} from '../functions/media-validation/url-validator';

// Mock fetch to avoid real network requests
jest.mock('node-fetch', () => {
  return jest.fn().mockImplementation((url: string, options: any) => {
    // Return mocked responses based on URL
    if (url === 'https://example.com/valid-image.jpg') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'image/jpeg' : null
        }
      });
    } else if (url === 'https://example.com/valid-video.mp4') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'video/mp4' : null
        }
      });
    } else if (url === 'https://example.com/wrong-type.jpg') {
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: 'OK',
        headers: {
          get: (name: string) => name.toLowerCase() === 'content-type' ? 'video/mp4' : null
        }
      });
    } else if (url === 'https://example.com/not-found.jpg') {
      return Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        headers: {
          get: () => null
        }
      });
    } else if (url === 'https://example.com/server-error.jpg') {
      return Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: {
          get: () => null
        }
      });
    } else if (url === 'https://example.com/timeout.jpg') {
      return Promise.reject(new Error('Request timeout'));
    } else {
      return Promise.reject(new Error('Network error'));
    }
  });
});

describe('URL Validator', () => {
  describe('validateUrl', () => {
    it('should validate a valid URL', async () => {
      const result = await validateUrl('https://example.com/valid-image.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.status).toBe(200);
      expect(result.contentType).toBe('image/jpeg');
    });
    
    it('should invalidate a 404 URL', async () => {
      const result = await validateUrl('https://example.com/not-found.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.status).toBe(404);
      expect(result.error).toContain('404');
    });
    
    it('should invalidate a server error URL', async () => {
      const result = await validateUrl('https://example.com/server-error.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.status).toBe(500);
      expect(result.error).toContain('500');
    });
    
    it('should invalidate a network error URL', async () => {
      const result = await validateUrl('https://example.com/network-error.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Network error');
    });
    
    it('should invalidate a timeout URL', async () => {
      const result = await validateUrl('https://example.com/timeout.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Request timeout');
    });
    
    it('should invalidate a relative URL', async () => {
      const result = await validateUrl('/relative/path/image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL');
    });
    
    it('should invalidate a blob URL', async () => {
      const result = await validateUrl('blob:https://example.com/image');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL');
    });
    
    it('should invalidate invalid URL formats', async () => {
      const result = await validateUrl('not-a-url');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid URL format');
    });
  });
  
  describe('validateImageUrl', () => {
    it('should validate a valid image URL', async () => {
      const result = await validateImageUrl('https://example.com/valid-image.jpg');
      
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('image/jpeg');
    });
    
    it('should invalidate a non-image URL', async () => {
      const result = await validateImageUrl('https://example.com/wrong-type.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.contentType).toBe('video/mp4');
      expect(result.error).toContain('Expected image');
    });
    
    it('should invalidate a 404 URL', async () => {
      const result = await validateImageUrl('https://example.com/not-found.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('404');
    });
  });
  
  describe('validateVideoUrl', () => {
    it('should validate a valid video URL', async () => {
      const result = await validateVideoUrl('https://example.com/valid-video.mp4');
      
      expect(result.isValid).toBe(true);
      expect(result.contentType).toBe('video/mp4');
    });
    
    it('should invalidate a non-video URL', async () => {
      const result = await validateVideoUrl('https://example.com/valid-image.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.contentType).toBe('image/jpeg');
      expect(result.error).toContain('Expected video');
    });
    
    it('should invalidate a 404 URL', async () => {
      const result = await validateVideoUrl('https://example.com/not-found.jpg');
      
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('404');
    });
  });
  
  describe('isImageUrl', () => {
    it('should identify common image extensions', () => {
      expect(isImageUrl('https://example.com/image.jpg')).toBe(true);
      expect(isImageUrl('https://example.com/image.jpeg')).toBe(true);
      expect(isImageUrl('https://example.com/image.png')).toBe(true);
      expect(isImageUrl('https://example.com/image.gif')).toBe(true);
      expect(isImageUrl('https://example.com/image.webp')).toBe(true);
      expect(isImageUrl('https://example.com/image.svg')).toBe(true);
    });
    
    it('should not identify non-image extensions', () => {
      expect(isImageUrl('https://example.com/video.mp4')).toBe(false);
      expect(isImageUrl('https://example.com/document.pdf')).toBe(false);
      expect(isImageUrl('https://example.com/file.txt')).toBe(false);
    });
  });
  
  describe('isVideoUrl', () => {
    it('should identify common video extensions', () => {
      expect(isVideoUrl('https://example.com/video.mp4')).toBe(true);
      expect(isVideoUrl('https://example.com/video.webm')).toBe(true);
      expect(isVideoUrl('https://example.com/video.mov')).toBe(true);
      expect(isVideoUrl('https://example.com/video.avi')).toBe(true);
      expect(isVideoUrl('https://example.com/video.mkv')).toBe(true);
    });
    
    it('should not identify non-video extensions', () => {
      expect(isVideoUrl('https://example.com/image.jpg')).toBe(false);
      expect(isVideoUrl('https://example.com/document.pdf')).toBe(false);
      expect(isVideoUrl('https://example.com/file.txt')).toBe(false);
    });
  });
  
  describe('extractUrls', () => {
    it('should extract URLs from simple document', () => {
      const document = {
        title: 'Test Document',
        imageUrl: 'https://example.com/image.jpg',
        thumbnailUrl: 'https://example.com/thumbnail.jpg'
      };
      
      const urls = extractUrls(document);
      
      expect(urls.length).toBe(2);
      expect(urls).toContainEqual(['imageUrl', 'https://example.com/image.jpg']);
      expect(urls).toContainEqual(['thumbnailUrl', 'https://example.com/thumbnail.jpg']);
    });
    
    it('should extract URLs from nested objects', () => {
      const document = {
        title: 'Test Document',
        profile: {
          avatarUrl: 'https://example.com/avatar.jpg',
          coverPhoto: 'https://example.com/cover.jpg'
        }
      };
      
      const urls = extractUrls(document);
      
      expect(urls.length).toBe(2);
      expect(urls).toContainEqual(['profile.avatarUrl', 'https://example.com/avatar.jpg']);
      expect(urls).toContainEqual(['profile.coverPhoto', 'https://example.com/cover.jpg']);
    });
    
    it('should extract URLs from arrays', () => {
      const document = {
        title: 'Test Document',
        media: [
          { type: 'image', url: 'https://example.com/image1.jpg' },
          { type: 'image', url: 'https://example.com/image2.jpg' },
          { type: 'video', url: 'https://example.com/video.mp4' }
        ]
      };
      
      const urls = extractUrls(document);
      
      expect(urls.length).toBe(3);
      expect(urls).toContainEqual(['media.[0].url', 'https://example.com/image1.jpg']);
      expect(urls).toContainEqual(['media.[1].url', 'https://example.com/image2.jpg']);
      expect(urls).toContainEqual(['media.[2].url', 'https://example.com/video.mp4']);
    });
    
    it('should extract URLs from deeply nested structures', () => {
      const document = {
        title: 'Test Document',
        sections: [
          {
            title: 'Section 1',
            content: {
              images: [
                { caption: 'Image 1', url: 'https://example.com/image1.jpg' },
                { caption: 'Image 2', url: 'https://example.com/image2.jpg' }
              ]
            }
          },
          {
            title: 'Section 2',
            content: {
              video: { url: 'https://example.com/video.mp4' }
            }
          }
        ]
      };
      
      const urls = extractUrls(document);
      
      expect(urls.length).toBe(3);
      expect(urls).toContainEqual(['sections.[0].content.images.[0].url', 'https://example.com/image1.jpg']);
      expect(urls).toContainEqual(['sections.[0].content.images.[1].url', 'https://example.com/image2.jpg']);
      expect(urls).toContainEqual(['sections.[1].content.video.url', 'https://example.com/video.mp4']);
    });
    
    it('should only extract URLs from relevant fields', () => {
      const document = {
        title: 'Test Document',
        imageUrl: 'https://example.com/image.jpg',
        description: 'This is a test https://example.com/not-an-image.html',
        link: 'https://example.com/page.html'
      };
      
      const urls = extractUrls(document);
      
      expect(urls.length).toBe(1);
      expect(urls).toContainEqual(['imageUrl', 'https://example.com/image.jpg']);
    });
    
    it('should extract URLs based on custom patterns', () => {
      const document = {
        title: 'Test Document',
        imageUrl: 'https://example.com/image.jpg',
        link: 'https://example.com/page.html'
      };
      
      const urls = extractUrls(document, ['link']);
      
      expect(urls.length).toBe(1);
      expect(urls).toContainEqual(['link', 'https://example.com/page.html']);
    });
  });
});