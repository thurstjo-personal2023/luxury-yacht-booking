/**
 * Firebase Cloud Functions for Media Validation
 * 
 * This module exports Cloud Functions that handle media validation tasks.
 */
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { MediaValidationWorker } = require('./media-validation/worker');
const { MediaValidationScheduler } = require('./media-validation/scheduler');

// Initialize Firebase Admin SDK 
// (if not already initialized in the application)
if (!admin.apps.length) {
  admin.initializeApp();
}

// Shared configuration
const config = {
  firestore: admin.firestore(),
  projectId: process.env.GCLOUD_PROJECT,
  topicName: 'media-validation-tasks',
  collectionNames: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'articles_and_guides',
    'service_provider_profiles',
    'user_profiles_tourist'
  ],
  baseUrl: 'https://etoile-yachts.web.app',
  schedules: {
    validateAll: {
      enabled: true,
      intervalHours: 24 // Daily validation
    },
    fixRelativeUrls: {
      enabled: true,
      intervalHours: 24 * 7 // Weekly auto-fix
    }
  }
};

// Create worker and scheduler instances
const createWorker = () => new MediaValidationWorker({
  ...config,
  enablePubSub: true
});

const createScheduler = () => new MediaValidationScheduler(config);

/**
 * HTTP endpoint to run the media validation scheduler
 */
exports.runScheduler = functions.https.onRequest(async (req, res) => {
  try {
    const scheduler = createScheduler();
    
    // Initialize schedules if needed
    await scheduler.initializeSchedules();
    
    // Run scheduler
    const runCount = await scheduler.run();
    
    res.status(200).json({
      status: 'success',
      message: `Scheduler ran successfully. Processed ${runCount} schedules.`
    });
  } catch (error) {
    console.error('Error running scheduler:', error);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * Background function to run media validation worker
 */
exports.processMediaValidationTasks = functions.pubsub.schedule('every 15 minutes').onRun(async (context) => {
  try {
    const worker = createWorker();
    
    // Process up to 5 tasks at a time
    const processedCount = await worker.run({ processLimit: 5 });
    
    console.log(`Processed ${processedCount} tasks`);
    return null;
  } catch (error) {
    console.error('Error processing validation tasks:', error);
    throw error;
  }
});

/**
 * HTTP endpoint to trigger validation for all collections
 */
exports.validateAllMedia = functions.https.onRequest(async (req, res) => {
  try {
    const scheduler = createScheduler();
    
    // Create a one-time validation task
    const taskId = await scheduler.createOneTimeTask('validate-all');
    
    res.status(200).json({
      status: 'success',
      taskId,
      message: 'Media validation task created successfully'
    });
  } catch (error) {
    console.error('Error creating validation task:', error);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * HTTP endpoint to trigger validation for a specific collection
 */
exports.validateCollection = functions.https.onRequest(async (req, res) => {
  try {
    const { collection } = req.query;
    
    if (!collection) {
      return res.status(400).json({
        status: 'error',
        message: 'Collection name is required'
      });
    }
    
    const scheduler = createScheduler();
    
    // Create a one-time validation task for the collection
    const taskId = await scheduler.createOneTimeTask('validate-collection', {
      collectionName: collection
    });
    
    res.status(200).json({
      status: 'success',
      taskId,
      collection,
      message: `Media validation task created for collection: ${collection}`
    });
  } catch (error) {
    console.error('Error creating validation task:', error);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * HTTP endpoint to fix relative URLs in all collections
 */
exports.fixRelativeUrls = functions.https.onRequest(async (req, res) => {
  try {
    const scheduler = createScheduler();
    
    // Create a one-time task to fix relative URLs
    const taskId = await scheduler.createOneTimeTask('fix-relative-urls');
    
    res.status(200).json({
      status: 'success',
      taskId,
      message: 'Relative URL fix task created successfully'
    });
  } catch (error) {
    console.error('Error creating URL fix task:', error);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unknown error occurred'
    });
  }
});

/**
 * Pub/Sub triggered function to process a validation task
 */
exports.processValidationTask = functions.pubsub.topic('media-validation-tasks').onPublish(async (message) => {
  try {
    const worker = createWorker();
    
    // Handle the Pub/Sub message
    await worker.handlePubSubMessage(message);
    
    return null;
  } catch (error) {
    console.error('Error processing validation task:', error);
    throw error;
  }
});

/**
 * Background function to initialize schedules on deployment
 */
exports.initializeValidationSchedules = functions.pubsub.schedule('every 24 hours').onRun(async (context) => {
  try {
    const scheduler = createScheduler();
    
    // Initialize schedules
    await scheduler.initializeSchedules();
    
    console.log('Validation schedules initialized successfully');
    return null;
  } catch (error) {
    console.error('Error initializing validation schedules:', error);
    throw error;
  }
});

// Optional: Admin API to manage schedules and validation tasks
exports.adminApi = functions.https.onRequest((req, res) => {
  // For security, check if the request is authenticated
  // You would likely implement authentication here
  
  /**
   * Route handler for admin API
   */
  const handleAdminApi = async () => {
    const path = req.path.split('/').filter(Boolean);
    
    if (path.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid API path'
      });
    }
    
    const scheduler = createScheduler();
    
    switch (path[0]) {
      case 'schedules':
        // GET /schedules - List all schedules
        if (req.method === 'GET' && path.length === 1) {
          const schedules = await scheduler.getSchedules();
          return res.status(200).json(schedules);
        }
        
        // PUT /schedules/:id - Update a schedule
        if (req.method === 'PUT' && path.length === 2) {
          const scheduleId = path[1];
          const updates = req.body;
          
          await scheduler.updateSchedule(scheduleId, updates);
          
          return res.status(200).json({
            status: 'success',
            message: `Schedule ${scheduleId} updated successfully`
          });
        }
        
        break;
        
      case 'tasks':
        // POST /tasks - Create a new task
        if (req.method === 'POST' && path.length === 1) {
          const { type, collectionName, documentId, parameters } = req.body;
          
          if (!type) {
            return res.status(400).json({
              status: 'error',
              message: 'Task type is required'
            });
          }
          
          const taskId = await scheduler.createOneTimeTask(type, {
            collectionName,
            documentId,
            parameters
          });
          
          return res.status(200).json({
            status: 'success',
            taskId,
            message: 'Task created successfully'
          });
        }
        
        break;
        
      default:
        return res.status(404).json({
          status: 'error',
          message: 'API endpoint not found'
        });
    }
    
    return res.status(404).json({
      status: 'error',
      message: 'API endpoint not found'
    });
  };
  
  // Handle the API request
  handleAdminApi().catch(error => {
    console.error('Error in admin API:', error);
    
    res.status(500).json({
      status: 'error',
      message: error.message || 'An unknown error occurred'
    });
  });
});