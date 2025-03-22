/**
 * Booking Item Entity
 * 
 * Represents an individual item within a booking (yacht, add-ons, etc.)
 */

/**
 * Booking item types
 */
export enum BookingItemType {
  YACHT = 'yacht',
  SERVICE_ADDON = 'service_addon',
  PRODUCT_ADDON = 'product_addon',
  EXPERIENCE_PACKAGE = 'experience_package'
}

/**
 * Booking Item entity
 */
export class BookingItem {
  private _id: string;
  private _bookingId: string;
  private _itemType: BookingItemType;
  private _itemId: string;
  private _title: string;
  private _description?: string;
  private _quantity: number;
  private _unitPrice: number;
  private _totalPrice: number;
  private _isRequired: boolean;
  private _providerId?: string;
  private _commissionRate?: number;
  private _commissionAmount?: number;
  private _addedAt: Date;
  private _metadata?: Record<string, any>;
  
  constructor(
    id: string,
    bookingId: string,
    itemType: BookingItemType,
    itemId: string,
    title: string,
    unitPrice: number,
    quantity: number = 1,
    isRequired: boolean = false,
    description?: string,
    providerId?: string,
    commissionRate?: number,
    addedAt?: Date,
    metadata?: Record<string, any>
  ) {
    this._id = id;
    this._bookingId = bookingId;
    this._itemType = itemType;
    this._itemId = itemId;
    this._title = title;
    this._description = description;
    this._quantity = quantity;
    this._unitPrice = unitPrice;
    this._totalPrice = unitPrice * quantity;
    this._isRequired = isRequired;
    this._providerId = providerId;
    this._commissionRate = commissionRate;
    this._addedAt = addedAt || new Date();
    this._metadata = metadata;
    
    // Calculate commission amount if rate is provided
    if (commissionRate !== undefined && commissionRate > 0) {
      this._commissionAmount = (this._totalPrice * commissionRate) / 100;
    }
    
    this.validate();
  }
  
  // Getters
  get id(): string { return this._id; }
  get bookingId(): string { return this._bookingId; }
  get itemType(): BookingItemType { return this._itemType; }
  get itemId(): string { return this._itemId; }
  get title(): string { return this._title; }
  get description(): string | undefined { return this._description; }
  get quantity(): number { return this._quantity; }
  get unitPrice(): number { return this._unitPrice; }
  get totalPrice(): number { return this._totalPrice; }
  get isRequired(): boolean { return this._isRequired; }
  get providerId(): string | undefined { return this._providerId; }
  get commissionRate(): number | undefined { return this._commissionRate; }
  get commissionAmount(): number | undefined { return this._commissionAmount; }
  get addedAt(): Date { return this._addedAt; }
  get metadata(): Record<string, any> | undefined { return this._metadata; }
  
  /**
   * Validate booking item
   */
  private validate(): void {
    if (!this._id) {
      throw new Error('Booking item ID is required');
    }
    
    if (!this._bookingId) {
      throw new Error('Booking ID is required');
    }
    
    if (!this._itemId) {
      throw new Error('Item ID is required');
    }
    
    if (!this._title) {
      throw new Error('Title is required');
    }
    
    if (this._quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    
    if (this._unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }
    
    if (this._commissionRate !== undefined && (this._commissionRate < 0 || this._commissionRate > 100)) {
      throw new Error('Commission rate must be between 0 and 100');
    }
  }
  
  /**
   * Update quantity
   */
  updateQuantity(quantity: number): BookingItem {
    if (quantity <= 0) {
      throw new Error('Quantity must be greater than zero');
    }
    
    return new BookingItem(
      this._id,
      this._bookingId,
      this._itemType,
      this._itemId,
      this._title,
      this._unitPrice,
      quantity,
      this._isRequired,
      this._description,
      this._providerId,
      this._commissionRate,
      this._addedAt,
      this._metadata
    );
  }
  
  /**
   * Update unit price
   */
  updateUnitPrice(unitPrice: number): BookingItem {
    if (unitPrice < 0) {
      throw new Error('Unit price cannot be negative');
    }
    
    return new BookingItem(
      this._id,
      this._bookingId,
      this._itemType,
      this._itemId,
      this._title,
      unitPrice,
      this._quantity,
      this._isRequired,
      this._description,
      this._providerId,
      this._commissionRate,
      this._addedAt,
      this._metadata
    );
  }
  
  /**
   * Update metadata
   */
  updateMetadata(metadata: Record<string, any>): BookingItem {
    return new BookingItem(
      this._id,
      this._bookingId,
      this._itemType,
      this._itemId,
      this._title,
      this._unitPrice,
      this._quantity,
      this._isRequired,
      this._description,
      this._providerId,
      this._commissionRate,
      this._addedAt,
      { ...this._metadata, ...metadata }
    );
  }
  
  /**
   * Check if this is a partner-provided item
   */
  isPartnerItem(): boolean {
    return !!this._providerId && 
      (this._itemType === BookingItemType.SERVICE_ADDON || 
       this._itemType === BookingItemType.PRODUCT_ADDON);
  }
  
  /**
   * Create a plain object representation for persistence
   */
  toObject(): Record<string, any> {
    return {
      id: this._id,
      bookingId: this._bookingId,
      itemType: this._itemType,
      itemId: this._itemId,
      title: this._title,
      description: this._description,
      quantity: this._quantity,
      unitPrice: this._unitPrice,
      totalPrice: this._totalPrice,
      isRequired: this._isRequired,
      providerId: this._providerId,
      commissionRate: this._commissionRate,
      commissionAmount: this._commissionAmount,
      addedAt: this._addedAt,
      metadata: this._metadata
    };
  }
  
  /**
   * Create a BookingItem from a plain object
   */
  static fromObject(data: Record<string, any>): BookingItem {
    return new BookingItem(
      data.id,
      data.bookingId,
      data.itemType,
      data.itemId,
      data.title,
      data.unitPrice,
      data.quantity,
      data.isRequired,
      data.description,
      data.providerId,
      data.commissionRate,
      data.addedAt instanceof Date ? data.addedAt : new Date(data.addedAt),
      data.metadata
    );
  }
}