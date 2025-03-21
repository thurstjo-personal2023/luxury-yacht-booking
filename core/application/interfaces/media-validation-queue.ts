/**
 * Media Validation Queue Interface
 * 
 * Defines the contract for the media validation queue.
 */

import { MediaValidationTask } from '../media/media-validation-worker';

/**
 * Media validation queue interface
 */
export interface IMediaValidationQueue {
  /**
   * Enqueue a validation task
   */
  enqueueTask(task: MediaValidationTask): Promise<void>;
  
  /**
   * Dequeue a validation task
   */
  dequeueTask(): Promise<MediaValidationTask | null>;
  
  /**
   * Get the number of tasks in the queue
   */
  getQueueLength(): Promise<number>;
  
  /**
   * Peek at the next task without removing it
   */
  peekNextTask(): Promise<MediaValidationTask | null>;
  
  /**
   * Clear the queue
   */
  clearQueue(): Promise<void>;
}