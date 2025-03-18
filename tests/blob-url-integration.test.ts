/**
 * Blob URL Resolver Integration Test Suite
 * 
 * This file contains a minimal integration test for the blob URL resolver endpoint.
 */

// Mock express and response
const mockResponse = {
  json: jest.fn(),
  status: jest.fn().mockReturnThis()
};

// Mock the blob URL resolver module
jest.mock('../scripts/blob-url-resolver.mjs', () => ({
  resolveAllBlobUrls: jest.fn().mockImplementation(() => {
    return Promise.resolve({
      success: true,
      reportId: 'test-report-123',
      stats: {
        totalDocs: 100,
        totalResolved: 5,
        totalFailed: 0,
        executionTime: 1500
      }
    });
  })
}));

// Import our module to test
import { registerAdminRoutes } from '../server/admin-routes';

describe('Blob URL Resolver API Integration', () => {
  let mockApp: any;
  
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create a mock Express app
    mockApp = {
      get: jest.fn(),
      post: jest.fn()
    };
  });
  
  test('registers the resolve-blob-urls endpoint', () => {
    // Register admin routes on our mock app
    registerAdminRoutes(mockApp);
    
    // Verify that the correct endpoint was registered
    expect(mockApp.post).toHaveBeenCalledWith(
      '/api/admin/resolve-blob-urls',
      expect.any(Function),
      expect.any(Function)
    );
  });
  
  test('resolveAllBlobUrls is called and response is returned', async () => {
    // Mock implementation to capture the handler
    mockApp.post.mockImplementation((path: string, _middleware: any, handler: Function) => {
      if (path === '/api/admin/resolve-blob-urls') {
        // Call the handler directly with our mock request and response
        handler({ user: { role: 'producer' } }, mockResponse);
      }
    });
    
    // Register admin routes on our mock app
    registerAdminRoutes(mockApp);
    
    // Import the module to enable our mock
    const { resolveAllBlobUrls } = await import('../scripts/blob-url-resolver.mjs');
    
    // Verify that resolveAllBlobUrls was called
    expect(resolveAllBlobUrls).toHaveBeenCalled();
    
    // Verify the response was returned
    expect(mockResponse.json).toHaveBeenCalledWith({
      success: true,
      report: {
        success: true,
        reportId: 'test-report-123',
        stats: {
          totalDocs: 100,
          totalResolved: 5,
          totalFailed: 0,
          executionTime: 1500
        }
      }
    });
  });
});