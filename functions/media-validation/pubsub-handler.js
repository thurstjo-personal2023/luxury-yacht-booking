/**
 * Pub/Sub Message Handler for Media Validation
 * 
 * This module handles incoming Pub/Sub messages for media validation tasks.
 * It serves as the entry point for the Cloud Function that processes media validation.
 */

const { processValidationJob } = require('./worker');

/**
 * Handle a Pub/Sub message for media validation
 * 
 * @param {Object} message - The Pub/Sub message
 * @param {Object} context - The event context
 * @returns {Promise<Object>} - Result of processing the message
 */
async function mediaValidationWorker(message, context) {
  console.log('Received media validation task from Pub/Sub');
  
  try {
    // Extract the message data
    const messageData = message.data 
      ? JSON.parse(Buffer.from(message.data, 'base64').toString())
      : {};
    
    console.log('Processing media validation task:', JSON.stringify({
      taskId: messageData.taskId || 'unknown',
      collections: Array.isArray(messageData.collections) 
        ? `${messageData.collections.length} collections`
        : (messageData.collectionName || 'all collections'),
      validateSingle: messageData.validateSingle || false
    }));
    
    // Process the validation job
    const result = await processValidationJob({
      json: messageData,
      id: context.eventId,
      publishTime: context.timestamp
    });
    
    console.log('Media validation task completed successfully:', {
      success: result.success,
      reportId: result.reportId,
      validateSingle: result.validateSingle || false
    });
    
    return result;
  } catch (error) {
    console.error('Error processing media validation task:', error);
    throw error;
  }
}

module.exports = { mediaValidationWorker };