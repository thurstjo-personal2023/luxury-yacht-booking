/**
 * Etoile Yachts Media Validation Cloud Functions
 * 
 * This module exports Firebase Cloud Functions for the Etoile Yachts platform's
 * media validation system, including scheduled and on-demand validation.
 */
const functions = require("firebase-functions/v2");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onMessagePublished} = require("firebase-functions/v2/pubsub");
const {defineSecret} = require("firebase-functions/params");
const admin = require("./src/utils/firebaseAdmin");
const { MediaValidationScheduler, scheduleMediaValidation } = require("./media-validation/scheduler");
const { mediaValidationWorker } = require("./media-validation/worker");

// Set the appropriate region
const region = "us-central1";

// Initialize scheduler with default configuration
const scheduler = new MediaValidationScheduler({
  // Override any default settings
  topicName: 'media-validation-tasks',
  cronSchedule: '0 2 * * *', // 2 AM every day (UTC)
  timezone: 'UTC',
  batchSize: 50, 
  workerConfig: {
    autoFix: true,
    fixRelativeUrls: true,
    fixMediaTypes: true
  }
});

/**
 * Initialize the media validation system when deployed
 * This should be run once when the function is first deployed
 */
exports.initializeMediaValidation = onRequest(
    { region },
    async (req, res) => {
      try {
        // Initialize the scheduler (creates Pub/Sub topic if needed)
        await scheduler.initialize();
        
        res.status(200).json({
          success: true,
          message: 'Media validation system initialized successfully'
        });
      } catch (error) {
        console.error('Error initializing media validation:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error initializing media validation system'
        });
      }
    }
);

/**
 * Schedule media validation to run on a regular basis
 * This function is triggered based on a cron schedule
 */
exports.scheduledMediaValidation = onSchedule(
    {
      schedule: scheduler.config.cronSchedule,
      region: region,
      timeZone: scheduler.config.timezone,
    },
    scheduleMediaValidation
);

/**
 * Process tasks from the Pub/Sub topic
 * This function handles media validation tasks
 */
exports.processMediaValidation = onMessagePublished(
    {
      topic: scheduler.config.topicName,
      region: region,
      timeoutSeconds: 540, // 9 minutes (maximum allowed)
      memory: "1GiB",
    },
    mediaValidationWorker
);

/**
 * Trigger media validation manually via API
 * This function allows admins to trigger validation on demand
 */
exports.triggerMediaValidation = onRequest(
    { region },
    async (req, res) => {
      try {
        // Get collections to validate from request (optional)
        const collections = req.body?.collections || null;
        
        // Trigger validation with metadata
        const messageId = await scheduler.triggerValidation({
          requestedBy: 'api',
          requestedAt: new Date().toISOString(),
          collections: collections,
          description: 'Manual validation triggered via API'
        });
        
        res.status(200).json({
          success: true,
          messageId,
          message: 'Media validation triggered successfully'
        });
      } catch (error) {
        console.error('Error triggering media validation:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error triggering media validation'
        });
      }
    }
);

/**
 * Get media validation reports
 * This function allows admins to view validation reports
 */
exports.getMediaValidationReports = onRequest(
    { region },
    async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const reports = await scheduler.getValidationReports(limit);
        
        res.status(200).json({
          success: true,
          reports
        });
      } catch (error) {
        console.error('Error getting validation reports:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error getting validation reports'
        });
      }
    }
);

/**
 * Get a specific media validation report with detailed information
 */
exports.getMediaValidationReport = onRequest(
    { region },
    async (req, res) => {
      try {
        const reportId = req.params.reportId;
        
        if (!reportId) {
          return res.status(400).json({
            success: false,
            message: 'Report ID is required'
          });
        }
        
        // Get the report from Firestore
        const db = admin.firestore();
        const reportDoc = await db.collection('media_validation_reports').doc(reportId).get();
        
        if (!reportDoc.exists) {
          return res.status(404).json({
            success: false,
            message: 'Report not found'
          });
        }
        
        // Get invalid URLs for this report
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
        
        // Return the report with invalid URLs
        res.status(200).json({
          success: true,
          report: {
            id: reportId,
            ...reportDoc.data(),
            invalidUrls
          }
        });
      } catch (error) {
        console.error('Error getting validation report:', error);
        res.status(500).json({
          success: false,
          error: error.message,
          message: 'Error getting validation report'
        });
      }
    }
);

// Export any other existing functions from your project
exports.sendWelcomeEmail = onDocumentCreated(
    "users/{userId}",
    async (event) => {
      const userData = event.data.data();
      const {email, role, Name} = userData;

      let subject;
      let html;

      if (role === "consumer") {
        subject = "Welcome to Etoile Yachts!";
        html = `<p>Hi ${Name},</p>
      <p>Welcome to our platform! As a consumer, you can now book yachts for</p>
      <p>amazing water experiences.</p>
      <p>Start exploring today!</p>`;
      } else if (role === "producer") {
        subject = "Welcome, Captain!";
        html = `<p>Hi ${Name},</p>
      <p>Welcome to Etoile Yachts! As a producer, you can now make your</p>
      <p>yacht available for bookings.</p>
      <p>available for bookings.</p>
      <p>We're excited to have you onboard!</p>`;
      } else if (role === "partner") {
        subject = "Welcome, Partner!";
        html = `<p>Hi ${Name},</p>
      <p>Welcome to Etoile Yachts! As a partner, you can now offer your</p>
      <p>products</p>
      <p>or services (e.g., water sports, catering, music) as part of yacht</p>
      services (e.g., water sports, catering, music) as part of yacht</p>
      <p>bookings.</p>
      <p>Let's grow together!</p>`;
      }

      await admin.firestore().collection("emails").add({
        to: email,
        message: {
          subject,
          html,
        },
      });
    },
);

exports.setUserRole = onCall(
    {region: region},
    async (data, context) => {
      const auth = admin.auth();
      const uid = data.uid;
      const role = data.role;

      const validRoles = ["consumer", "producer", "partner"];
      if (!validRoles.includes(role)) {
        throw new functions.https.HttpsError(
            "invalid-argument",
            "Invalid user role.",
        );
      }

      try {
        await auth.setCustomUserClaims(uid, {role});
        return {success: true, message: "User role updated successfully"};
      } catch (error) {
        throw new functions.https.HttpsError(
            "internal",
            "Error updating user role.",
        );
      }
    },
);