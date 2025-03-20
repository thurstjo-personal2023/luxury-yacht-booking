/**
 * Media Validation Scheduler
 * 
 * This module handles scheduling of media validation tasks at regular intervals.
 * It leverages Firebase Cloud Functions to trigger scheduled tasks using Pub/Sub,
 * providing a robust scheduling mechanism.
 */

import { MediaValidationWorker, MediaValidationWorkerConfig } from './worker';

/**
 * Configuration for the scheduler
 */
export interface SchedulerConfig {
  // Time-based settings
  scheduleExpression: string;    // Cron expression for the schedule
  timeZone: string;              // Time zone for the schedule
  
  // Task execution settings
  taskTopic: string;             // Pub/Sub topic for tasks
  maxConcurrentTasks: number;    // Maximum number of concurrent tasks
  
  // Validation configuration
  validationConfig: Partial<MediaValidationWorkerConfig>;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: SchedulerConfig = {
  scheduleExpression: '0 0 * * 0',      // Run at midnight every Sunday
  timeZone: 'Etc/UTC',                  // UTC time zone
  taskTopic: 'media-validation-tasks',  // Pub/Sub topic
  maxConcurrentTasks: 1,                // Run one task at a time
  validationConfig: {
    collectionsToValidate: [
      'unified_yacht_experiences',
      'yacht_profiles',
      'products_add_ons',
      'promotions_and_offers'
    ],
    collectionsToFix: [
      'unified_yacht_experiences',
      'yacht_profiles',
      'products_add_ons'
    ],
    autoFix: true,
    batchSize: 50,
    maxDocumentsToProcess: 1000,
    saveValidationResults: true,
    logProgress: true
  }
};

/**
 * Media validation task data
 */
export interface MediaValidationTask {
  taskId: string;
  startTime: string;
  config: Partial<MediaValidationWorkerConfig>;
  metadata?: Record<string, any>;
}

/**
 * Media Validation Scheduler
 * Handles scheduling and execution of media validation tasks
 */
export class MediaValidationScheduler {
  private config: SchedulerConfig;
  private firestoreProvider: () => any;
  private pubSubProvider: () => any;
  private taskStatus: Map<string, {
    status: 'queued' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    error?: string;
  }> = new Map();

  /**
   * Create a new media validation scheduler
   * 
   * @param firestoreProvider Function that returns a Firestore instance
   * @param pubSubProvider Function that returns a PubSub instance
   * @param config Scheduler configuration
   */
  constructor(
    firestoreProvider: () => any,
    pubSubProvider: () => any,
    config: Partial<SchedulerConfig> = {}
  ) {
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
    this.firestoreProvider = firestoreProvider;
    this.pubSubProvider = pubSubProvider;
  }

  /**
   * Schedule a validation task for immediate execution
   * 
   * @param customConfig Optional custom configuration for this task
   * @param metadata Optional metadata to attach to the task
   * @returns Task ID
   */
  async scheduleImmediateTask(
    customConfig: Partial<MediaValidationWorkerConfig> = {},
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const taskId = `task-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    const task: MediaValidationTask = {
      taskId,
      startTime: new Date().toISOString(),
      config: { ...this.config.validationConfig, ...customConfig },
      metadata
    };
    
    await this.publishTask(task);
    
    this.taskStatus.set(taskId, {
      status: 'queued',
      startTime: new Date()
    });
    
    return taskId;
  }

  /**
   * Publish a task to the Pub/Sub topic
   * 
   * @param task Task to publish
   */
  private async publishTask(task: MediaValidationTask): Promise<void> {
    const pubsub = this.pubSubProvider();
    
    try {
      const topic = pubsub.topic(this.config.taskTopic);
      
      // Create a JSON string of the message data
      const data = JSON.stringify(task);
      
      // Publish the message
      await topic.publish(Buffer.from(data));
      
      console.log(`Published task ${task.taskId} to topic ${this.config.taskTopic}`);
      
      // Save task to Firestore for tracking
      await this.saveTaskToFirestore(task);
    } catch (error) {
      console.error('Error publishing task:', error);
      throw error;
    }
  }

  /**
   * Save a task to Firestore for tracking
   * 
   * @param task Task to save
   */
  private async saveTaskToFirestore(task: MediaValidationTask): Promise<void> {
    const firestore = this.firestoreProvider();
    
    try {
      await firestore.collection('validation_tasks').doc(task.taskId).set({
        ...task,
        status: 'queued',
        queuedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving task to Firestore:', error);
    }
  }

  /**
   * Process a validation task
   * 
   * @param task Task to process
   * @returns Promise resolving when task is complete
   */
  async processTask(task: MediaValidationTask): Promise<void> {
    const firestore = this.firestoreProvider();
    
    try {
      // Update task status to running
      this.taskStatus.set(task.taskId, {
        status: 'running',
        startTime: new Date(task.startTime)
      });
      
      // Update task in Firestore
      await firestore.collection('validation_tasks').doc(task.taskId).update({
        status: 'running',
        startedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      // Create worker with task configuration
      const worker = new MediaValidationWorker(
        this.firestoreProvider,
        task.config
      );
      
      // Set up completion handler
      worker.onCompleted(async (report) => {
        // Update task status
        this.taskStatus.set(task.taskId, {
          status: 'completed',
          startTime: new Date(task.startTime),
          endTime: new Date()
        });
        
        // Update task in Firestore
        await firestore.collection('validation_tasks').doc(task.taskId).update({
          status: 'completed',
          completedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          reportId: report.id,
          result: {
            totalDocuments: report.totalDocuments,
            validUrls: report.validUrls,
            invalidUrls: report.invalidUrls,
            missingUrls: report.missingUrls,
            duration: report.duration
          }
        });
      });
      
      // Run the worker
      await worker.start();
    } catch (error) {
      // Update task status
      this.taskStatus.set(task.taskId, {
        status: 'failed',
        startTime: new Date(task.startTime),
        endTime: new Date(),
        error: error instanceof Error ? error.message : String(error)
      });
      
      // Update task in Firestore
      await firestore.collection('validation_tasks').doc(task.taskId).update({
        status: 'failed',
        failedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error)
      }).catch(console.error);
      
      console.error(`Task ${task.taskId} failed:`, error);
    }
  }

  /**
   * Get the status of a task
   * 
   * @param taskId Task ID
   * @returns Task status or null if not found
   */
  getTaskStatus(taskId: string): {
    status: 'queued' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    error?: string;
  } | null {
    return this.taskStatus.get(taskId) || null;
  }

  /**
   * Get a list of active tasks
   * 
   * @returns Map of task IDs to task status
   */
  getActiveTasks(): Map<string, {
    status: 'queued' | 'running' | 'completed' | 'failed';
    startTime: Date;
    endTime?: Date;
    error?: string;
  }> {
    return new Map(
      Array.from(this.taskStatus.entries())
        .filter(([_, status]) => status.status === 'queued' || status.status === 'running')
    );
  }
}