/**
 * Media Validation Factory
 * 
 * Factory for creating media validation components.
 */

import { Firestore } from 'firebase/firestore';

import { MediaValidator, MediaValidationOptions } from '../../domain/validation/media-validator';
import { MediaValidationService, MediaValidationServiceOptions } from '../media/media-validation-service';
import { MediaValidationWorker, MediaValidationWorkerConfig } from '../media/media-validation-worker';
import { IMediaRepository } from '../../../adapters/repositories/interfaces/media-repository';
import { FirebaseMediaRepository, FirebaseMediaRepositoryConfig } from '../../../adapters/repositories/firebase/firebase-media-repository';
import { IMediaValidationQueue } from '../interfaces/media-validation-queue';
import { PubSubMediaValidationQueue, PubSubMediaValidationQueueConfig } from '../../../infrastructure/messaging/pubsub-media-validation-queue';

/**
 * Media validation factory configuration
 */
export interface MediaValidationFactoryConfig {
  validatorOptions?: MediaValidationOptions;
  serviceOptions?: MediaValidationServiceOptions;
  workerConfig?: MediaValidationWorkerConfig;
  repositoryConfig?: FirebaseMediaRepositoryConfig;
  queueConfig?: PubSubMediaValidationQueueConfig;
}

/**
 * Media validation factory
 * 
 * Factory for creating media validation components
 */
export class MediaValidationFactory {
  private db: Firestore;
  private config: MediaValidationFactoryConfig;
  
  constructor(
    db: Firestore,
    config: MediaValidationFactoryConfig = {}
  ) {
    this.db = db;
    this.config = config;
  }
  
  /**
   * Create a media validator
   */
  createValidator(): MediaValidator {
    return new MediaValidator(this.config.validatorOptions);
  }
  
  /**
   * Create a media repository
   */
  createRepository(): IMediaRepository {
    return new FirebaseMediaRepository(
      this.db,
      this.config.repositoryConfig
    );
  }
  
  /**
   * Create a media validation queue
   */
  createQueue(): IMediaValidationQueue {
    const queueConfig = this.config.queueConfig;
    
    if (!queueConfig) {
      throw new Error('Queue configuration is required');
    }
    
    return new PubSubMediaValidationQueue(queueConfig);
  }
  
  /**
   * Create a media validation service
   */
  createService(): MediaValidationService {
    const repository = this.createRepository();
    return new MediaValidationService(
      repository,
      this.config.serviceOptions
    );
  }
  
  /**
   * Create a media validation worker
   */
  createWorker(): MediaValidationWorker {
    const repository = this.createRepository();
    const queue = this.createQueue();
    
    return new MediaValidationWorker(
      repository,
      queue,
      this.config.workerConfig
    );
  }
}