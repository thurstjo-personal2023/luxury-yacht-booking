/**
 * Media Validation Scheduler
 * 
 * This module provides functionality for scheduling media validation tasks
 * using Google Cloud Pub/Sub. It handles:
 * - Scheduled validation tasks (daily/weekly)
 * - On-demand validation triggered by API
 * - Task distribution across multiple workers
 */
const {PubSub} = require('@google-cloud/pubsub');
const admin = require('firebase-admin');
const {v4: uuidv4} = require('uuid');

// Default scheduler configuration
const DEFAULT_CONFIG = {
  topicName: 'media-validation-tasks',
  cronSchedule: '0 2 * * *', // 2 AM every day (UTC)
  timezone: 'UTC',
  batchSize: 50,
  collectionsToValidate: [
    'unified_yacht_experiences',
    'yacht_profiles',
    'products_add_ons',
    'articles_and_guides',
    'event_announcements'
  ],
  workerConfig: {
    autoFix: true,
    fixRelativeUrls: true,
    fixMediaTypes: true
  }
};

/**
 * Media Validation Scheduler
 * 
 * Manages scheduling and distribution of media validation tasks
 */
class MediaValidationScheduler {
  /**
   * Constructor
   * @param {Object} config Configuration options for the scheduler
   */
  constructor(config = {}) {
    // Merge user config with defaults
    this.config = {...DEFAULT_CONFIG, ...config};
    
    // Initialize Pub/Sub client
    this.pubSubClient = new PubSub();
    
    // Generate a unique ID for this scheduler instance
    this.instanceId = `scheduler-${uuidv4()}`;
    
    // Get Firestore instance if not provided
    this.db = admin.firestore();
  }
  
  /**
   * Initialize the scheduler
   * Creates Pub/Sub topic if it doesn't exist
   */
  async initialize() {
    try {
      console.log(`Initializing media validation scheduler (${this.instanceId})...`);
      
      // Create Pub/Sub topic if it doesn't exist
      const [topicExists] = await this.pubSubClient.topic(this.config.topicName).exists();
      
      if (!topicExists) {
        console.log(`Creating Pub/Sub topic: ${this.config.topicName}`);
        await this.pubSubClient.createTopic(this.config.topicName);
      }
      
      // Create tasks collection if it doesn't exist
      const tasksRef = this.db.collection('media_validation_tasks');
      const tasksDoc = await tasksRef.doc('__config__').get();
      
      if (!tasksDoc.exists) {
        await tasksRef.doc('__config__').set({
          initialized: true,
          schedulerConfig: this.config,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
      }
      
      console.log(`Media validation scheduler initialized successfully`);
      return true;
    } catch (error) {
      console.error('Error initializing media validation scheduler:', error);
      throw error;
    }
  }
  
  /**
   * Trigger media validation
   * @param {Object} metadata Additional metadata for the validation task
   * @returns {Promise<string>} Message ID of the published message
   */
  async triggerValidation(metadata = {}) {
    try {
      // Create a unique task ID
      const taskId = `task-${Date.now()}-${uuidv4().substring(0, 8)}`;
      
      // Get collections to validate (use defaults if not provided)
      const collections = metadata.collections || this.config.collectionsToValidate;
      
      // Create task data
      const taskData = {
        taskId,
        collections,
        timestamp: Date.now(),
        schedulerInstance: this.instanceId,
        batchSize: this.config.batchSize,
        workerConfig: this.config.workerConfig,
        ...metadata
      };
      
      // Save task to Firestore
      await this.db.collection('media_validation_tasks').doc(taskId).set({
        ...taskData,
        status: 'pending',
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      // Publish message to Pub/Sub
      const dataBuffer = Buffer.from(JSON.stringify(taskData));
      const messageId = await this.pubSubClient.topic(this.config.topicName).publish(dataBuffer);
      
      console.log(`Published validation task ${taskId} with message ID: ${messageId}`);
      
      return messageId;
    } catch (error) {
      console.error('Error triggering media validation:', error);
      throw error;
    }
  }
  
  /**
   * Get validation reports
   * @param {number} limit Maximum number of reports to return
   * @returns {Promise<Array>} Array of validation reports
   */
  async getValidationReports(limit = 10) {
    try {
      // Get reports from Firestore, sorted by timestamp
      const reportsSnapshot = await this.db.collection('media_validation_reports')
        .orderBy('started', 'desc')
        .limit(limit)
        .get();
      
      // Map to array of reports
      const reports = [];
      reportsSnapshot.forEach(doc => {
        reports.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      return reports;
    } catch (error) {
      console.error('Error getting validation reports:', error);
      throw error;
    }
  }
}

/**
 * Schedule media validation
 * 
 * This function is called by the onSchedule trigger
 * It publishes a message to the Pub/Sub topic to trigger validation
 */
async function scheduleMediaValidation(event) {
  try {
    // Create scheduler instance with default config
    const scheduler = new MediaValidationScheduler();
    
    // Initialize if needed
    await scheduler.initialize();
    
    // Trigger validation with scheduled metadata
    const messageId = await scheduler.triggerValidation({
      requestedBy: 'scheduler',
      requestedAt: new Date().toISOString(),
      scheduled: true,
      description: 'Scheduled media validation task'
    });
    
    console.log(`Scheduled media validation triggered successfully with message ID: ${messageId}`);
    return { success: true, messageId };
  } catch (error) {
    console.error('Error scheduling media validation:', error);
    throw error;
  }
}

// Export the scheduler class and the schedule function
module.exports = {
  MediaValidationScheduler,
  scheduleMediaValidation,
  DEFAULT_CONFIG
};