/**
 * Firebase Cloud Functions Entry Point
 * 
 * This file defines Firebase Cloud Functions for the media validation system.
 * It includes functions to handle scheduled tasks and manual triggers.
 */

import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { MediaValidationWorker, MediaValidationWorkerConfig } from './media-validation/worker';
import { MediaValidationScheduler, MediaValidationTask } from './media-validation/scheduler';

// Initialize Firebase Admin SDK
const app = admin.initializeApp();
const firestore = admin.firestore();
const pubsub = admin.pubsub();

/**
 * Configuration for media validation
 */
const VALIDATION_CONFIG: Partial<MediaValidationWorkerConfig> = {
  baseUrl: 'https://etoile-yachts.web.app',
  collectionsToValidate: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'promotions_and_offers',
    'articles_and_guides',
    'event_announcements',
    'user_profiles_service_provider',
    'user_profiles_tourist'
  ],
  collectionsToFix: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons'
  ],
  autoFix: true,
  batchSize: 50,
  maxDocumentsToProcess: 1000,
  saveValidationResults: true,
  logProgress: true
};

/**
 * Schedule validation to run weekly
 */
export const scheduleMediaValidation = functions.pubsub
  .schedule('every monday 00:00')
  .timeZone('UTC')
  .onRun(async () => {
    // Create scheduler with firebase instances
    const scheduler = new MediaValidationScheduler(
      () => firestore,
      () => pubsub,
      {
        scheduleExpression: 'every monday 00:00',
        timeZone: 'UTC',
        taskTopic: 'media-validation-tasks',
        maxConcurrentTasks: 1,
        validationConfig: VALIDATION_CONFIG
      }
    );

    // Schedule immediate task
    const taskId = await scheduler.scheduleImmediateTask();
    
    console.log(`Scheduled media validation task: ${taskId}`);
    return null;
  });

/**
 * Handle media validation tasks published to Pub/Sub
 */
export const processMediaValidationTask = functions.pubsub
  .topic('media-validation-tasks')
  .onPublish(async (message) => {
    try {
      // Parse task data from message
      const taskData: MediaValidationTask = message.json;
      
      // Log task information
      console.log(`Processing media validation task: ${taskData.taskId}`);
      
      // Create scheduler to process task
      const scheduler = new MediaValidationScheduler(
        () => firestore,
        () => pubsub
      );
      
      // Process the task
      await scheduler.processTask(taskData);
      
      console.log(`Completed media validation task: ${taskData.taskId}`);
      return null;
    } catch (error) {
      console.error('Error processing media validation task:', error);
      throw error;
    }
  });

/**
 * HTTP endpoint to manually trigger media validation
 */
export const triggerMediaValidation = functions.https.onRequest(async (req, res) => {
  try {
    // Check if user is authenticated as admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check admin claim or admin email
    const isAdmin = decodedToken.admin === true || 
      (decodedToken.email && (
        decodedToken.email.endsWith('@etoile-yachts.com') || 
        decodedToken.email === 'admin@example.com'
      ));
    
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    // Create scheduler
    const scheduler = new MediaValidationScheduler(
      () => firestore,
      () => pubsub,
      {
        taskTopic: 'media-validation-tasks',
        validationConfig: {
          ...VALIDATION_CONFIG,
          // Override config with query parameters
          autoFix: req.query.autoFix === 'true',
          collectionsToValidate: req.query.collections ? 
            (req.query.collections as string).split(',') : 
            VALIDATION_CONFIG.collectionsToValidate
        }
      }
    );
    
    // Schedule immediate task
    const taskId = await scheduler.scheduleImmediateTask(
      {
        autoFix: req.query.autoFix === 'true',
        collectionsToValidate: req.query.collections ? 
          (req.query.collections as string).split(',') : 
          VALIDATION_CONFIG.collectionsToValidate
      },
      {
        triggeredBy: decodedToken.email || decodedToken.uid,
        triggerTime: new Date().toISOString(),
        triggerType: 'manual'
      }
    );
    
    // Return task ID
    res.status(200).json({ 
      message: 'Media validation triggered successfully',
      taskId
    });
  } catch (error) {
    console.error('Error triggering media validation:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * HTTP endpoint to get validation reports
 */
export const getValidationReports = functions.https.onRequest(async (req, res) => {
  try {
    // Check if user is authenticated as admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check admin claim or admin email
    const isAdmin = decodedToken.admin === true || 
      (decodedToken.email && (
        decodedToken.email.endsWith('@etoile-yachts.com') || 
        decodedToken.email === 'admin@example.com'
      ));
    
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    // Get validation reports
    const snapshot = await firestore.collection('validation_reports')
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();
    
    // Extract report data
    const reports = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Return reports
    res.status(200).json({ reports });
  } catch (error) {
    console.error('Error getting validation reports:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * HTTP endpoint to get validation tasks
 */
export const getValidationTasks = functions.https.onRequest(async (req, res) => {
  try {
    // Check if user is authenticated as admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check admin claim or admin email
    const isAdmin = decodedToken.admin === true || 
      (decodedToken.email && (
        decodedToken.email.endsWith('@etoile-yachts.com') || 
        decodedToken.email === 'admin@example.com'
      ));
    
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    // Get validation tasks
    const snapshot = await firestore.collection('validation_tasks')
      .orderBy('queuedAt', 'desc')
      .limit(10)
      .get();
    
    // Extract task data
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Return tasks
    res.status(200).json({ tasks });
  } catch (error) {
    console.error('Error getting validation tasks:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * HTTP endpoint to fix image URLs in a specific document
 */
export const fixDocumentUrls = functions.https.onRequest(async (req, res) => {
  try {
    // Check if user is authenticated as admin
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }
    
    // Verify token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    
    // Check admin claim or admin email
    const isAdmin = decodedToken.admin === true || 
      (decodedToken.email && (
        decodedToken.email.endsWith('@etoile-yachts.com') || 
        decodedToken.email === 'admin@example.com'
      ));
    
    if (!isAdmin) {
      res.status(403).json({ error: 'Forbidden: Admin access required' });
      return;
    }
    
    // Extract collection and document ID from request
    const { collection, documentId } = req.query;
    
    if (!collection || !documentId) {
      res.status(400).json({ error: 'Bad request: collection and documentId are required' });
      return;
    }
    
    // Create worker
    const worker = new MediaValidationWorker(
      () => firestore,
      {
        autoFix: true,
        saveValidationResults: true
      }
    );
    
    // Get document
    const docRef = firestore.collection(collection as string).doc(documentId as string);
    const docSnapshot = await docRef.get();
    
    if (!docSnapshot.exists) {
      res.status(404).json({ error: `Document not found: ${collection}/${documentId}` });
      return;
    }
    
    // Validate document
    const validationResult = await worker.validateDocument({
      collection: collection as string,
      id: documentId as string,
      data: docSnapshot.data()
    });
    
    // Fix document if needed
    if (validationResult.invalidFields > 0) {
      const fixedData = worker.fixInvalidUrls({
        collection: collection as string,
        id: documentId as string,
        data: docSnapshot.data()
      }, validationResult);
      
      // Update document
      await docRef.update(fixedData);
      
      res.status(200).json({ 
        message: 'Document URLs fixed successfully',
        invalidFields: validationResult.invalidFields,
        fixedFields: validationResult.results.length
      });
    } else {
      res.status(200).json({ 
        message: 'Document has no invalid URLs',
        invalidFields: 0,
        fixedFields: 0
      });
    }
  } catch (error) {
    console.error('Error fixing document URLs:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});