/**
 * Media Validation Scheduler
 * 
 * This module handles scheduling media validation jobs:
 * 1. Creates and manages Pub/Sub topics for media validation
 * 2. Schedules periodic validation jobs
 * 3. Triggers immediate validation when requested
 */

const admin = require('firebase-admin');
const { PubSub } = require('@google-cloud/pubsub');

// Constants for scheduler operation
const VALIDATION_TOPIC = 'media-validation';
const DEFAULT_SCHEDULE = '0 0 * * *'; // Daily at midnight

/**
 * Initialize the Pub/Sub topic for media validation
 * 
 * @returns {Promise<Object>} - Information about the created/existing topic
 */
async function initializeValidationTopic() {
  try {
    const pubsub = new PubSub();
    
    // Check if topic exists
    const [topics] = await pubsub.getTopics();
    const topicExists = topics.some(topic => 
      topic.name.endsWith(`/${VALIDATION_TOPIC}`)
    );
    
    // Create topic if it doesn't exist
    if (!topicExists) {
      const [topic] = await pubsub.createTopic(VALIDATION_TOPIC);
      console.log(`Media validation topic ${topic.name} created.`);
      return { 
        success: true, 
        message: `Topic ${topic.name} created`,
        topicName: topic.name
      };
    } else {
      console.log(`Media validation topic ${VALIDATION_TOPIC} already exists.`);
      return { 
        success: true, 
        message: `Topic ${VALIDATION_TOPIC} already exists`,
        topicName: VALIDATION_TOPIC
      };
    }
  } catch (error) {
    console.error('Error initializing validation topic:', error);
    return { 
      success: false, 
      error: error.message 
    };
  }
}

/**
 * Schedule a media validation job
 * 
 * @param {Object} options - Scheduling options
 * @returns {Promise<Object>} - Information about the scheduled job
 */
async function scheduleValidationJob(options = {}) {
  const {
    schedule = DEFAULT_SCHEDULE,
    collections = null,
    description = 'Scheduled media validation',
    immediate = false
  } = options;
  
  try {
    const db = admin.firestore();
    const pubsub = new PubSub();
    
    // Make sure topic exists
    await initializeValidationTopic();
    
    // Create a scheduled job record if not immediate
    let jobId = null;
    
    if (!immediate) {
      const jobRef = db.collection('media_validation_jobs').doc();
      jobId = jobRef.id;
      
      await jobRef.set({
        schedule,
        collections,
        description,
        status: 'scheduled',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    // Create job payload
    const data = {
      jobId,
      collections,
      timestamp: Date.now(),
      scheduled: !immediate
    };
    
    // Publish message to topic
    const dataBuffer = Buffer.from(JSON.stringify(data));
    const messageId = await pubsub.topic(VALIDATION_TOPIC).publish(dataBuffer);
    
    // Update job record with message ID if not immediate
    if (!immediate) {
      await db.collection('media_validation_jobs').doc(jobId).update({
        messageId,
        status: 'published',
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    return {
      success: true,
      jobId,
      messageId,
      immediate
    };
  } catch (error) {
    console.error('Error scheduling validation job:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Request immediate validation for a specific document
 * 
 * @param {string} collectionName - Collection containing the document
 * @param {string} documentId - ID of the document to validate
 * @returns {Promise<Object>} - Result of the validation request
 */
async function requestImmediateValidation(collectionName, documentId) {
  try {
    const pubsub = new PubSub();
    
    // Make sure topic exists
    await initializeValidationTopic();
    
    // Create job payload for single document validation
    const data = {
      validateSingle: true,
      collectionName,
      documentId,
      timestamp: Date.now()
    };
    
    // Publish message to topic
    const dataBuffer = Buffer.from(JSON.stringify(data));
    const messageId = await pubsub.topic(VALIDATION_TOPIC).publish(dataBuffer);
    
    return {
      success: true,
      messageId,
      collectionName,
      documentId
    };
  } catch (error) {
    console.error('Error requesting immediate validation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process the daily scheduled validation
 * 
 * @returns {Promise<Object>} - Result of scheduling the daily validation
 */
async function processDailyValidation() {
  try {
    // Schedule validation for all collections
    const result = await scheduleValidationJob({
      description: 'Daily scheduled media validation',
      immediate: true
    });
    
    console.log('Daily media validation triggered:', result);
    
    return {
      success: true,
      result
    };
  } catch (error) {
    console.error('Error processing daily validation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  initializeValidationTopic,
  scheduleValidationJob,
  requestImmediateValidation,
  processDailyValidation
};