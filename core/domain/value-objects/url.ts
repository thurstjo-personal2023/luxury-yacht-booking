/**
 * URL Value Object
 * 
 * Represents a URL with validation logic.
 */

export class URL {
  private readonly _value: string;
  
  constructor(value: string) {
    const trimmedValue = value.trim();
    
    if (!URL.isValid(trimmedValue)) {
      throw new Error(`Invalid URL: ${trimmedValue}`);
    }
    
    this._value = trimmedValue;
  }
  
  /**
   * Get the URL value
   */
  get value(): string {
    return this._value;
  }
  
  /**
   * Get the URL hostname
   */
  get hostname(): string {
    try {
      const url = new globalThis.URL(this._value);
      return url.hostname;
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Get the URL pathname
   */
  get pathname(): string {
    try {
      const url = new globalThis.URL(this._value);
      return url.pathname;
    } catch (error) {
      return '';
    }
  }
  
  /**
   * Get the URL's file extension, if any
   */
  get fileExtension(): string {
    const pathname = this.pathname;
    const lastDotIndex = pathname.lastIndexOf('.');
    
    if (lastDotIndex === -1) {
      return '';
    }
    
    return pathname.substring(lastDotIndex + 1).toLowerCase();
  }
  
  /**
   * Check if a URL is valid
   */
  static isValid(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    try {
      new globalThis.URL(value);
      return true;
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check if a URL is a valid Firebase Storage URL
   */
  static isFirebaseStorageUrl(value: string): boolean {
    if (!URL.isValid(value)) {
      return false;
    }
    
    try {
      const url = new globalThis.URL(value);
      return (
        url.hostname.includes('firebasestorage.googleapis.com') || 
        url.hostname.includes('storage.googleapis.com')
      );
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Check if a URL is a valid image URL based on the file extension
   */
  static isImageUrl(value: string): boolean {
    if (!URL.isValid(value)) {
      return false;
    }
    
    const url = new URL(value);
    const extension = url.fileExtension;
    
    const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    
    return imageExtensions.includes(extension);
  }
  
  /**
   * Check if a URL is a valid video URL based on the file extension
   */
  static isVideoUrl(value: string): boolean {
    if (!URL.isValid(value)) {
      return false;
    }
    
    const url = new URL(value);
    const extension = url.fileExtension;
    
    const videoExtensions = ['mp4', 'webm', 'ogg', 'mov', 'avi', 'wmv', 'flv', 'mkv'];
    
    return videoExtensions.includes(extension);
  }
  
  /**
   * Check if a URL is an absolute URL
   */
  static isAbsoluteUrl(value: string): boolean {
    return URL.isValid(value);
  }
  
  /**
   * Check if a URL is a relative URL
   */
  static isRelativeUrl(value: string): boolean {
    if (!value || typeof value !== 'string') {
      return false;
    }
    
    return value.startsWith('/') || value.startsWith('./') || value.startsWith('../');
  }
  
  /**
   * Convert a relative URL to an absolute URL
   */
  static toAbsoluteUrl(value: string, baseUrl: string): string {
    if (URL.isAbsoluteUrl(value)) {
      return value;
    }
    
    try {
      const base = new globalThis.URL(baseUrl);
      const absolute = new globalThis.URL(value, base);
      return absolute.href;
    } catch (error) {
      return value;
    }
  }
  
  /**
   * Convert to string
   */
  toString(): string {
    return this._value;
  }
  
  /**
   * Check if two URLs are equal
   */
  equals(other: URL): boolean {
    return this._value === other.value;
  }
}