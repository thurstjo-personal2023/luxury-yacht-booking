/**
 * Media Domain Entity
 * 
 * This represents media items (images and videos) in the domain layer.
 */

export enum MediaType {
  IMAGE = 'image',
  VIDEO = 'video'
}

export interface MediaProps {
  url: string;
  type: MediaType;
  title?: string;
  description?: string;
  sortOrder?: number;
  isPrimary?: boolean;
  uploadedAt?: Date;
  lastValidatedAt?: Date;
  isValid?: boolean;
}

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
    this.sortOrder = props.sortOrder ?? 0;
    this.isPrimary = props.isPrimary ?? false;
    this.uploadedAt = props.uploadedAt ?? new Date();
    this.lastValidatedAt = props.lastValidatedAt;
    this.isValid = props.isValid;
  }

  /**
   * Create a new media item
   */
  static create(props: Omit<MediaProps, 'uploadedAt' | 'lastValidatedAt' | 'isValid'>): Media {
    return new Media({
      ...props,
      uploadedAt: new Date()
    });
  }

  /**
   * Mark media as validated
   */
  markAsValidated(isValid: boolean): Media {
    return new Media({
      ...this,
      lastValidatedAt: new Date(),
      isValid
    });
  }

  /**
   * Update media properties
   */
  update(props: Partial<Omit<MediaProps, 'uploadedAt'>>): Media {
    return new Media({
      ...this,
      ...props,
      uploadedAt: this.uploadedAt // Ensure uploadedAt is not changed
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
   * Check if the media has been validated
   */
  hasBeenValidated(): boolean {
    return this.lastValidatedAt !== undefined;
  }

  /**
   * Check if the URL is a blob URL
   */
  isBlobUrl(): boolean {
    return this.url.startsWith('blob:');
  }

  /**
   * Check if the URL is a relative URL
   */
  isRelativeUrl(): boolean {
    // Check if the URL starts with a slash but not with //
    // and doesn't have a protocol specifier
    return this.url.startsWith('/') && 
           !this.url.startsWith('//') && 
           !/^[a-zA-Z]+:\/\//.test(this.url);
  }

  /**
   * Check if the URL is an absolute URL
   */
  isAbsoluteUrl(): boolean {
    return /^[a-zA-Z]+:\/\//.test(this.url) || this.url.startsWith('//');
  }
}