/**
 * Media Validation Worker
 * 
 * This module provides a background worker that processes media validation tasks.
 * It's designed to run either as a Cloud Function triggered by Pub/Sub events
 * or as a scheduled task.
 */
import * as admin from 'firebase-admin';
import { MediaValidationService } from './media-validation';
import { PubSub } from '@google-cloud/pubsub';

// Worker configuration type
export interface WorkerConfig {
  firestore: admin.firestore.Firestore;
  projectId: string;
  topicName: string;
  collectionNames: string[];
  baseUrl: string;
  enablePubSub?: boolean;
  maxRetries?: number;
  taskTimeoutSeconds?: number;
}

// Task type
export interface ValidationTask {
  taskId: string;
  type: 'validate-all' | 'validate-collection' | 'fix-relative-urls' | 'custom';
  collectionName?: string;
  documentId?: string;
  parameters?: Record<string, any>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime?: admin.firestore.Timestamp;
  endTime?: admin.firestore.Timestamp;
  result?: any;
  error?: string;
  retryCount: number;
  lastUpdate: admin.firestore.Timestamp;
  reportId?: string;
}

/**
 * Media Validation Worker
 */
export class MediaValidationWorker {
  private validationService: MediaValidationService;
  private pubsub: PubSub | null = null;
  private readonly maxRetries: number;
  private readonly taskTimeoutSeconds: number;
  
  constructor(private config: WorkerConfig) {
    // Initialize validation service
    this.validationService = new MediaValidationService({
      firestore: config.firestore,
      collectionNames: config.collectionNames,
      baseUrl: config.baseUrl,
      logInfo: (message) => console.log(`[Worker] ${message}`),
      logError: (message, error) => console.error(`[Worker] ${message}`, error),
      logWarning: (message) => console.warn(`[Worker] ${message}`)
    });
    
    // Initialize Pub/Sub if enabled
    if (config.enablePubSub) {
      this.pubsub = new PubSub({ projectId: config.projectId });
    }
    
    // Set configuration values with defaults
    this.maxRetries = config.maxRetries || 3;
    this.taskTimeoutSeconds = config.taskTimeoutSeconds || 300; // 5 minutes
  }
  
  /**
   * Process a validation task
   * @param task The task to process
   */
  public async processTask(task: ValidationTask): Promise<ValidationTask> {
    console.log(`[Worker] Processing task ${task.taskId} of type ${task.type}`);
    
    // Update task status to processing
    const taskRef = this.config.firestore.collection('validation_tasks').doc(task.taskId);
    await taskRef.update({
      status: 'processing',
      startTime: admin.firestore.Timestamp.now(),
      lastUpdate: admin.firestore.Timestamp.now()
    });
    
    // Update task object
    task.status = 'processing';
    task.startTime = admin.firestore.Timestamp.now();
    task.lastUpdate = admin.firestore.Timestamp.now();
    
    try {
      let result: any;
      
      // Process task based on type
      switch (task.type) {
        case 'validate-all':
          result = await this.validationService.validateAllCollections();
          break;
          
        case 'validate-collection':
          if (!task.collectionName) {
            throw new Error('Collection name is required for validate-collection tasks');
          }
          result = await this.validationService.validateCollection(task.collectionName);
          break;
          
        case 'fix-relative-urls':
          if (task.collectionName && task.documentId) {
            // Fix a specific document
            const docRef = this.config.firestore.collection(task.collectionName).doc(task.documentId);
            const doc = await docRef.get();
            
            if (!doc.exists) {
              throw new Error(`Document ${task.documentId} not found in ${task.collectionName}`);
            }
            
            result = await this.validationService.fixRelativeUrls(
              task.collectionName,
              task.documentId,
              doc.data()
            );
          } else if (task.collectionName) {
            // Fix an entire collection
            result = await this.validationService.fixCollectionRelativeUrls(task.collectionName);
          } else {
            // Fix all collections
            result = await this.validationService.fixAllRelativeUrls();
          }
          break;
          
        case 'custom':
          // Custom task types can be added here
          throw new Error(`Custom task processing not implemented yet`);
          
        default:
          throw new Error(`Unknown task type: ${task.type}`);
      }
      
      // Update task with result
      const updatedTask: Partial<ValidationTask> = {
        status: 'completed',
        endTime: admin.firestore.Timestamp.now(),
        lastUpdate: admin.firestore.Timestamp.now(),
        result
      };
      
      // If the result includes a reportId, store it
      if (result && result.reportId) {
        updatedTask.reportId = result.reportId;
      }
      
      await taskRef.update(updatedTask);
      
      // Update task object
      return {
        ...task,
        ...updatedTask
      } as ValidationTask;
      
    } catch (error) {
      console.error(`[Worker] Error processing task ${task.taskId}:`, error);
      
      // Check if we should retry
      const shouldRetry = task.retryCount < this.maxRetries;
      const nextStatus = shouldRetry ? 'pending' : 'failed';
      
      // Update task with error
      const updatedTask: Partial<ValidationTask> = {
        status: nextStatus,
        error: error.message || 'Unknown error',
        retryCount: shouldRetry ? task.retryCount + 1 : task.retryCount,
        lastUpdate: admin.firestore.Timestamp.now()
      };
      
      // If this is a failure (no more retries), set the end time
      if (nextStatus === 'failed') {
        updatedTask.endTime = admin.firestore.Timestamp.now();
      }
      
      await taskRef.update(updatedTask);
      
      // Update task object
      return {
        ...task,
        ...updatedTask
      } as ValidationTask;
    }
  }
  
  /**
   * Process the next available task
   */
  public async processNextTask(): Promise<ValidationTask | null> {
    const timeoutCutoff = admin.firestore.Timestamp.fromMillis(
      Date.now() - (this.taskTimeoutSeconds * 1000)
    );
    
    const tasksRef = this.config.firestore.collection('validation_tasks');
    
    // Start a transaction to claim a task
    return this.config.firestore.runTransaction(async (transaction) => {
      // Query for pending tasks or stuck processing tasks
      const pendingQuery = tasksRef
        .where('status', '==', 'pending')
        .orderBy('lastUpdate')
        .limit(1);
      
      const timeoutQuery = tasksRef
        .where('status', '==', 'processing')
        .where('lastUpdate', '<', timeoutCutoff)
        .orderBy('lastUpdate')
        .limit(1);
      
      // Check for pending tasks first
      const pendingSnapshot = await transaction.get(pendingQuery);
      
      // If no pending tasks, check for timed out tasks
      if (pendingSnapshot.empty) {
        const timeoutSnapshot = await transaction.get(timeoutQuery);
        
        if (timeoutSnapshot.empty) {
          // No tasks to process
          return null;
        }
        
        // Found a timed out task
        const taskDoc = timeoutSnapshot.docs[0];
        const task = taskDoc.data() as ValidationTask;
        
        console.log(`[Worker] Found timed out task ${taskDoc.id} last updated at ${task.lastUpdate.toDate()}`);
        
        // Process the timed out task
        return this.processTask(task);
      }
      
      // Found a pending task
      const taskDoc = pendingSnapshot.docs[0];
      const task = taskDoc.data() as ValidationTask;
      
      console.log(`[Worker] Found pending task ${taskDoc.id}`);
      
      // Process the pending task
      return this.processTask(task);
    });
  }
  
  /**
   * Create a new validation task
   */
  public async createTask(
    type: ValidationTask['type'],
    options: {
      collectionName?: string;
      documentId?: string;
      parameters?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const taskId = this.config.firestore.collection('validation_tasks').doc().id;
    
    const task: ValidationTask = {
      taskId,
      type,
      collectionName: options.collectionName,
      documentId: options.documentId,
      parameters: options.parameters,
      status: 'pending',
      retryCount: 0,
      lastUpdate: admin.firestore.Timestamp.now()
    };
    
    await this.config.firestore.collection('validation_tasks').doc(taskId).set(task);
    
    // If Pub/Sub is enabled, publish a message
    if (this.pubsub) {
      try {
        const topic = this.pubsub.topic(this.config.topicName);
        const messageData = Buffer.from(JSON.stringify({ taskId }));
        await topic.publish(messageData);
        
        console.log(`[Worker] Published task ${taskId} to Pub/Sub topic ${this.config.topicName}`);
      } catch (error) {
        console.error(`[Worker] Error publishing task to Pub/Sub:`, error);
        // Continue even if Pub/Sub fails - task can be picked up by scheduler
      }
    }
    
    return taskId;
  }
  
  /**
   * Run the worker process
   * This can be called by a Cloud Function or a scheduled task
   */
  public async run(options: { processLimit?: number } = {}): Promise<number> {
    const { processLimit = 10 } = options;
    let processedCount = 0;
    
    console.log(`[Worker] Starting media validation worker with limit of ${processLimit} tasks`);
    
    // Process tasks until limit is reached or no more tasks
    for (let i = 0; i < processLimit; i++) {
      const task = await this.processNextTask();
      
      if (!task) {
        console.log(`[Worker] No more tasks to process`);
        break;
      }
      
      processedCount++;
    }
    
    console.log(`[Worker] Processed ${processedCount} tasks`);
    return processedCount;
  }
  
  /**
   * Handle a Pub/Sub message
   * This is designed to be called by a Cloud Function
   */
  public async handlePubSubMessage(message: { json: any; data?: string }): Promise<void> {
    try {
      // Parse message data
      const data = message.json || (message.data ? JSON.parse(Buffer.from(message.data, 'base64').toString()) : null);
      
      if (!data || !data.taskId) {
        console.error(`[Worker] Invalid Pub/Sub message:`, data);
        return;
      }
      
      // Get the task
      const taskRef = this.config.firestore.collection('validation_tasks').doc(data.taskId);
      const taskDoc = await taskRef.get();
      
      if (!taskDoc.exists) {
        console.error(`[Worker] Task ${data.taskId} not found`);
        return;
      }
      
      const task = taskDoc.data() as ValidationTask;
      
      // Only process if the task is still pending
      if (task.status === 'pending' || task.status === 'processing') {
        await this.processTask(task);
      } else {
        console.log(`[Worker] Task ${data.taskId} is already ${task.status}, skipping processing`);
      }
    } catch (error) {
      console.error(`[Worker] Error handling Pub/Sub message:`, error);
    }
  }
}