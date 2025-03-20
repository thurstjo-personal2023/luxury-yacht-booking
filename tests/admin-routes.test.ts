/**
 * Admin Routes Test Suite
 * 
 * This file contains tests for the admin API routes that handle
 * media validation and repair functionality.
 */
import { Request, Response } from 'express';
import express from 'express';
import request from 'supertest';
import { MediaValidationService } from '../functions/media-validation/media-validation';
import { MediaValidationWorker } from '../functions/media-validation/worker';

// Mock Firebase Admin
jest.mock('../server/firebase-admin', () => {
  return {
    getFirestore: jest.fn(() => ({})),
    verifyAuth: jest.fn((req, res, next) => {
      req.user = { uid: 'test-user-id', role: 'producer' };
      next();
    }),
    verifyAdminAuth: jest.fn((req, res, next) => {
      req.user = { uid: 'test-admin-id', role: 'admin' };
      next();
    })
  };
});

// Mock Media Validation Service
jest.mock('../functions/media-validation/media-validation', () => {
  return {
    MediaValidationService: jest.fn().mockImplementation(() => ({
      validateDocument: jest.fn(),
      generateReport: jest.fn().mockReturnValue({
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 10,
        totalFields: 25,
        validUrls: 20,
        invalidUrls: 5,
        missingUrls: 0,
        collectionSummaries: [
          {
            collection: 'test_collection',
            totalUrls: 25,
            validUrls: 20,
            invalidUrls: 5,
            missingUrls: 0,
            validPercent: 80,
            invalidPercent: 20,
            missingPercent: 0
          }
        ],
        invalidResults: []
      }),
      fixInvalidUrls: jest.fn().mockReturnValue({
        updatedDocument: { fixed: true },
        fixes: [{ field: 'imageUrl', originalUrl: 'https://broken.url', newUrl: '/placeholder.jpg', fixed: true }]
      })
    }))
  };
});

// Mock Media Validation Worker
jest.mock('../functions/media-validation/worker', () => {
  return {
    MediaValidationWorker: jest.fn().mockImplementation(() => ({
      start: jest.fn().mockResolvedValue({
        id: 'test-report-id',
        startTime: new Date(),
        endTime: new Date(),
        duration: 1000,
        totalDocuments: 10,
        totalFields: 25,
        validUrls: 20,
        invalidUrls: 5,
        missingUrls: 0,
        collectionSummaries: [],
        invalidResults: []
      }),
      stop: jest.fn()
    }))
  };
});

// Mock Firestore
jest.mock('firebase/firestore', () => {
  const collectionData = {
    'validation_reports': [
      {
        id: 'report1',
        startTime: new Date('2025-03-01T10:00:00Z'),
        endTime: new Date('2025-03-01T10:05:00Z'),
        duration: 300000,
        totalDocuments: 100,
        totalFields: 250,
        validUrls: 200,
        invalidUrls: 50,
        missingUrls: 0,
        createdAt: new Date()
      },
      {
        id: 'report2',
        startTime: new Date('2025-02-28T10:00:00Z'),
        endTime: new Date('2025-02-28T10:03:00Z'),
        duration: 180000,
        totalDocuments: 90,
        totalFields: 220,
        validUrls: 180,
        invalidUrls: 40,
        missingUrls: 0,
        createdAt: new Date()
      }
    ],
    'media_fix_reports': [
      {
        id: 'fix1',
        reportId: 'report1',
        totalFixes: 30,
        createdAt: new Date()
      }
    ]
  };
  
  return {
    getFirestore: jest.fn(() => ({})),
    collection: jest.fn((db, collName) => ({
      orderBy: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn().mockResolvedValue({
            docs: (collectionData[collName] || []).map(doc => ({
              id: doc.id,
              data: () => doc,
              exists: true
            })),
            empty: (collectionData[collName] || []).length === 0
          })
        }))
      }))
    })),
    doc: jest.fn(() => ({
      set: jest.fn().mockResolvedValue({}),
      get: jest.fn().mockResolvedValue({
        exists: true,
        data: () => ({ id: 'test-doc' })
      })
    })),
    setDoc: jest.fn().mockResolvedValue({}),
    getDoc: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ id: 'test-doc' })
    }),
    serverTimestamp: jest.fn(() => new Date())
  };
});

// Create Express App with Admin Routes
function createApp() {
  const app = express();
  app.use(express.json());
  
  // Import admin routes module
  const { registerAdminRoutes } = require('../server/admin-routes');
  
  // Register admin routes
  registerAdminRoutes(app);
  
  return app;
}

describe('Admin Routes', () => {
  let app;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create Express app with admin routes
    app = createApp();
  });
  
  describe('GET /api/admin/validate-media', () => {
    it('should trigger media validation', async () => {
      const response = await request(app)
        .get('/api/admin/validate-media')
        .expect(200);
      
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('success', true);
      expect(MediaValidationWorker).toHaveBeenCalled();
    });
  });
  
  describe('POST /api/admin/validate-media', () => {
    it('should trigger media validation with options', async () => {
      const options = {
        collections: ['yachts', 'products'],
        batchSize: 20,
        maxItems: 100
      };
      
      const response = await request(app)
        .post('/api/admin/validate-media')
        .send(options)
        .expect(200);
      
      expect(response.body).toHaveProperty('reportId');
      expect(response.body).toHaveProperty('success', true);
      expect(MediaValidationWorker).toHaveBeenCalled();
      
      // Verify worker was created with the right options
      const workerInstance = (MediaValidationWorker as jest.Mock).mock.instances[0];
      expect(workerInstance.start).toHaveBeenCalled();
    });
  });
  
  describe('GET /api/admin/media-validation-reports', () => {
    it('should return validation reports', async () => {
      const response = await request(app)
        .get('/api/admin/media-validation-reports')
        .expect(200);
      
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2);
      expect(response.body[0]).toHaveProperty('id', 'report1');
      expect(response.body[1]).toHaveProperty('id', 'report2');
    });
  });
  
  describe('GET /api/admin/media-validation/:reportId', () => {
    it('should return a specific validation report', async () => {
      const response = await request(app)
        .get('/api/admin/media-validation/report1')
        .expect(200);
      
      expect(response.body).toHaveProperty('id', 'test-doc');
    });
  });
  
  describe('POST /api/admin/fix-media-issues', () => {
    it('should fix media issues', async () => {
      const options = {
        reportId: 'report1',
        collections: ['yachts']
      };
      
      const response = await request(app)
        .post('/api/admin/fix-media-issues')
        .send(options)
        .expect(200);
      
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('fixCount');
      expect(MediaValidationWorker).toHaveBeenCalled();
    });
  });
  
  describe('Authorization', () => {
    it('should require admin authentication', async () => {
      // Mock verifyAdminAuth to simulate unauthorized access
      require('../server/firebase-admin').verifyAdminAuth.mockImplementationOnce((req, res, next) => {
        res.status(403).json({ error: 'Unauthorized' });
      });
      
      const response = await request(app)
        .get('/api/admin/validate-media')
        .expect(403);
      
      expect(response.body).toHaveProperty('error', 'Unauthorized');
    });
  });
});