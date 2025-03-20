/**
 * Firebase Cloud Functions Entry Point
 * 
 * This file defines the Firebase Cloud Functions for the Etoile Yachts platform,
 * including media validation functions and scheduled tasks.
 */

import * as admin from 'firebase-admin';
import * as functions from 'firebase-functions';
import { PubSub } from '@google-cloud/pubsub';
import { 
  MediaValidationService,
  DocumentWithFields
} from './media-validation/media-validation';
import { 
  MediaValidationWorker,
  ProgressInfo 
} from './media-validation/worker';
import {
  MediaValidationScheduler,
  TaskStatus
} from './media-validation/scheduler';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp();
}

// Create PubSub client
const pubsub = new PubSub();

// Create a MediaValidationScheduler instance
const scheduler = new MediaValidationScheduler(
  () => admin.firestore(),
  () => pubsub,
  {
    // Override default configuration as needed
    scheduleName: 'media-validation-daily',
    topicName: 'media-validation-tasks',
    subscriptionName: 'media-validation-tasks-subscription',
    cronSchedule: '0 2 * * *', // 2 AM every day
    timezone: 'UTC',
    description: 'Daily media validation job',
    taskCollection: 'validation_tasks',
    workerConfig: {
      autoFix: true,
      fixRelativeUrls: true,
      fixMediaType: true,
      saveValidationResults: true,
      validationResultsCollection: 'validation_results',
      placeholderImage: '/assets/images/placeholder-image.jpg',
      placeholderVideo: '/assets/videos/placeholder-video.mp4'
    }
  }
);

/**
 * Initialize the scheduler when the function is deployed
 */
export const initializeMediaValidation = functions.https.onRequest(async (req, res) => {
  try {
    await scheduler.initialize();
    res.status(200).send('Media validation scheduler initialized');
  } catch (error) {
    console.error('Error initializing media validation scheduler:', error);
    res.status(500).send(`Error initializing media validation scheduler: ${error.message}`);
  }
});

/**
 * Schedule media validation to run on a regular basis
 */
export const scheduleMediaValidation = functions.pubsub
  .schedule(scheduler.config.cronSchedule)
  .timeZone(scheduler.config.timezone)
  .onRun(async (context) => {
    try {
      const messageId = await scheduler.triggerValidation({
        scheduledBy: 'cron',
        scheduledAt: new Date().toISOString(),
        description: 'Scheduled media validation run'
      });
      
      console.log(`Scheduled media validation triggered: ${messageId}`);
      return null;
    } catch (error) {
      console.error('Error triggering scheduled media validation:', error);
      throw error;
    }
  });

/**
 * Manually trigger media validation
 */
export const triggerMediaValidation = functions.https.onRequest(async (req, res) => {
  try {
    const metadata = {
      scheduledBy: 'manual',
      scheduledAt: new Date().toISOString(),
      description: 'Manual media validation run',
      requestIp: req.ip,
      requestMethod: req.method,
      requestPath: req.path,
      requestQuery: req.query
    };
    
    const messageId = await scheduler.triggerValidation(metadata);
    
    res.status(200).json({
      success: true,
      messageId,
      message: 'Media validation triggered'
    });
  } catch (error) {
    console.error('Error triggering media validation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error triggering media validation'
    });
  }
});

/**
 * Handle validation tasks published to the Pub/Sub topic
 */
export const handleMediaValidationTask = functions.pubsub
  .topic(scheduler.config.topicName)
  .onPublish(async (message, context) => {
    try {
      await scheduler.handleValidationTask(message);
      return null;
    } catch (error) {
      console.error('Error handling media validation task:', error);
      throw error;
    }
  });

/**
 * Get a list of validation tasks
 */
export const getMediaValidationTasks = functions.https.onRequest(async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit.toString(), 10) : 10;
    const tasks = await scheduler.getValidationTasks(limit);
    
    res.status(200).json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error('Error getting media validation tasks:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error getting media validation tasks'
    });
  }
});

/**
 * Get a validation task by ID
 */
export const getMediaValidationTask = functions.https.onRequest(async (req, res) => {
  try {
    const taskId = req.query.taskId?.toString();
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
      return;
    }
    
    const task = await scheduler.getValidationTask(taskId);
    
    if (!task) {
      res.status(404).json({
        success: false,
        message: `Task ${taskId} not found`
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      task
    });
  } catch (error) {
    console.error('Error getting media validation task:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error getting media validation task'
    });
  }
});

/**
 * Get validation report for a task
 */
export const getMediaValidationReport = functions.https.onRequest(async (req, res) => {
  try {
    const taskId = req.query.taskId?.toString();
    
    if (!taskId) {
      res.status(400).json({
        success: false,
        message: 'Task ID is required'
      });
      return;
    }
    
    const report = await scheduler.getValidationReport(taskId);
    
    if (!report) {
      res.status(404).json({
        success: false,
        message: `Report for task ${taskId} not found`
      });
      return;
    }
    
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error getting media validation report:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error getting media validation report'
    });
  }
});

/**
 * Directly validate a single document
 */
export const validateDocument = functions.https.onRequest(async (req, res) => {
  try {
    // Extract parameters from request
    const collection = req.query.collection?.toString();
    const documentId = req.query.documentId?.toString();
    
    if (!collection || !documentId) {
      res.status(400).json({
        success: false,
        message: 'Collection and document ID are required'
      });
      return;
    }
    
    // Get document from Firestore
    const db = admin.firestore();
    const documentRef = db.collection(collection).doc(documentId);
    const documentSnapshot = await documentRef.get();
    
    if (!documentSnapshot.exists) {
      res.status(404).json({
        success: false,
        message: `Document ${collection}/${documentId} not found`
      });
      return;
    }
    
    // Create document with fields
    const document: DocumentWithFields = {
      id: documentId,
      collection,
      data: documentSnapshot.data()
    };
    
    // Create worker and validate document
    const worker = new MediaValidationWorker(
      () => db,
      {
        autoFix: req.query.autoFix === 'true',
        fixRelativeUrls: req.query.fixRelativeUrls !== 'false',
        fixMediaType: req.query.fixMediaType !== 'false'
      }
    );
    
    // Validate document
    const result = await worker.validateDocument(document);
    
    // Fix document if requested
    if (req.query.autoFix === 'true' && result.invalidFields > 0) {
      const fixedData = worker.fixDocument(document, result);
      await documentRef.update(fixedData);
      console.log(`Fixed document ${collection}/${documentId} (${result.invalidFields} fields)`);
    }
    
    // Return result
    res.status(200).json({
      success: true,
      result
    });
  } catch (error) {
    console.error('Error validating document:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error validating document'
    });
  }
});

/**
 * Run a media validation test
 */
export const testMediaValidation = functions.https.onRequest(async (req, res) => {
  try {
    // Create validation service
    const validationService = new MediaValidationService();
    
    // Create test document
    const testDocument: DocumentWithFields = {
      id: 'test-document',
      collection: 'test-collection',
      data: {
        title: 'Test Document',
        description: 'This is a test document for media validation',
        image: '/test-image.jpg',
        video: '/test-video.mp4',
        media: [
          {
            type: 'image',
            url: 'https://example.com/image.jpg'
          },
          {
            type: 'video',
            url: 'https://example.com/video.mp4'
          },
          {
            type: 'image',
            url: '/relative-image.jpg'
          }
        ]
      }
    };
    
    // Validate test document
    const results = await validationService.validateDocuments([testDocument]);
    
    // Generate report
    const startTime = new Date();
    const endTime = new Date();
    const report = validationService.generateReport(results, startTime, endTime);
    
    // Return report
    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error testing media validation:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error testing media validation'
    });
  }
});