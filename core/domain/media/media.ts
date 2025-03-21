/**
 * Media Entity
 * 
 * Represents a media item in the system with core properties and behaviors.
 */

import { URL } from '../value-objects/url';
import { MediaType, getMediaTypeFromExtension, isVideoUrl } from './media-type';

/**
 * Media constructor properties
 */
export interface MediaProps {
  id?: string;
  url: URL;
  type: MediaType;
  alt?: string;
  title?: string;
  caption?: string;
  metadata?: Record<string, any>;
  width?: number;
  height?: number;
  size?: number;
  mimeType?: string;
  isValid?: boolean;
  validationMessage?: string;
  lastValidatedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Media entity
 */
export class Media {
  readonly id?: string;
  readonly url: URL;
  readonly type: MediaType;
  readonly alt: string;
  readonly title: string;
  readonly caption: string;
  readonly metadata: Record<string, any>;
  readonly width?: number;
  readonly height?: number;
  readonly size?: number;
  readonly mimeType?: string;
  readonly isValid: boolean;
  readonly validationMessage?: string;
  readonly lastValidatedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  
  constructor(props: MediaProps) {
    this.id = props.id;
    this.url = props.url;
    this.type = props.type;
    this.alt = props.alt || '';
    this.title = props.title || '';
    this.caption = props.caption || '';
    this.metadata = props.metadata || {};
    this.width = props.width;
    this.height = props.height;
    this.size = props.size;
    this.mimeType = props.mimeType;
    this.isValid = props.isValid !== undefined ? props.isValid : true;
    this.validationMessage = props.validationMessage;
    this.lastValidatedAt = props.lastValidatedAt;
    this.createdAt = props.createdAt || new Date();
    this.updatedAt = props.updatedAt || new Date();
    
    this.validate();
  }
  
  /**
   * Get the file extension from the URL
   */
  get fileExtension(): string {
    return this.url.fileExtension;
  }
  
  /**
   * Update media with new properties
   */
  update(props: Partial<Omit<MediaProps, 'url' | 'type' | 'createdAt'>>): Media {
    return new Media({
      id: this.id,
      url: this.url,
      type: this.type,
      alt: props.alt !== undefined ? props.alt : this.alt,
      title: props.title !== undefined ? props.title : this.title,
      caption: props.caption !== undefined ? props.caption : this.caption,
      metadata: props.metadata || this.metadata,
      width: props.width !== undefined ? props.width : this.width,
      height: props.height !== undefined ? props.height : this.height,
      size: props.size !== undefined ? props.size : this.size,
      mimeType: props.mimeType !== undefined ? props.mimeType : this.mimeType,
      isValid: props.isValid !== undefined ? props.isValid : this.isValid,
      validationMessage: props.validationMessage !== undefined ? props.validationMessage : this.validationMessage,
      lastValidatedAt: props.lastValidatedAt || this.lastValidatedAt,
      createdAt: this.createdAt,
      updatedAt: new Date()
    });
  }
  
  /**
   * Mark the media as valid
   */
  markAsValid(mimeType?: string): Media {
    return this.update({
      isValid: true,
      validationMessage: undefined,
      lastValidatedAt: new Date(),
      mimeType: mimeType || this.mimeType
    });
  }
  
  /**
   * Mark the media as invalid
   */
  markAsInvalid(message: string): Media {
    return this.update({
      isValid: false,
      validationMessage: message,
      lastValidatedAt: new Date()
    });
  }
  
  /**
   * Update media dimensions
   */
  updateDimensions(width: number, height: number): Media {
    return this.update({
      width,
      height
    });
  }
  
  /**
   * Update media size
   */
  updateSize(size: number): Media {
    return this.update({
      size
    });
  }
  
  /**
   * Update media metadata
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
   * Check if the media is an image
   */
  isImage(): boolean {
    return this.type === MediaType.IMAGE;
  }
  
  /**
   * Check if the media is a video
   */
  isVideo(): boolean {
    return this.type === MediaType.VIDEO;
  }
  
  /**
   * Check if the media is an audio file
   */
  isAudio(): boolean {
    return this.type === MediaType.AUDIO;
  }
  
  /**
   * Check if the media is a document
   */
  isDocument(): boolean {
    return this.type === MediaType.DOCUMENT;
  }
  
  /**
   * Convert to a plain object for storage
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      url: this.url.value,
      type: this.type,
      alt: this.alt,
      title: this.title,
      caption: this.caption,
      metadata: this.metadata,
      width: this.width,
      height: this.height,
      size: this.size,
      mimeType: this.mimeType,
      isValid: this.isValid,
      validationMessage: this.validationMessage,
      lastValidatedAt: this.lastValidatedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
  
  /**
   * Convert legacy format to Media entity
   */
  static fromLegacyFormat(data: { type: string; url: string }): Media {
    let mediaType: MediaType;
    
    // Determine media type from either the type field or URL
    if (data.type === 'image') {
      mediaType = MediaType.IMAGE;
    } else if (data.type === 'video') {
      mediaType = MediaType.VIDEO;
    } else {
      // Try to detect from URL
      const url = new URL(data.url);
      if (isVideoUrl(data.url)) {
        mediaType = MediaType.VIDEO;
      } else {
        mediaType = getMediaTypeFromExtension(url.fileExtension);
      }
    }
    
    return new Media({
      url: new URL(data.url),
      type: mediaType
    });
  }
  
  /**
   * Validate the media properties
   */
  private validate(): void {
    if (!this.url) {
      throw new Error('Media URL is required');
    }
    
    if (!Object.values(MediaType).includes(this.type)) {
      throw new Error(`Invalid media type: ${this.type}`);
    }
  }
}