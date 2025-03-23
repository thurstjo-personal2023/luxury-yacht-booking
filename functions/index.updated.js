/**
 * Import function triggers from their respective submodules:
 *
 * const { onCall } = require("firebase-functions/v2/https");
 * const { onDocumentWritten } = require("firebase-functions/v2/firestore");
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
const functions = require("firebase-functions");
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {onRequest, onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onMessagePublished} = require("firebase-functions/v2/pubsub");
const {Client} = require("@googlemaps/google-maps-services-js");
const {defineSecret} = require("firebase-functions/params");
const {getAuth} = require("firebase-admin/auth");
const {scheduleMediaValidation} = require("./media-validation/scheduler");
const {mediaValidationWorker} = require("./media-validation/worker");

// Define the secret
const googleMapsApiKey = defineSecret("GOOGLE_MAPS_API_KEY");

// Set the appropriate region for your functions
const region = "us-central1";

// Initialize Firebase Admin SDK
const admin = require("./src/utils/firebaseAdmin");
const db = admin.firestore();

// Firestore trigger for new user creation
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

      await db.collection("emails").add({
        to: email,
        message: {
          subject,
          html,
        },
      });
    },
);

// Initialize Google Maps Client
const mapsClient = new Client({});

exports.getLocation = onRequest(
    {secrets: [googleMapsApiKey], region: region},
    async (req, res) => {
      try {
        const data = req.body.data;

        if (!data || !data.address) {
          res.status(400).send({error: "Missing address parameter"});
          return;
        }

        const response = await mapsClient.geocode({
          params: {
            address: data.address,
            key: googleMapsApiKey.value(),
          },
        });

        if (response.data.results && response.data.results.length > 0) {
          const location = response.data.results[0].geometry.location;
          const formattedAddress = response.data.results[0].formatted_address;
          res.status(200).send({
            data: {
              lat: location.lat,
              lng: location.lng,
              address: formattedAddress,
            },
          });
        } else {
          res.status(404).send({error: "Location not found"});
        }
      } catch (error) {
        res.status(500).send({error: "Geocoding failed."});
      }
    },
);

const axios = require("axios");

exports.reverseGeocode = onRequest(
    {region: region},
    async (req, res) => {
      try {
        const {latitude, longitude} = req.body;

        if (!latitude || !longitude) {
          return res.status(400).send({
            error: "Latitude and longitude are required.",
          });
        }

        const apiKey = googleMapsApiKey.value();

        const response = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}`,
        );

        const results = response.data.results;
        if (results.length > 0) {
          const addressComponents = results[0].address_components;
          const country = addressComponents.find((component) =>
            component.types.includes("country"),
          );
          const formattedAddress =
          country && country.long_name === "United Arab Emirates" ?
            results[0].formatted_address :
            null;

          return res.status(200).send({address: formattedAddress});
        } else {
          return res.status(404).send({
            error: "No results found for the given coordinates.",
          });
        }
      } catch (error) {
        return res.status(500).send({error: "Internal server error."});
      }
    },
);

exports.setUserRole = onCall(
    {region: region},
    async (data, context) => {
      const auth = getAuth();
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

// EXISTING MEDIA VALIDATION FUNCTIONS
exports.scheduledMediaValidation = onSchedule(
    {
      schedule: "every 4 hours",
      region: "us-central1",
    },
    scheduleMediaValidation,
);

exports.processMediaValidation = onMessagePublished(
    {
      topic: "media-validation-tasks",
      region: "us-central1",
      timeoutSeconds: 540,
      memory: "1GiB",
    },
    mediaValidationWorker,
);

// NEW MEDIA VALIDATION FUNCTIONS
exports.triggerMediaValidation = onRequest(
    {
      region: "us-central1",
    },
    async (req, res) => {
      try {
        // Validate request method
        if (req.method !== 'POST') {
          return res.status(405).send({
            success: false,
            error: "Method not allowed. Use POST."
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
        
        // Create a topic
        const pubsub = admin.messaging();
        const topicName = 'media-validation-tasks';
        
        // Publish the message to Pub/Sub
        const messageId = await pubsub.send({
          topic: topicName,
          data: Buffer.from(JSON.stringify(messageData))
        });
        
        // Return success response
        return res.status(200).send({
          success: true,
          message: 'Media validation triggered successfully',
          messageId,
          taskId: messageData.taskId
        });
      } catch (error) {
        console.error('Error triggering media validation:', error);
        return res.status(500).send({
          success: false,
          error: error.message,
          message: 'Error triggering media validation'
        });
      }
    }
);

exports.getMediaValidationStatus = onRequest(
    {
      region: "us-central1",
    },
    async (req, res) => {
      try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const reportId = req.query.reportId;
        
        // If a specific report ID is requested, return that report
        if (reportId) {
          const reportDoc = await db.collection('media_validation_reports').doc(reportId).get();
          
          if (!reportDoc.exists) {
            return res.status(404).send({
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
          
          return res.status(200).send({
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
        
        return res.status(200).send({
          success: true,
          reports
        });
      } catch (error) {
        console.error('Error getting media validation status:', error);
        return res.status(500).send({
          success: false,
          error: error.message,
          message: 'Error getting media validation status'
        });
      }
    }
);

// Daily scheduled media validation (complementing the existing 4-hour schedule)
exports.dailyMediaValidation = onSchedule(
    {
      schedule: "0 0 * * *", // Run at midnight every day
      region: "us-central1",
      timeZone: "UTC",
    },
    async (context) => {
      try {
        // Create message data for a scheduled run
        const messageData = {
          taskId: `daily-${Date.now()}`,
          requestedBy: 'daily-scheduler',
          requestedAt: new Date().toISOString(),
          scheduled: true,
          fullValidation: true, // Flag for full validation
          collections: [
            'unified_yacht_experiences',
            'yacht_profiles',
            'products_add_ons',
            'articles_and_guides',
            'event_announcements'
          ]
        };
        
        // Create a topic
        const pubsub = admin.messaging();
        const topicName = 'media-validation-tasks';
        
        // Publish the message to Pub/Sub
        const messageId = await pubsub.send({
          topic: topicName,
          data: Buffer.from(JSON.stringify(messageData))
        });
        
        console.log('Daily scheduled media validation triggered successfully:', messageId);
        return null;
      } catch (error) {
        console.error('Error triggering daily media validation:', error);
        throw error;
      }
    }
);