/**
 * PubSub Media Validation Queue
 * 
 * This module provides a Google Cloud Pub/Sub implementation for the media validation queue.
 * It handles sending and receiving messages for media validation and repair tasks.
 */

import { PubSub, Message, Subscription } from '@google-cloud/pubsub';
import { MediaValidationTask, MediaValidationTaskResult, UrlRepairTask, UrlRepairTaskResult } from '../../core/application/media/media-validation-worker';

/**
 * Message types
 */
export enum MessageType {
  VALIDATION_TASK = 'VALIDATION_TASK',
  REPAIR_TASK = 'REPAIR_TASK'
}

/**
 * Media validation message
 */
export interface MediaValidationMessage {
  id: string;
  type: MessageType;
  timestamp: string;
  payload: MediaValidationTask | UrlRepairTask;
}

/**
 * PubSub configuration
 */
export interface PubSubConfig {
  projectId: string;
  validationTopicName: string;
  validationSubscriptionName: string;
  repairTopicName: string;
  repairSubscriptionName: string;
  resultTopicName: string;
  resultSubscriptionName: string;
}

/**
 * Message handler
 */
export type MessageHandler = (message: MediaValidationMessage) => Promise<void>;

/**
 * PubSub media validation queue
 */
export class PubSubMediaValidationQueue {
  private pubsub: PubSub;
  private validationSubscription?: Subscription;
  private repairSubscription?: Subscription;
  private resultSubscription?: Subscription;
  private isListening: boolean = false;
  
  constructor(private readonly config: PubSubConfig) {
    this.pubsub = new PubSub({
      projectId: config.projectId
    });
  }
  
  /**
   * Initialize the queue
   */
  async initialize(): Promise<void> {
    try {
      // Ensure topics exist
      await this.ensureTopicExists(this.config.validationTopicName);
      await this.ensureTopicExists(this.config.repairTopicName);
      await this.ensureTopicExists(this.config.resultTopicName);
      
      // Ensure subscriptions exist
      await this.ensureSubscriptionExists(
        this.config.validationTopicName, 
        this.config.validationSubscriptionName
      );
      await this.ensureSubscriptionExists(
        this.config.repairTopicName, 
        this.config.repairSubscriptionName
      );
      await this.ensureSubscriptionExists(
        this.config.resultTopicName, 
        this.config.resultSubscriptionName
      );
      
      // Set up subscription objects
      this.validationSubscription = this.pubsub.subscription(
        this.config.validationSubscriptionName
      );
      this.repairSubscription = this.pubsub.subscription(
        this.config.repairSubscriptionName
      );
      this.resultSubscription = this.pubsub.subscription(
        this.config.resultSubscriptionName
      );
      
      console.log('PubSub media validation queue initialized');
    } catch (error) {
      console.error('Error initializing PubSub queue:', error);
      throw error;
    }
  }
  
  /**
   * Ensure a topic exists
   */
  private async ensureTopicExists(topicName: string): Promise<void> {
    try {
      const [exists] = await this.pubsub.topic(topicName).exists();
      
      if (!exists) {
        await this.pubsub.createTopic(topicName);
        console.log(`Topic ${topicName} created`);
      }
    } catch (error) {
      console.error(`Error ensuring topic ${topicName} exists:`, error);
      throw error;
    }
  }
  
  /**
   * Ensure a subscription exists
   */
  private async ensureSubscriptionExists(
    topicName: string,
    subscriptionName: string
  ): Promise<void> {
    try {
      const [exists] = await this.pubsub.subscription(subscriptionName).exists();
      
      if (!exists) {
        await this.pubsub.topic(topicName).createSubscription(subscriptionName);
        console.log(`Subscription ${subscriptionName} created`);
      }
    } catch (error) {
      console.error(`Error ensuring subscription ${subscriptionName} exists:`, error);
      throw error;
    }
  }
  
  /**
   * Publish a validation task message
   */
  async publishValidationTask(task: MediaValidationTask): Promise<string> {
    try {
      const id = Date.now().toString();
      const message: MediaValidationMessage = {
        id,
        type: MessageType.VALIDATION_TASK,
        timestamp: new Date().toISOString(),
        payload: task
      };
      
      const messageId = await this.publishMessage(
        this.config.validationTopicName,
        message
      );
      
      console.log(`Validation task published with ID: ${messageId}`);
      return id;
    } catch (error) {
      console.error('Error publishing validation task:', error);
      throw error;
    }
  }
  
  /**
   * Publish a repair task message
   */
  async publishRepairTask(task: UrlRepairTask): Promise<string> {
    try {
      const id = Date.now().toString();
      const message: MediaValidationMessage = {
        id,
        type: MessageType.REPAIR_TASK,
        timestamp: new Date().toISOString(),
        payload: task
      };
      
      const messageId = await this.publishMessage(
        this.config.repairTopicName,
        message
      );
      
      console.log(`Repair task published with ID: ${messageId}`);
      return id;
    } catch (error) {
      console.error('Error publishing repair task:', error);
      throw error;
    }
  }
  
  /**
   * Publish a result message
   */
  async publishResult(
    result: MediaValidationTaskResult | UrlRepairTaskResult
  ): Promise<string> {
    try {
      const message = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        result
      };
      
      const messageId = await this.publishMessage(
        this.config.resultTopicName,
        message
      );
      
      console.log(`Result published with ID: ${messageId}`);
      return messageId;
    } catch (error) {
      console.error('Error publishing result:', error);
      throw error;
    }
  }
  
  /**
   * Publish a message to a topic
   */
  private async publishMessage(
    topicName: string,
    message: any
  ): Promise<string> {
    try {
      const data = Buffer.from(JSON.stringify(message));
      const messageId = await this.pubsub.topic(topicName).publish(data);
      return messageId;
    } catch (error) {
      console.error(`Error publishing message to ${topicName}:`, error);
      throw error;
    }
  }
  
  /**
   * Start listening for validation messages
   */
  async startListeningForValidationTasks(handler: MessageHandler): Promise<void> {
    if (!this.validationSubscription) {
      throw new Error('Queue not initialized');
    }
    
    this.isListening = true;
    
    this.validationSubscription.on('message', async (message: Message) => {
      try {
        const data = JSON.parse(message.data.toString());
        await handler(data);
        message.ack();
      } catch (error) {
        console.error('Error processing validation message:', error);
        message.nack();
      }
    });
    
    this.validationSubscription.on('error', (error) => {
      console.error('Validation subscription error:', error);
    });
    
    console.log('Started listening for validation tasks');
  }
  
  /**
   * Start listening for repair messages
   */
  async startListeningForRepairTasks(handler: MessageHandler): Promise<void> {
    if (!this.repairSubscription) {
      throw new Error('Queue not initialized');
    }
    
    this.isListening = true;
    
    this.repairSubscription.on('message', async (message: Message) => {
      try {
        const data = JSON.parse(message.data.toString());
        await handler(data);
        message.ack();
      } catch (error) {
        console.error('Error processing repair message:', error);
        message.nack();
      }
    });
    
    this.repairSubscription.on('error', (error) => {
      console.error('Repair subscription error:', error);
    });
    
    console.log('Started listening for repair tasks');
  }
  
  /**
   * Start listening for result messages
   */
  async startListeningForResults(handler: MessageHandler): Promise<void> {
    if (!this.resultSubscription) {
      throw new Error('Queue not initialized');
    }
    
    this.isListening = true;
    
    this.resultSubscription.on('message', async (message: Message) => {
      try {
        const data = JSON.parse(message.data.toString());
        await handler(data);
        message.ack();
      } catch (error) {
        console.error('Error processing result message:', error);
        message.nack();
      }
    });
    
    this.resultSubscription.on('error', (error) => {
      console.error('Result subscription error:', error);
    });
    
    console.log('Started listening for results');
  }
  
  /**
   * Stop listening for messages
   */
  async stopListening(): Promise<void> {
    if (!this.isListening) {
      return;
    }
    
    if (this.validationSubscription) {
      this.validationSubscription.removeAllListeners();
    }
    
    if (this.repairSubscription) {
      this.repairSubscription.removeAllListeners();
    }
    
    if (this.resultSubscription) {
      this.resultSubscription.removeAllListeners();
    }
    
    this.isListening = false;
    console.log('Stopped listening for messages');
  }
  
  /**
   * Create a media validation worker that processes messages from the queue
   * This is a convenience method to quickly set up a worker
   */
  async createWorker(
    validationHandler: (task: MediaValidationTask) => Promise<MediaValidationTaskResult>,
    repairHandler: (task: UrlRepairTask) => Promise<UrlRepairTaskResult>
  ): Promise<void> {
    await this.initialize();
    
    // Handler for validation tasks
    const handleValidationMessage = async (message: MediaValidationMessage) => {
      if (message.type === MessageType.VALIDATION_TASK) {
        const task = message.payload as MediaValidationTask;
        const result = await validationHandler(task);
        await this.publishResult(result);
      }
    };
    
    // Handler for repair tasks
    const handleRepairMessage = async (message: MediaValidationMessage) => {
      if (message.type === MessageType.REPAIR_TASK) {
        const task = message.payload as UrlRepairTask;
        const result = await repairHandler(task);
        await this.publishResult(result);
      }
    };
    
    // Start listening for messages
    await this.startListeningForValidationTasks(handleValidationMessage);
    await this.startListeningForRepairTasks(handleRepairMessage);
    
    console.log('Media validation worker created and started');
  }
}