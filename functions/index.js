/**
 * Etoile Yachts Media Validation Functions
 * 
 * This module exports the Firebase Functions that implement the media validation system:
 * 1. processMediaValidation - Processes validation jobs from Pub/Sub
 * 2. scheduledMediaValidation - Runs on a schedule (daily) to validate all media
 * 3. validateSingleDocument - HTTP endpoint to trigger validation for a specific document
 * 4. mediaValidationStatus - HTTP endpoint to check validation job status
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const cors = require('cors')({ origin: true });

// Initialize Firebase Admin SDK if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// Import validation modules
const { processValidationJob } = require('./media-validation/worker');
const { 
  processDailyValidation,
  requestImmediateValidation
} = require('./media-validation/scheduler');

/**
 * Process media validation job from Pub/Sub
 * This function is triggered when a new message is published to the media-validation topic
 */
exports.processMediaValidation = functions.pubsub
  .topic('media-validation')
  .onPublish(async (message, context) => {
    console.log('Received media validation job:', context.eventId);
    
    try {
      const result = await processValidationJob(message);
      console.log('Media validation job completed:', result);
      return result;
    } catch (error) {
      console.error('Error processing media validation job:', error);
      throw error;
    }
  });

/**
 * Scheduled media validation function
 * This function runs on a schedule to validate all media
 */
exports.scheduledMediaValidation = functions.pubsub
  .schedule('0 0 * * *') // Daily at midnight
  .onRun(async (context) => {
    console.log('Running scheduled media validation:', context.eventId);
    
    try {
      const result = await processDailyValidation();
      console.log('Scheduled media validation triggered:', result);
      return result;
    } catch (error) {
      console.error('Error running scheduled media validation:', error);
      throw error;
    }
  });

/**
 * HTTP endpoint to trigger validation for a specific document
 */
exports.validateSingleDocument = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check authentication (only allow admin users)
    if (!req.headers.authorization) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized: Missing authorization header' 
      });
    }
    
    try {
      const tokenId = req.headers.authorization.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(tokenId);
      
      // Check if user has admin claim
      if (!decodedToken.admin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: Requires admin privileges' 
        });
      }
      
      // Get request parameters
      const { collectionName, documentId } = req.body;
      
      if (!collectionName || !documentId) {
        return res.status(400).json({ 
          success: false, 
          error: 'Missing required parameters: collectionName and documentId' 
        });
      }
      
      // Request validation
      const result = await requestImmediateValidation(collectionName, documentId);
      
      return res.json({
        success: true,
        result
      });
    } catch (error) {
      console.error('Error in validateSingleDocument:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});

/**
 * HTTP endpoint to check validation job status
 */
exports.mediaValidationStatus = functions.https.onRequest((req, res) => {
  cors(req, res, async () => {
    // Check authentication (only allow admin users)
    if (!req.headers.authorization) {
      return res.status(403).json({ 
        success: false, 
        error: 'Unauthorized: Missing authorization header' 
      });
    }
    
    try {
      const tokenId = req.headers.authorization.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(tokenId);
      
      // Check if user has admin claim
      if (!decodedToken.admin) {
        return res.status(403).json({ 
          success: false, 
          error: 'Unauthorized: Requires admin privileges' 
        });
      }
      
      // Get request parameters
      const { reportId } = req.query;
      
      if (!reportId) {
        // Return list of recent reports if no specific reportId is provided
        const reportsSnapshot = await admin.firestore()
          .collection('media_validation_reports')
          .orderBy('started', 'desc')
          .limit(10)
          .get();
        
        const reports = [];
        reportsSnapshot.forEach(doc => {
          reports.push({
            id: doc.id,
            ...doc.data()
          });
        });
        
        return res.json({
          success: true,
          reports
        });
      }
      
      // Get specific report
      const reportDoc = await admin.firestore()
        .collection('media_validation_reports')
        .doc(reportId)
        .get();
      
      if (!reportDoc.exists) {
        return res.status(404).json({
          success: false,
          error: `Report with ID ${reportId} not found`
        });
      }
      
      // Get invalid URLs if any
      const invalidUrlsSnapshot = await admin.firestore()
        .collection('media_validation_reports')
        .doc(reportId)
        .collection('invalid_urls')
        .get();
      
      const invalidUrls = [];
      invalidUrlsSnapshot.forEach(doc => {
        invalidUrls.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return res.json({
        success: true,
        report: {
          id: reportDoc.id,
          ...reportDoc.data(),
          invalidUrls
        }
      });
    } catch (error) {
      console.error('Error in mediaValidationStatus:', error);
      
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });
});