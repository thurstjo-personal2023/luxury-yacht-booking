/**
 * User Entity
 * 
 * Represents a user in the system with core properties and behaviors.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { UserRole, hasPermission } from './user-role';

/**
 * User constructor properties
 */
export interface UserProps {
  id: string;
  firstName: string;
  lastName: string;
  email: EmailAddress;
  phone?: PhoneNumber;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  createdAt: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  preferences?: string[];
}

/**
 * User entity
 */
export class User {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: EmailAddress;
  readonly phone?: PhoneNumber;
  readonly role: UserRole;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date;
  readonly preferences: string[];
  
  constructor(props: UserProps) {
    this.id = props.id;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.email = props.email;
    this.phone = props.phone;
    this.role = props.role;
    this.isEmailVerified = props.isEmailVerified;
    this.isPhoneVerified = props.isPhoneVerified || false;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt || new Date();
    this.lastLoginAt = props.lastLoginAt;
    this.preferences = props.preferences || [];
    
    this.validate();
  }
  
  /**
   * Get the full name of the user
   */
  get fullName(): string {
    return `${this.firstName} ${this.lastName}`.trim();
  }
  
  /**
   * Get user initials (first letters of first and last name)
   */
  get initials(): string {
    return (
      (this.firstName.charAt(0) + this.lastName.charAt(0))
        .toUpperCase()
        .trim()
    );
  }
  
  /**
   * Create a user with updated properties
   */
  update(props: Partial<Omit<UserProps, 'id' | 'createdAt'>>): User {
    return new User({
      id: this.id,
      firstName: props.firstName || this.firstName,
      lastName: props.lastName || this.lastName,
      email: props.email || this.email,
      phone: props.phone || this.phone,
      role: props.role || this.role,
      isEmailVerified: props.isEmailVerified !== undefined ? props.isEmailVerified : this.isEmailVerified,
      isPhoneVerified: props.isPhoneVerified !== undefined ? props.isPhoneVerified : this.isPhoneVerified,
      createdAt: this.createdAt,
      updatedAt: new Date(),
      lastLoginAt: props.lastLoginAt || this.lastLoginAt,
      preferences: props.preferences || this.preferences
    });
  }
  
  /**
   * Update the email address
   */
  updateEmail(email: EmailAddress): User {
    return this.update({
      email,
      isEmailVerified: false // Reset email verification status
    });
  }
  
  /**
   * Update the phone number
   */
  updatePhone(phone: PhoneNumber): User {
    return this.update({
      phone,
      isPhoneVerified: false // Reset phone verification status
    });
  }
  
  /**
   * Record a login
   */
  recordLogin(): User {
    return this.update({
      lastLoginAt: new Date()
    });
  }
  
  /**
   * Add a preference
   */
  addPreference(preference: string): User {
    if (this.preferences.includes(preference)) {
      return this;
    }
    
    return this.update({
      preferences: [...this.preferences, preference]
    });
  }
  
  /**
   * Remove a preference
   */
  removePreference(preference: string): User {
    if (!this.preferences.includes(preference)) {
      return this;
    }
    
    return this.update({
      preferences: this.preferences.filter(p => p !== preference)
    });
  }
  
  /**
   * Check if the user has a specific permission
   */
  hasPermission(permission: string): boolean {
    return hasPermission(this.role, permission);
  }
  
  /**
   * Convert to a plain object for storage
   */
  toJSON(): Record<string, any> {
    return {
      id: this.id,
      firstName: this.firstName,
      lastName: this.lastName,
      email: this.email.value,
      phone: this.phone?.value,
      role: this.role,
      isEmailVerified: this.isEmailVerified,
      isPhoneVerified: this.isPhoneVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      preferences: this.preferences
    };
  }
  
  /**
   * Validate the user properties
   */
  private validate(): void {
    if (!this.id) {
      throw new Error('User ID is required');
    }
    
    if (!this.firstName) {
      throw new Error('First name is required');
    }
    
    if (!this.lastName) {
      throw new Error('Last name is required');
    }
    
    if (!this.email) {
      throw new Error('Email is required');
    }
    
    if (!Object.values(UserRole).includes(this.role)) {
      throw new Error(`Invalid role: ${this.role}`);
    }
  }
}