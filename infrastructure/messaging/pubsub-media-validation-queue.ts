/**
 * Google Cloud Pub/Sub Media Validation Queue
 * 
 * This class implements a message queue for media validation using Google Cloud Pub/Sub.
 * It handles the background processing of media validation tasks.
 */

import { PubSub, Topic, Subscription, Message } from '@google-cloud/pubsub';
import { MediaValidationService } from '../../core/application/media/media-validation-service';

/**
 * Media validation message types
 */
export enum MediaValidationMessageType {
  VALIDATE_ALL = 'validateAll',
  VALIDATE_COLLECTION = 'validateCollection',
  REPAIR_INVALID = 'repairInvalid',
  RESOLVE_BLOBS = 'resolveBlobs',
  FIX_RELATIVE_URLS = 'fixRelativeUrls',
  VALIDATE_URL = 'validateUrl'
}

/**
 * Media validation message
 */
export interface MediaValidationMessage {
  type: MediaValidationMessageType;
  data?: {
    collectionName?: string;
    url?: string;
    reportId?: string;
    baseUrl?: string;
  };
  timestamp: number;
}

/**
 * Media validation queue configuration
 */
export interface PubSubMediaValidationQueueConfig {
  projectId: string;
  topicName: string;
  subscriptionName: string;
  credentialsPath?: string;
}

/**
 * Media validation queue implementation with Google Cloud Pub/Sub
 */
export class PubSubMediaValidationQueue {
  private pubsub: PubSub;
  private topic: Topic;
  private subscription: Subscription;
  private mediaValidationService: MediaValidationService;
  private isProcessing: boolean = false;
  private config: PubSubMediaValidationQueueConfig;
  
  constructor(config: PubSubMediaValidationQueueConfig, mediaValidationService: MediaValidationService) {
    this.config = config;
    this.mediaValidationService = mediaValidationService;
    
    // Initialize PubSub client
    this.pubsub = new PubSub({
      projectId: config.projectId,
      keyFilename: config.credentialsPath
    });
    
    this.topic = this.pubsub.topic(config.topicName);
    this.subscription = this.topic.subscription(config.subscriptionName);
  }
  
  /**
   * Initialize the queue
   */
  async initialize(): Promise<void> {
    // Check if topic exists, create if not
    const [topicExists] = await this.topic.exists();
    if (!topicExists) {
      await this.topic.create();
    }
    
    // Check if subscription exists, create if not
    const [subscriptionExists] = await this.subscription.exists();
    if (!subscriptionExists) {
      await this.topic.createSubscription(this.config.subscriptionName, {
        ackDeadlineSeconds: 300, // 5 minutes
        expirationPolicy: { ttl: { seconds: 86400 * 30 } } // 30 days
      });
      this.subscription = this.topic.subscription(this.config.subscriptionName);
    }
  }
  
  /**
   * Start processing messages from the queue
   */
  startProcessing(): void {
    if (this.isProcessing) {
      return;
    }
    
    this.isProcessing = true;
    
    // Set up message handler
    this.subscription.on('message', this.handleMessage.bind(this));
    
    // Set up error handler
    this.subscription.on('error', (error) => {
      console.error('PubSub subscription error:', error);
      this.isProcessing = false;
    });
  }
  
  /**
   * Stop processing messages from the queue
   */
  stopProcessing(): void {
    if (!this.isProcessing) {
      return;
    }
    
    this.subscription.removeAllListeners('message');
    this.subscription.removeAllListeners('error');
    this.isProcessing = false;
  }
  
  /**
   * Handle incoming messages
   */
  private async handleMessage(message: Message): Promise<void> {
    try {
      // Parse message data
      const messageData = JSON.parse(message.data.toString()) as MediaValidationMessage;
      
      // Process message based on type
      switch (messageData.type) {
        case MediaValidationMessageType.VALIDATE_ALL:
          await this.mediaValidationService.startValidation();
          break;
          
        case MediaValidationMessageType.VALIDATE_COLLECTION:
          // Collection validation is handled by the worker inside startValidation
          // It scans specific collections defined in the repository
          await this.mediaValidationService.startValidation();
          break;
          
        case MediaValidationMessageType.REPAIR_INVALID:
          await this.mediaValidationService.repairInvalidMediaUrls();
          break;
          
        case MediaValidationMessageType.RESOLVE_BLOBS:
          await this.mediaValidationService.resolveBlobUrls();
          break;
          
        case MediaValidationMessageType.FIX_RELATIVE_URLS:
          await this.mediaValidationService.fixRelativeUrls();
          break;
          
        case MediaValidationMessageType.VALIDATE_URL:
          // Single URL validation is not exposed as a service method
          // The worker handles this internally
          console.log(`Received validate URL request: ${messageData.data?.url}`);
          break;
          
        default:
          console.warn(`Unknown message type: ${messageData.type}`);
      }
      
      // Acknowledge message after successful processing
      message.ack();
    } catch (error) {
      console.error('Error processing message:', error);
      
      // Negative acknowledgment to reprocess later
      message.nack();
    }
  }
  
  /**
   * Publish a message to the queue
   */
  async publishMessage(type: MediaValidationMessageType, data?: any): Promise<string> {
    const message: MediaValidationMessage = {
      type,
      data,
      timestamp: Date.now()
    };
    
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await this.topic.publish(messageBuffer);
    
    return messageId;
  }
  
  /**
   * Enqueue a validation task for all media
   */
  async enqueueValidateAll(): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.VALIDATE_ALL);
  }
  
  /**
   * Enqueue a validation task for a specific collection
   */
  async enqueueValidateCollection(collectionName: string): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.VALIDATE_COLLECTION, {
      collectionName
    });
  }
  
  /**
   * Enqueue a repair task for invalid media
   */
  async enqueueRepairInvalidMedia(reportId?: string): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.REPAIR_INVALID, {
      reportId
    });
  }
  
  /**
   * Enqueue a task to resolve blob URLs
   */
  async enqueueResolveBlobUrls(): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.RESOLVE_BLOBS);
  }
  
  /**
   * Enqueue a task to fix relative URLs
   */
  async enqueueFixRelativeUrls(baseUrl: string): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.FIX_RELATIVE_URLS, {
      baseUrl
    });
  }
  
  /**
   * Enqueue a validation task for a specific URL
   */
  async enqueueValidateUrl(url: string): Promise<string> {
    return this.publishMessage(MediaValidationMessageType.VALIDATE_URL, {
      url
    });
  }
}