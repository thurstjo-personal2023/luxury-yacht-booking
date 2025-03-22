/**
 * Customer Details Value Object
 * 
 * Represents customer information for a booking
 */

/**
 * Contact information
 */
export interface ContactInformation {
  email: string;
  phone?: string;
  alternativePhone?: string;
}

/**
 * Customer details value object
 */
export class CustomerDetails {
  private _userId?: string;
  private _name: string;
  private _contactInformation: ContactInformation;
  private _specialRequests?: string;
  private _isAuthenticated: boolean;
  
  constructor(
    name: string,
    contactInformation: ContactInformation,
    userId?: string,
    specialRequests?: string
  ) {
    this._name = name;
    this._contactInformation = contactInformation;
    this._userId = userId;
    this._specialRequests = specialRequests;
    this._isAuthenticated = !!userId;
    
    this.validate();
  }
  
  // Getters
  get userId(): string | undefined { return this._userId; }
  get name(): string { return this._name; }
  get contactInformation(): ContactInformation { return this._contactInformation; }
  get specialRequests(): string | undefined { return this._specialRequests; }
  get isAuthenticated(): boolean { return this._isAuthenticated; }
  
  /**
   * Validate customer details
   */
  private validate(): void {
    if (!this._name || this._name.trim().length === 0) {
      throw new Error('Customer name is required');
    }
    
    if (!this._contactInformation) {
      throw new Error('Contact information is required');
    }
    
    if (!this._contactInformation.email) {
      throw new Error('Email is required');
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(this._contactInformation.email)) {
      throw new Error('Invalid email format');
    }
    
    // Validate phone number if provided
    if (this._contactInformation.phone) {
      // Simple validation - can be enhanced based on requirements
      const phoneRegex = /^[+]?[0-9\s-()]{8,20}$/;
      if (!phoneRegex.test(this._contactInformation.phone)) {
        throw new Error('Invalid phone number format');
      }
    }
    
    // Validate alternative phone if provided
    if (this._contactInformation.alternativePhone) {
      const phoneRegex = /^[+]?[0-9\s-()]{8,20}$/;
      if (!phoneRegex.test(this._contactInformation.alternativePhone)) {
        throw new Error('Invalid alternative phone number format');
      }
    }
  }
  
  /**
   * Update special requests
   */
  updateSpecialRequests(specialRequests: string): CustomerDetails {
    return new CustomerDetails(
      this._name,
      this._contactInformation,
      this._userId,
      specialRequests
    );
  }
  
  /**
   * Update contact information
   */
  updateContactInformation(contactInformation: ContactInformation): CustomerDetails {
    return new CustomerDetails(
      this._name,
      contactInformation,
      this._userId,
      this._specialRequests
    );
  }
  
  /**
   * Create a plain object representation for persistence
   */
  toObject(): Record<string, any> {
    return {
      userId: this._userId,
      name: this._name,
      contactInformation: this._contactInformation,
      specialRequests: this._specialRequests,
      isAuthenticated: this._isAuthenticated
    };
  }
  
  /**
   * Create CustomerDetails from a plain object
   */
  static fromObject(data: Record<string, any>): CustomerDetails {
    return new CustomerDetails(
      data.name,
      data.contactInformation,
      data.userId,
      data.specialRequests
    );
  }
  
  /**
   * Create anonymous guest customer details
   */
  static createGuestDetails(
    name: string,
    email: string,
    phone?: string,
    specialRequests?: string
  ): CustomerDetails {
    return new CustomerDetails(
      name,
      { email, phone },
      undefined,
      specialRequests
    );
  }
}