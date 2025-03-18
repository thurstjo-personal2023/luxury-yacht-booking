/**
 * Blob URL Resolver Integration Tests
 * 
 * This file contains integration tests for the blob URL resolution functionality,
 * testing the interaction with Express routes and Firestore.
 */

import express, { Express, Request, Response } from 'express';
import supertest from 'supertest';
import { mockFirestore, createMockDocument } from './test-utils';

// Mock Express app
const mockApp = {
  get: jest.fn(),
  post: jest.fn(),
  use: jest.fn(),
};

// Mock the admin routes module
jest.mock('../server/admin-routes', () => ({
  registerAdminRoutes: jest.fn((app) => {
    // Simulate route registration
    mockApp.post.mockImplementation((path: string, _middleware: any, handler: Function) => {
      if (path === '/api/admin/resolve-blob-urls') {
        // Register the test endpoint
        app.post('/api/admin/resolve-blob-urls', async (req: Request, res: Response) => {
          await handler(req, res);
        });
      }
    });
  }),
  verifyAdminAuth: jest.fn((req, res, next) => next()),
}));

// Define test data
const TEST_DOCUMENTS = [
  {
    id: 'doc1',
    collection: 'test_collection',
    data: {
      title: 'Test Document 1',
      imageUrl: 'blob:https://etoile-yachts.replit.app/12345',
      media: [
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/67890' },
        { type: 'image', url: 'https://valid-url.com/image.jpg' }
      ]
    }
  },
  {
    id: 'doc2',
    collection: 'test_collection',
    data: {
      title: 'Test Document 2',
      imageUrl: 'https://valid-url.com/logo.png',
      media: [
        { type: 'image', url: 'blob:https://etoile-yachts.replit.app/abcde' },
      ]
    }
  }
];

// Mock the Firebase admin module
jest.mock('firebase-admin', () => ({
  initializeApp: jest.fn(),
  apps: [],
  credential: {
    cert: jest.fn(),
  },
  firestore: jest.fn(() => mockFirestore),
}));

// Mock the blob-url-resolver module
jest.mock('../scripts/blob-url-resolver.mjs', () => ({
  isBlobUrl: jest.fn((url: string) => url.startsWith('blob:')),
  replaceBlobUrl: jest.fn((url: string) => {
    if (url.startsWith('blob:')) {
      return 'https://storage.googleapis.com/placeholder-images/yacht-placeholder.jpg';
    }
    return url;
  }),
  resolveBlobUrlsInCollection: jest.fn(async () => ({
    success: true,
    stats: {
      processed: 2,
      updated: 2,
      skipped: 0,
      errors: 0
    },
    resolvedUrls: 3
  })),
}));

describe('Blob URL Resolution API Integration Tests', () => {
  let app: Express;
  let request: any; // Use any type to avoid TypeScript issues with supertest
  
  beforeEach(() => {
    // Create a new Express app for each test
    app = express();
    app.use(express.json());
    
    // Add a spy to app methods
    app.get = jest.fn(app.get) as any;
    app.post = jest.fn(app.post) as any;
    
    // Import and register the admin routes
    const { registerAdminRoutes } = require('../server/admin-routes');
    registerAdminRoutes(app);
    
    // Create a supertest instance
    request = supertest(app);
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('POST /api/admin/resolve-blob-urls', () => {
    it('should successfully resolve blob URLs in documents', async () => {
      // Set up test conditions
      const testCollections = ['test_collection'];
      
      // Create the request
      const response = await request
        .post('/api/admin/resolve-blob-urls')
        .send({ collections: testCollections })
        .set('Accept', 'application/json');
      
      // Verify the response
      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      
      // Verify the resolver function was called with the correct collections
      const { resolveBlobUrlsInCollection } = require('../scripts/blob-url-resolver.mjs');
      expect(resolveBlobUrlsInCollection).toHaveBeenCalledWith(
        expect.anything(),  // Firestore instance
        'test_collection'
      );
      
      // Verify that the response contains the expected stats
      expect(response.body).toHaveProperty('reportId');
      expect(response.body.stats).toEqual({
        processed: 2,
        updated: 2,
        skipped: 0,
        errors: 0
      });
      expect(response.body.resolvedUrls).toBe(3);
    });
    
    it('should handle errors during blob URL resolution', async () => {
      // Mock the resolver to return an error
      const { resolveBlobUrlsInCollection } = require('../scripts/blob-url-resolver.mjs');
      resolveBlobUrlsInCollection.mockRejectedValueOnce(new Error('Test error'));
      
      // Create the request
      const response = await request
        .post('/api/admin/resolve-blob-urls')
        .send({ collections: ['test_collection'] })
        .set('Accept', 'application/json');
      
      // Verify that the response indicates an error
      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeTruthy();
    });
  });
});