/**
 * Media Domain Entity
 * 
 * This module defines the Media entity and related types.
 */

import { v4 as uuidv4 } from 'uuid';

/**
 * Media type
 */
export type MediaType = 'image' | 'video' | 'audio' | 'document';

/**
 * Media source
 */
export type MediaSource = 'uploaded' | 'external' | 'generated';

/**
 * Storage provider
 */
export type StorageProvider = 'firebase' | 'cloudinary' | 'local' | 'external';

/**
 * Media status
 */
export type MediaStatus = 'pending' | 'processing' | 'available' | 'error';

/**
 * Media properties
 */
export interface MediaProps {
  id?: string;
  url: string;
  type: MediaType;
  name?: string;
  description?: string;
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
  mimeType?: string;
  source?: MediaSource;
  provider?: StorageProvider;
  status?: MediaStatus;
  ownerId?: string;
  createdAt?: Date;
  updatedAt?: Date;
  validatedAt?: Date;
  isValid?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
}

/**
 * Media entity
 */
export class Media {
  readonly id: string;
  readonly url: string;
  readonly type: MediaType;
  readonly name?: string;
  readonly description?: string;
  readonly size?: number;
  readonly width?: number;
  readonly height?: number;
  readonly duration?: number;
  readonly mimeType?: string;
  readonly source: MediaSource;
  readonly provider: StorageProvider;
  readonly status: MediaStatus;
  readonly ownerId?: string;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly validatedAt?: Date;
  readonly isValid?: boolean;
  readonly tags: string[];
  readonly metadata: Record<string, any>;
  
  constructor(props: MediaProps) {
    this.id = props.id || uuidv4();
    this.url = props.url;
    this.type = props.type;
    this.name = props.name;
    this.description = props.description;
    this.size = props.size;
    this.width = props.width;
    this.height = props.height;
    this.duration = props.duration;
    this.mimeType = props.mimeType;
    this.source = props.source || 'external';
    this.provider = props.provider || 'external';
    this.status = props.status || 'available';
    this.ownerId = props.ownerId;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    this.validatedAt = props.validatedAt;
    this.isValid = props.isValid;
    this.tags = props.tags || [];
    this.metadata = props.metadata || {};
    
    this.validateMedia();
  }
  
  /**
   * Validate media properties
   */
  private validateMedia(): void {
    if (!this.url) {
      throw new Error('Media URL is required');
    }
    
    if (!this.type) {
      throw new Error('Media type is required');
    }
    
    if (!['image', 'video', 'audio', 'document'].includes(this.type)) {
      throw new Error('Invalid media type');
    }
  }
  
  /**
   * Check if media is an image
   */
  isImage(): boolean {
    return this.type === 'image';
  }
  
  /**
   * Check if media is a video
   */
  isVideo(): boolean {
    return this.type === 'video';
  }
  
  /**
   * Check if media is an audio
   */
  isAudio(): boolean {
    return this.type === 'audio';
  }
  
  /**
   * Check if media is a document
   */
  isDocument(): boolean {
    return this.type === 'document';
  }
  
  /**
   * Check if media has been validated
   */
  hasBeenValidated(): boolean {
    return this.validatedAt !== undefined;
  }
  
  /**
   * Check if media is ready (available status)
   */
  isReady(): boolean {
    return this.status === 'available';
  }
  
  /**
   * Check if media is processing
   */
  isProcessing(): boolean {
    return this.status === 'processing';
  }
  
  /**
   * Check if media has an error
   */
  hasError(): boolean {
    return this.status === 'error';
  }
  
  /**
   * Create a new media with updated properties
   */
  update(props: Partial<MediaProps>): Media {
    return new Media({
      ...this,
      ...props,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a new media marked as valid
   */
  markAsValid(): Media {
    return this.update({
      isValid: true,
      validatedAt: new Date(),
      status: 'available'
    });
  }
  
  /**
   * Create a new media marked as invalid
   */
  markAsInvalid(): Media {
    return this.update({
      isValid: false,
      validatedAt: new Date(),
      status: 'error'
    });
  }
  
  /**
   * Create a new media with processing status
   */
  markAsProcessing(): Media {
    return this.update({
      status: 'processing'
    });
  }
  
  /**
   * Create a new media with available status
   */
  markAsAvailable(): Media {
    return this.update({
      status: 'available'
    });
  }
  
  /**
   * Create a new media with error status
   */
  markAsError(): Media {
    return this.update({
      status: 'error'
    });
  }
  
  /**
   * Create a new media with additional tags
   */
  addTags(tags: string[]): Media {
    const uniqueTags = [...new Set([...this.tags, ...tags])];
    
    return this.update({
      tags: uniqueTags
    });
  }
  
  /**
   * Create a new media with removed tags
   */
  removeTags(tags: string[]): Media {
    const updatedTags = this.tags.filter(tag => !tags.includes(tag));
    
    return this.update({
      tags: updatedTags
    });
  }
  
  /**
   * Create a new media with updated metadata
   */
  updateMetadata(metadata: Record<string, any>): Media {
    return this.update({
      metadata: {
        ...this.metadata,
        ...metadata
      }
    });
  }
  
  /**
   * Create a placeholder media object
   */
  static createPlaceholder(type: MediaType): Media {
    const placeholderUrl = type === 'video' 
      ? '/video-placeholder.mp4' 
      : '/image-placeholder.jpg';
    
    return new Media({
      url: placeholderUrl,
      type,
      name: `Placeholder ${type}`,
      source: 'generated',
      provider: 'local',
      status: 'available',
      isValid: true,
      validatedAt: new Date(),
      metadata: {
        isPlaceholder: true
      }
    });
  }
}