/**
 * Media Domain Entity
 * 
 * This represents a media item in the domain model,
 * which can be an image or video.
 */

/**
 * Media types
 */
export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video'
}

/**
 * Media entity properties
 */
export interface MediaProps {
  url: string;
  type: MediaType;
  title?: string;
  description?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  uploadedAt: Date;
  lastValidatedAt?: Date;
  isValid?: boolean;
}

/**
 * Media entity
 */
export class Media {
  readonly url: string;
  readonly type: MediaType;
  readonly title?: string;
  readonly description?: string;
  readonly sortOrder: number;
  readonly isPrimary: boolean;
  readonly uploadedAt: Date;
  readonly lastValidatedAt?: Date;
  readonly isValid?: boolean;
  
  constructor(props: MediaProps) {
    this.url = props.url;
    this.type = props.type;
    this.title = props.title;
    this.description = props.description;
    this.sortOrder = props.sortOrder || 0;
    this.isPrimary = props.isPrimary || false;
    this.uploadedAt = props.uploadedAt;
    this.lastValidatedAt = props.lastValidatedAt;
    this.isValid = props.isValid;
    
    this.validate();
  }
  
  /**
   * Validate the media entity
   */
  private validate(): void {
    if (!this.url) {
      throw new Error('Media URL is required');
    }
    
    if (!Object.values(MediaType).includes(this.type)) {
      throw new Error(`Invalid media type: ${this.type}`);
    }
    
    if (!(this.uploadedAt instanceof Date)) {
      throw new Error('Media uploadedAt must be a Date');
    }
    
    if (this.lastValidatedAt && !(this.lastValidatedAt instanceof Date)) {
      throw new Error('Media lastValidatedAt must be a Date');
    }
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
   * Mark media as valid
   */
  markAsValid(validatedAt: Date = new Date()): Media {
    return new Media({
      ...this,
      isValid: true,
      lastValidatedAt: validatedAt
    });
  }
  
  /**
   * Mark media as invalid
   */
  markAsInvalid(validatedAt: Date = new Date()): Media {
    return new Media({
      ...this,
      isValid: false,
      lastValidatedAt: validatedAt
    });
  }
  
  /**
   * Update the media properties
   */
  update(props: Partial<MediaProps>): Media {
    return new Media({
      url: this.url,
      type: this.type,
      title: this.title,
      description: this.description,
      sortOrder: this.sortOrder,
      isPrimary: this.isPrimary,
      uploadedAt: this.uploadedAt,
      lastValidatedAt: this.lastValidatedAt,
      isValid: this.isValid,
      ...props
    });
  }
  
  /**
   * Create a new media entity with the same URL but different properties
   */
  static createWithSameUrl(url: string, props: Omit<MediaProps, 'url'>): Media {
    return new Media({
      url,
      ...props
    });
  }
}