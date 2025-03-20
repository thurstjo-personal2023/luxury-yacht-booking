/**
 * Media Validation Scheduler
 * 
 * This module provides functionality for scheduling media validation tasks.
 * It uses Cloud Pub/Sub to run background jobs.
 */

import { Firestore } from 'firebase-admin/firestore';
import { PubSub, Message } from '@google-cloud/pubsub';
import { 
  MediaValidationWorker, 
  MediaValidationWorkerConfig, 
  DEFAULT_WORKER_CONFIG 
} from './worker';
import { ValidationReport } from './media-validation';

/**
 * Task status enumeration
 */
export enum TaskStatus {
  QUEUED = 'queued',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Validation task
 */
export interface MediaValidationTask {
  id: string;
  scheduledBy: string;
  scheduledAt: Date | string;
  startedAt?: Date | string;
  completedAt?: Date | string;
  status: TaskStatus;
  workerConfig: Partial<MediaValidationWorkerConfig>;
  metadata?: any;
  error?: string;
  reportId?: string;
}

/**
 * Scheduler configuration
 */
export interface MediaValidationSchedulerConfig {
  scheduleName: string;
  topicName: string;
  subscriptionName: string;
  cronSchedule: string;
  timezone: string;
  description: string;
  taskCollection: string;
  workerConfig: Partial<MediaValidationWorkerConfig>;
}

/**
 * Default scheduler configuration
 */
export const DEFAULT_SCHEDULER_CONFIG: MediaValidationSchedulerConfig = {
  scheduleName: 'media-validation-scheduler',
  topicName: 'media-validation-tasks',
  subscriptionName: 'media-validation-tasks-subscription',
  cronSchedule: '0 3 * * *', // 3 AM every day
  timezone: 'UTC',
  description: 'Schedule media validation jobs',
  taskCollection: 'validation_tasks',
  workerConfig: {
    ...DEFAULT_WORKER_CONFIG,
    autoFix: true
  }
};

/**
 * Media Validation Scheduler
 */
export class MediaValidationScheduler {
  private config: MediaValidationSchedulerConfig;
  private firestoreGetter: () => Firestore;
  private pubsubGetter: () => PubSub;
  
  /**
   * Create a new media validation scheduler
   * 
   * @param firestoreGetter Function that returns a Firestore instance
   * @param pubsubGetter Function that returns a PubSub instance
   * @param config Scheduler configuration
   */
  constructor(
    firestoreGetter: () => Firestore,
    pubsubGetter: () => PubSub,
    config: Partial<MediaValidationSchedulerConfig> = {}
  ) {
    this.firestoreGetter = firestoreGetter;
    this.pubsubGetter = pubsubGetter;
    this.config = { ...DEFAULT_SCHEDULER_CONFIG, ...config };
  }
  
  /**
   * Initialize the scheduler
   * This sets up the required Pub/Sub topic and subscription
   * 
   * @returns Promise resolving when initialization is complete
   */
  async initialize(): Promise<void> {
    const pubsub = this.pubsubGetter();
    
    try {
      // Create topic if it doesn't exist
      try {
        await pubsub.createTopic(this.config.topicName);
        console.log(`Created topic: ${this.config.topicName}`);
      } catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`Topic ${this.config.topicName} already exists`);
        } else {
          throw error;
        }
      }
      
      // Create subscription if it doesn't exist
      try {
        await pubsub.topic(this.config.topicName).createSubscription(
          this.config.subscriptionName,
          {
            ackDeadlineSeconds: 600, // 10 minutes
            expirationPolicy: {} // Never expire
          }
        );
        console.log(`Created subscription: ${this.config.subscriptionName}`);
      } catch (error) {
        if (error.code === 6) { // ALREADY_EXISTS
          console.log(`Subscription ${this.config.subscriptionName} already exists`);
        } else {
          throw error;
        }
      }
      
      console.log('Media validation scheduler initialized');
    } catch (error) {
      console.error('Error initializing scheduler:', error);
      throw error;
    }
  }
  
  /**
   * Trigger validation manually
   * 
   * @param metadata Optional metadata for the task
   * @returns Promise resolving to message ID
   */
  async triggerValidation(metadata: any = {}): Promise<string> {
    const pubsub = this.pubsubGetter();
    const db = this.firestoreGetter();
    
    try {
      // Create task ID
      const taskId = `manual-${Date.now()}`;
      
      // Create task
      const task: MediaValidationTask = {
        id: taskId,
        scheduledBy: 'manual',
        scheduledAt: new Date().toISOString(),
        status: TaskStatus.QUEUED,
        workerConfig: this.config.workerConfig,
        metadata
      };
      
      // Save task to Firestore
      await db.collection(this.config.taskCollection).doc(taskId).set({
        ...task,
        scheduledAt: new Date() // Convert to Firestore timestamp
      });
      
      // Publish message to Pub/Sub
      const messageData = Buffer.from(JSON.stringify({
        taskId,
        action: 'validate',
        scheduledAt: new Date().toISOString(),
        workerConfig: this.config.workerConfig,
        metadata
      }));
      
      const messageId = await pubsub
        .topic(this.config.topicName)
        .publish(messageData);
      
      console.log(`Triggered validation with task ID: ${taskId}`);
      
      return messageId;
    } catch (error) {
      console.error('Error triggering validation:', error);
      throw error;
    }
  }
  
  /**
   * Handle a validation task from Pub/Sub
   * 
   * @param message Pub/Sub message
   * @returns Promise resolving when task is handled
   */
  async handleValidationTask(message: Message): Promise<void> {
    const db = this.firestoreGetter();
    
    try {
      // Parse message data
      const data = JSON.parse(message.data.toString());
      const { taskId, action, workerConfig, metadata } = data;
      
      console.log(`Handling validation task ${taskId}`);
      
      // Check if task exists
      const taskRef = db.collection(this.config.taskCollection).doc(taskId);
      const taskDoc = await taskRef.get();
      
      if (!taskDoc.exists) {
        console.error(`Task ${taskId} not found`);
        return;
      }
      
      // Update task status
      await taskRef.update({
        status: TaskStatus.RUNNING,
        startedAt: new Date()
      });
      
      // Create media validation worker
      const worker = new MediaValidationWorker(
        () => db,
        {
          ...this.config.workerConfig,
          ...workerConfig
        },
        // Progress callback
        (progress) => {
          console.log(`Progress: ${progress.processedDocuments}/${progress.totalDocuments} documents (${progress.percentage}%)`);
        },
        // Error callback
        (error) => {
          console.error(`Error in validation worker: ${error.message}`);
        },
        // Complete callback
        async (report) => {
          console.log(`Validation completed: ${report.id}`);
          
          // Update task status
          await taskRef.update({
            status: TaskStatus.COMPLETED,
            completedAt: new Date(),
            reportId: report.id
          });
        }
      );
      
      // Run validation
      const report = await worker.runValidation();
      
      // Update task status if not already updated
      const updatedTaskDoc = await taskRef.get();
      const updatedTask = updatedTaskDoc.data() as MediaValidationTask;
      
      if (updatedTask.status !== TaskStatus.COMPLETED) {
        await taskRef.update({
          status: TaskStatus.COMPLETED,
          completedAt: new Date(),
          reportId: report.id
        });
      }
      
      // Acknowledge message
      message.ack();
    } catch (error) {
      console.error('Error handling validation task:', error);
      
      // Update task status if taskId is available
      try {
        const data = JSON.parse(message.data.toString());
        const { taskId } = data;
        
        if (taskId) {
          await db.collection(this.config.taskCollection).doc(taskId).update({
            status: TaskStatus.FAILED,
            error: error.message || 'Unknown error',
            completedAt: new Date()
          });
        }
      } catch (updateError) {
        console.error('Error updating task status:', updateError);
      }
      
      // Acknowledge message to prevent redelivery
      message.ack();
      
      throw error;
    }
  }
  
  /**
   * Get a list of validation tasks
   * 
   * @param limit Maximum number of tasks to retrieve
   * @returns Promise resolving to list of tasks
   */
  async getValidationTasks(limit: number = 10): Promise<MediaValidationTask[]> {
    const db = this.firestoreGetter();
    
    try {
      const snapshot = await db.collection(this.config.taskCollection)
        .orderBy('scheduledAt', 'desc')
        .limit(limit)
        .get();
      
      if (snapshot.empty) {
        return [];
      }
      
      const tasks: MediaValidationTask[] = [];
      
      snapshot.forEach(doc => {
        const task = doc.data() as MediaValidationTask;
        tasks.push(task);
      });
      
      return tasks;
    } catch (error) {
      console.error('Error getting validation tasks:', error);
      throw error;
    }
  }
  
  /**
   * Get a validation task by ID
   * 
   * @param taskId Task ID
   * @returns Promise resolving to task
   */
  async getValidationTask(taskId: string): Promise<MediaValidationTask | null> {
    const db = this.firestoreGetter();
    
    try {
      const doc = await db.collection(this.config.taskCollection).doc(taskId).get();
      
      if (!doc.exists) {
        return null;
      }
      
      return doc.data() as MediaValidationTask;
    } catch (error) {
      console.error(`Error getting validation task ${taskId}:`, error);
      throw error;
    }
  }
  
  /**
   * Get validation report for a task
   * 
   * @param taskId Task ID
   * @returns Promise resolving to validation report
   */
  async getValidationReport(taskId: string): Promise<ValidationReport | null> {
    const db = this.firestoreGetter();
    
    try {
      // Get task
      const taskDoc = await db.collection(this.config.taskCollection).doc(taskId).get();
      
      if (!taskDoc.exists) {
        return null;
      }
      
      const task = taskDoc.data() as MediaValidationTask;
      
      if (!task.reportId) {
        return null;
      }
      
      // Get report
      const reportDoc = await db
        .collection(this.config.workerConfig.validationResultsCollection || 'validation_results')
        .doc(task.reportId)
        .get();
      
      if (!reportDoc.exists) {
        return null;
      }
      
      return reportDoc.data() as ValidationReport;
    } catch (error) {
      console.error(`Error getting validation report for task ${taskId}:`, error);
      throw error;
    }
  }
}