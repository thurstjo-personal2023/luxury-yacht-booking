/**
 * Media Validation Cloud Functions
 * 
 * This module exports the Cloud Functions for media validation:
 * 1. processMediaValidation - A Pub/Sub triggered function that processes validation tasks
 * 2. triggerMediaValidation - An HTTP function that triggers validation on demand
 * 3. getMediaValidationStatus - An HTTP function that gets the status of validation
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');
const { mediaValidationWorker } = require('./pubsub-handler');

// Topic for media validation tasks
const TOPIC_NAME = 'media-validation-tasks';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Cloud Function triggered by Pub/Sub to process media validation tasks
 */
exports.processMediaValidation = functions.pubsub
  .topic(TOPIC_NAME)
  .onPublish(mediaValidationWorker);

/**
 * HTTP Cloud Function to trigger media validation
 */
exports.triggerMediaValidation = functions.https.onRequest(async (req, res) => {
  try {
    // Validate request (require admin authentication in production)
    if (req.method !== 'POST') {
      return res.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.'
      });
    }
    
    // Get message data from request body or use defaults
    const messageData = req.body || {};
    
    // Default to validating all collections if none specified
    if (!messageData.collections) {
      messageData.collections = [
        'unified_yacht_experiences',
        'yacht_profiles',
        'products_add_ons',
        'articles_and_guides',
        'event_announcements'
      ];
    }
    
    // Add metadata
    messageData.taskId = `manual-${Date.now()}`;
    messageData.requestedBy = 'api';
    messageData.requestedAt = new Date().toISOString();
    
    // Publish message to Pub/Sub
    const pubsub = new admin.messaging.Messaging();
    const topic = pubsub.topic(TOPIC_NAME);
    
    // Publish the message
    const messageId = await topic.publish(Buffer.from(JSON.stringify(messageData)));
    
    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Media validation triggered successfully',
      messageId,
      taskId: messageData.taskId
    });
  } catch (error) {
    console.error('Error triggering media validation:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error triggering media validation'
    });
  }
});

/**
 * HTTP Cloud Function to get media validation status and reports
 */
exports.getMediaValidationStatus = functions.https.onRequest(async (req, res) => {
  try {
    const db = admin.firestore();
    const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
    const reportId = req.query.reportId;
    
    // If a specific report ID is requested, return that report
    if (reportId) {
      const reportDoc = await db.collection('media_validation_reports').doc(reportId).get();
      
      if (!reportDoc.exists) {
        return res.status(404).json({
          success: false,
          error: 'Report not found',
          message: `No report found with ID: ${reportId}`
        });
      }
      
      // Get invalid URLs for the report
      const invalidUrlsSnapshot = await db
        .collection('media_validation_reports')
        .doc(reportId)
        .collection('invalid_urls')
        .orderBy('timestamp', 'desc')
        .limit(100)
        .get();
      
      const invalidUrls = [];
      invalidUrlsSnapshot.forEach(doc => {
        invalidUrls.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.status(200).json({
        success: true,
        report: {
          id: reportDoc.id,
          ...reportDoc.data(),
          invalidUrls
        }
      });
    }
    
    // Otherwise, return a list of recent reports
    const reportsSnapshot = await db
      .collection('media_validation_reports')
      .orderBy('started', 'desc')
      .limit(limit)
      .get();
    
    const reports = [];
    reportsSnapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return res.status(200).json({
      success: true,
      reports
    });
  } catch (error) {
    console.error('Error getting media validation status:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
      message: 'Error getting media validation status'
    });
  }
});

/**
 * Schedule media validation to run daily
 * This creates a scheduled function that runs once a day
 */
exports.scheduleDailyMediaValidation = functions.pubsub
  .schedule('0 0 * * *')  // Run at midnight every day
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      // Create message data for a scheduled run
      const messageData = {
        taskId: `scheduled-${Date.now()}`,
        requestedBy: 'scheduler',
        requestedAt: new Date().toISOString(),
        scheduled: true
      };
      
      // Publish message to Pub/Sub
      const pubsub = new admin.messaging.Messaging();
      const topic = pubsub.topic(TOPIC_NAME);
      
      // Publish the message
      const messageId = await topic.publish(Buffer.from(JSON.stringify(messageData)));
      
      console.log('Scheduled media validation triggered successfully:', messageId);
      return null;
    } catch (error) {
      console.error('Error triggering scheduled media validation:', error);
      throw error;
    }
  });