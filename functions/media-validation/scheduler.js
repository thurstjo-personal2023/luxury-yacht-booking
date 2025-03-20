/**
 * Media Validation Scheduler
 * 
 * This module implements a scheduler for periodic media validation tasks.
 * It manages validation schedules and triggers validation tasks at the configured intervals.
 */

const admin = require('firebase-admin');
const functions = require('firebase-functions');

/**
 * Get active validation schedules from Firestore
 * 
 * @returns Array of active schedules
 */
async function getActiveSchedules() {
  // Get schedules from Firestore
  const snapshot = await admin.firestore()
    .collection('media_validation_schedules')
    .where('enabled', '==', true)
    .get();
    
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Check if a schedule is due to run
 * 
 * @param schedule The schedule to check
 * @returns true if the schedule should run now
 */
function isScheduleDue(schedule) {
  // Get current time
  const now = Date.now();
  
  // If no last run time, schedule is due
  if (!schedule.lastRunTime) {
    return true;
  }
  
  // Calculate next run time
  const lastRunTime = schedule.lastRunTime.toMillis ? 
    schedule.lastRunTime.toMillis() : 
    new Date(schedule.lastRunTime).getTime();
  
  const intervalMs = (schedule.intervalHours || 24) * 60 * 60 * 1000;
  const nextRunTime = lastRunTime + intervalMs;
  
  // Check if next run time has passed
  return now >= nextRunTime;
}

/**
 * Update the last run time for a schedule
 * 
 * @param scheduleId ID of the schedule to update
 */
async function updateScheduleLastRunTime(scheduleId) {
  await admin.firestore()
    .collection('media_validation_schedules')
    .doc(scheduleId)
    .update({
      lastRunTime: admin.firestore.FieldValue.serverTimestamp(),
      lastStatus: 'running'
    });
}

/**
 * Update the status of a schedule
 * 
 * @param scheduleId ID of the schedule to update
 * @param status New status ('success', 'error')
 * @param resultId Optional ID of the result document
 * @param error Optional error message
 */
async function updateScheduleStatus(scheduleId, status, resultId, error) {
  const updateData = {
    lastStatus: status,
    lastCompleteTime: admin.firestore.FieldValue.serverTimestamp()
  };
  
  if (resultId) {
    updateData.lastResultId = resultId;
  }
  
  if (error) {
    updateData.lastError = error;
  }
  
  await admin.firestore()
    .collection('media_validation_schedules')
    .doc(scheduleId)
    .update(updateData);
}

/**
 * Schedule and execute a validation task
 * 
 * @param pubsub The Cloud Pub/Sub client
 * @param schedule The schedule to execute
 */
async function executeSchedule(pubsub, schedule) {
  try {
    console.log(`Executing schedule ${schedule.id} - ${schedule.name}`);
    
    // Update last run time
    await updateScheduleLastRunTime(schedule.id);
    
    // Publish a message to trigger validation
    const topicName = 'media-validation';
    const messageData = {
      scheduleId: schedule.id,
      validateUrls: true,
      fixRelativeUrls: schedule.fixRelativeUrls === true,
      collections: schedule.collections || [],
      taskId: `scheduled-${schedule.id}-${Date.now()}`
    };
    
    // Convert object to base64 string for pub/sub
    const dataBuffer = Buffer.from(JSON.stringify(messageData));
    
    // Publish message
    await pubsub.topic(topicName).publish(dataBuffer);
    
    console.log(`Published validation task for schedule ${schedule.id}`);
  } catch (error) {
    console.error(`Error executing schedule ${schedule.id}:`, error);
    
    // Update schedule status
    await updateScheduleStatus(
      schedule.id, 
      'error',
      null, 
      error.message
    );
  }
}

/**
 * Check for due schedules and execute them
 * 
 * @param pubsub The Cloud Pub/Sub client
 */
async function checkAndExecuteSchedules(pubsub) {
  try {
    console.log('Checking for due validation schedules...');
    
    // Get active schedules
    const schedules = await getActiveSchedules();
    console.log(`Found ${schedules.length} active schedules`);
    
    // Check which schedules are due
    const dueSchedules = schedules.filter(isScheduleDue);
    console.log(`Found ${dueSchedules.length} due schedules`);
    
    // Execute due schedules
    for (const schedule of dueSchedules) {
      await executeSchedule(pubsub, schedule);
    }
  } catch (error) {
    console.error('Error checking and executing schedules:', error);
  }
}

/**
 * Create a Cloud Function to periodically check validation schedules
 * 
 * @returns Cloud Function that checks schedules
 */
function createScheduleCheckerFunction() {
  // Run every 10 minutes
  return functions.pubsub.schedule('every 10 minutes').onRun(async (context) => {
    try {
      const pubsub = admin.pubsub();
      await checkAndExecuteSchedules(pubsub);
      return null;
    } catch (error) {
      console.error('Error in schedule checker function:', error);
      return null;
    }
  });
}

/**
 * Create a Cloud Function to handle validation completion
 * 
 * @returns Cloud Function that handles validation completion events
 */
function createValidationCompletionHandler() {
  return functions.firestore
    .document('media_validation_reports/{reportId}')
    .onCreate(async (snapshot, context) => {
      try {
        const report = snapshot.data();
        const { scheduleId } = report.metadata || {};
        
        // If this report wasn't from a schedule, skip
        if (!scheduleId) {
          return null;
        }
        
        console.log(`Handling validation completion for schedule ${scheduleId}`);
        
        // Update schedule status
        await updateScheduleStatus(
          scheduleId,
          'success',
          snapshot.id
        );
        
        return null;
      } catch (error) {
        console.error('Error handling validation completion:', error);
        return null;
      }
    });
}

module.exports = {
  getActiveSchedules,
  isScheduleDue,
  checkAndExecuteSchedules,
  createScheduleCheckerFunction,
  createValidationCompletionHandler
};