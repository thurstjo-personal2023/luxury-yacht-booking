/**
 * PubSub Media Validation Queue
 * 
 * Implements the IMediaValidationQueue interface using Google Cloud Pub/Sub.
 */

import { PubSub, Message, Topic, Subscription } from '@google-cloud/pubsub';
import { IMediaValidationQueue } from '../../core/application/interfaces/media-validation-queue';
import { MediaValidationTask } from '../../core/application/media/media-validation-worker';

/**
 * PubSub media validation queue configuration
 */
export interface PubSubMediaValidationQueueConfig {
  projectId: string;
  topicName: string;
  subscriptionName: string;
}

/**
 * PubSub media validation queue implementation
 */
export class PubSubMediaValidationQueue implements IMediaValidationQueue {
  private pubsub: PubSub;
  private topic: Topic;
  private subscription: Subscription;
  private config: PubSubMediaValidationQueueConfig;

  constructor(config: PubSubMediaValidationQueueConfig) {
    this.config = config;
    this.pubsub = new PubSub({ projectId: config.projectId });
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
      await this.topic.createSubscription(this.config.subscriptionName);
    }
  }

  /**
   * Enqueue a validation task
   */
  async enqueueTask(task: MediaValidationTask): Promise<void> {
    const messageId = await this.topic.publish(
      Buffer.from(JSON.stringify(task))
    );
    console.log(`Task enqueued with message ID: ${messageId}`);
  }

  /**
   * Dequeue a validation task
   * 
   * Note: In a real system, this would be handled by the Pub/Sub subscription
   * in a worker process. This implementation is for demonstration purposes.
   */
  async dequeueTask(): Promise<MediaValidationTask | null> {
    return new Promise((resolve) => {
      this.subscription.once('message', (message: Message) => {
        message.ack();
        try {
          const task = JSON.parse(message.data.toString()) as MediaValidationTask;
          resolve(task);
        } catch (error) {
          console.error('Error parsing message data:', error);
          resolve(null);
        }
      });

      // Set a timeout to resolve with null if no message is received
      setTimeout(() => {
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Get the number of tasks in the queue
   * 
   * Note: Pub/Sub doesn't provide a direct way to get queue length.
   * This is a simplified implementation.
   */
  async getQueueLength(): Promise<number> {
    const [subscription] = await this.subscription.get();
    const metadata = subscription.metadata;
    
    // This is an approximation, as Pub/Sub doesn't provide exact queue length
    return metadata.totalBacklogSize
      ? parseInt(metadata.totalBacklogSize)
      : 0;
  }

  /**
   * Peek at the next task without removing it
   * 
   * Note: Pub/Sub doesn't provide a direct peek functionality.
   * This is a simplified implementation.
   */
  async peekNextTask(): Promise<MediaValidationTask | null> {
    // In a real system, we might use a separate subscription with a filter
    // or implement a custom solution using Firestore or other storage
    console.warn('Peek functionality is not available in Pub/Sub');
    return null;
  }

  /**
   * Clear the queue
   * 
   * Note: Pub/Sub doesn't provide a direct way to clear a queue.
   * This implementation recreates the subscription as a workaround.
   */
  async clearQueue(): Promise<void> {
    try {
      // Delete the subscription
      await this.subscription.delete();
      
      // Recreate the subscription
      this.subscription = await this.topic.createSubscription(
        this.config.subscriptionName
      );
      
      console.log('Queue cleared successfully');
    } catch (error) {
      console.error('Error clearing queue:', error);
      throw error;
    }
  }
}