/**
 * Media Validation Scheduler
 * 
 * This module handles scheduling and coordination of media validation tasks.
 * It interfaces with the Pub/Sub system to schedule validation jobs and track progress.
 */
const admin = require("../src/utils/firebaseAdmin");
const { logger } = require("../src/utils/logging");
const { PubSub } = require("@google-cloud/pubsub");

// Default configuration for the scheduler
const DEFAULT_CONFIG = {
  // Default collections to validate
  collections: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'articles_and_guides',
    'event_announcements'
  ],
  
  // Scheduler configuration
  scheduleName: 'media-validation-daily',
  topicName: 'media-validation-tasks',
  cronSchedule: '0 2 * * *', // 2 AM every day
  timezone: 'UTC',
  
  // Task settings
  batchSize: 50,
  
  // Worker configuration
  workerConfig: {
    autoFix: true,
    fixRelativeUrls: true,
    fixMediaTypes: true,
    saveValidationResults: true,
    resultsCollection: 'media_validation_reports',
    tasksCollection: 'media_validation_tasks',
    placeholderImage: 'https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht-placeholder.jpg'
  }
};

/**
 * Media Validation Scheduler
 */
class MediaValidationScheduler {
  /**
   * Create a new scheduler
   * 
   * @param {Object} config - Configuration options
   */
  constructor(config = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.pubsub = new PubSub();
    this.db = admin.firestore();
    this.topic = this.pubsub.topic(this.config.topicName);
  }
  
  /**
   * Initialize the scheduler
   * Ensures the Pub/Sub topic exists and any other required setup
   */
  async initialize() {
    // Check if topic exists, create if not
    try {
      const [topicExists] = await this.topic.exists();
      if (!topicExists) {
        logger.info(`Creating Pub/Sub topic: ${this.config.topicName}`);
        await this.topic.create();
      }
      logger.info('Media validation scheduler initialized successfully');
      return true;
    } catch (error) {
      logger.error('Error initializing media validation scheduler:', error);
      throw error;
    }
  }
  
  /**
   * Trigger validation for a set of collections
   * 
   * @param {Object} metadata - Additional metadata for the validation run
   * @returns {Promise<string>} - The message ID from Pub/Sub
   */
  async triggerValidation(metadata = {}) {
    try {
      // Create a unique ID for this validation run
      const validationId = this.db.collection(this.config.workerConfig.resultsCollection).doc().id;
      
      // Default metadata
      const defaultMetadata = {
        validationId,
        timestamp: Date.now(),
        requestedAt: new Date().toISOString(),
        requestedBy: 'scheduler',
        collections: this.config.collections
      };
      
      // Combine with user metadata
      const messageData = {
        ...defaultMetadata,
        ...metadata
      };
      
      // Create initial validation record in Firestore
      await this.db.collection(this.config.workerConfig.resultsCollection)
        .doc(validationId)
        .set({
          started: admin.firestore.FieldValue.serverTimestamp(),
          status: 'running',
          collections: messageData.collections.reduce((acc, collection) => {
            acc[collection] = { processed: 0, fixed: 0, errors: 0, invalidUrls: 0 };
            return acc;
          }, {}),
          metadata: messageData,
          totalCollections: messageData.collections.length,
          completedCollections: 0
        });
      
      // Publish message to Pub/Sub topic
      const dataBuffer = Buffer.from(JSON.stringify(messageData));
      const messageId = await this.topic.publish(dataBuffer);
      
      logger.info(`Triggered media validation with ID: ${validationId}`);
      
      return messageId;
    } catch (error) {
      logger.error('Error triggering media validation:', error);
      throw error;
    }
  }
  
  /**
   * Process a validation task from Pub/Sub
   * 
   * @param {Object} message - The Pub/Sub message
   * @returns {Promise<Object>} - Result of processing
   */
  async handleValidationTask(message) {
    try {
      // Parse the message data
      const messageData = message.data 
        ? JSON.parse(Buffer.from(message.data, 'base64').toString())
        : {};
      
      logger.info(`Handling media validation task: ${JSON.stringify({
        validationId: messageData.validationId,
        collections: messageData.collections ? messageData.collections.length : 0
      })}`);
      
      // If this is just a trigger message, schedule batch tasks for each collection
      if (messageData.collections && !messageData.batch) {
        await this.scheduleBatchTasks(messageData);
        return { success: true, message: 'Batch tasks scheduled' };
      }
      
      // Otherwise, this is a batch task - dispatch to worker
      return { success: true, message: 'Batch processed' };
    } catch (error) {
      logger.error('Error handling validation task:', error);
      throw error;
    }
  }
  
  /**
   * Schedule batch tasks for collections
   * Breaks validation into smaller batch tasks for processing
   * 
   * @param {Object} validationData - Data for the validation run
   */
  async scheduleBatchTasks(validationData) {
    const { validationId, collections } = validationData;
    
    try {
      // For each collection, schedule batch tasks
      for (const collection of collections) {
        // Get collection size
        const snapshot = await this.db.collection(collection).count().get();
        const documentCount = snapshot.data().count;
        
        // Calculate number of batches needed
        const batchSize = this.config.batchSize;
        const batchCount = Math.ceil(documentCount / batchSize);
        
        logger.info(`Scheduling ${batchCount} batches for collection ${collection}`);
        
        // Create a task for each batch
        for (let i = 0; i < batchCount; i++) {
          const batchTask = {
            validationId,
            collection,
            batchIndex: i,
            totalBatches: batchCount,
            startIndex: i * batchSize,
            batchSize,
            timestamp: Date.now()
          };
          
          // Publish batch task to Pub/Sub
          const dataBuffer = Buffer.from(JSON.stringify(batchTask));
          await this.topic.publish(dataBuffer);
          
          // Record the task in Firestore
          await this.db.collection(this.config.workerConfig.tasksCollection).add({
            ...batchTask,
            status: 'scheduled',
            scheduledAt: admin.firestore.FieldValue.serverTimestamp()
          });
        }
      }
      
      return true;
    } catch (error) {
      logger.error(`Error scheduling batch tasks for validation ${validationId}:`, error);
      
      // Update validation status in Firestore
      await this.db.collection(this.config.workerConfig.resultsCollection)
        .doc(validationId)
        .update({
          status: 'error',
          error: error.message,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        });
      
      throw error;
    }
  }
  
  /**
   * Get validation tasks
   * 
   * @param {number} limit - Maximum number of tasks to return
   * @returns {Promise<Array>} - List of validation tasks
   */
  async getValidationTasks(limit = 10) {
    try {
      const tasksSnapshot = await this.db
        .collection(this.config.workerConfig.tasksCollection)
        .orderBy('timestamp', 'desc')
        .limit(limit)
        .get();
      
      const tasks = [];
      tasksSnapshot.forEach(doc => {
        tasks.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return tasks;
    } catch (error) {
      logger.error('Error getting validation tasks:', error);
      throw error;
    }
  }
  
  /**
   * Get validation reports
   * 
   * @param {number} limit - Maximum number of reports to return
   * @returns {Promise<Array>} - List of validation reports
   */
  async getValidationReports(limit = 10) {
    try {
      const reportsSnapshot = await this.db
        .collection(this.config.workerConfig.resultsCollection)
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
      
      return reports;
    } catch (error) {
      logger.error('Error getting validation reports:', error);
      throw error;
    }
  }
}

/**
 * Schedule media validation
 * This is used by the scheduled Cloud Function
 */
async function scheduleMediaValidation(context) {
  try {
    const scheduler = new MediaValidationScheduler();
    await scheduler.initialize();
    
    const messageId = await scheduler.triggerValidation({
      requestedBy: 'cron',
      requestedAt: new Date().toISOString(),
      description: 'Scheduled media validation run'
    });
    
    logger.info(`Scheduled media validation successfully with message ID: ${messageId}`);
    return messageId;
  } catch (error) {
    logger.error('Error scheduling media validation:', error);
    throw error;
  }
}

module.exports = {
  MediaValidationScheduler,
  scheduleMediaValidation
};