/**
 * User Domain Entity
 * 
 * This represents a user in the system with the core properties and behaviors.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { UserRole } from './user-role';

/**
 * User properties interface
 */
export interface UserProps {
  id: string;
  email: EmailAddress;
  name: string;
  role: UserRole;
  phone?: PhoneNumber;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  profileImageUrl?: string;
  preferences?: Map<string, any>;
}

/**
 * User domain entity
 */
export class User {
  readonly id: string;
  readonly email: EmailAddress;
  readonly name: string;
  readonly role: UserRole;
  readonly phone?: PhoneNumber;
  readonly emailVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date;
  readonly profileImageUrl?: string;
  readonly preferences: Map<string, any>;
  
  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.name = props.name;
    this.role = props.role;
    this.phone = props.phone;
    this.emailVerified = props.emailVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.lastLoginAt = props.lastLoginAt;
    this.profileImageUrl = props.profileImageUrl;
    this.preferences = props.preferences || new Map<string, any>();
  }
  
  /**
   * Create a new user
   */
  static create(props: Omit<UserProps, 'createdAt' | 'updatedAt'> & { createdAt?: Date; updatedAt?: Date }): User {
    const now = new Date();
    
    return new User({
      ...props,
      createdAt: props.createdAt || now,
      updatedAt: props.updatedAt || now
    });
  }
  
  /**
   * Update user properties
   */
  update(props: Partial<Omit<UserProps, 'id' | 'email' | 'createdAt'>>): User {
    return new User({
      ...this,
      ...props,
      updatedAt: new Date()
    });
  }
  
  /**
   * Mark email as verified
   */
  verifyEmail(): User {
    return this.update({ emailVerified: true });
  }
  
  /**
   * Update last login timestamp
   */
  recordLogin(): User {
    return this.update({ lastLoginAt: new Date() });
  }
  
  /**
   * Update user phone number
   */
  updatePhone(phone: PhoneNumber): User {
    return this.update({ phone });
  }
  
  /**
   * Update user profile image
   */
  updateProfileImage(imageUrl: string): User {
    return this.update({ profileImageUrl: imageUrl });
  }
  
  /**
   * Set a preference value
   */
  setPreference(key: string, value: any): User {
    const newPreferences = new Map(this.preferences);
    newPreferences.set(key, value);
    
    return this.update({ preferences: newPreferences });
  }
  
  /**
   * Get a preference value
   */
  getPreference(key: string): any {
    return this.preferences.get(key);
  }
  
  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }
  
  /**
   * Check if the user is a regular user (not an admin)
   */
  isRegularUser(): boolean {
    return this.role === UserRole.CONSUMER || 
           this.role === UserRole.PRODUCER || 
           this.role === UserRole.PARTNER;
  }
  
  /**
   * Convert to a plain object for data transfer
   */
  toObject(): Record<string, any> {
    return {
      id: this.id,
      email: this.email.toString(),
      name: this.name,
      role: this.role,
      phone: this.phone?.toString(),
      emailVerified: this.emailVerified,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      lastLoginAt: this.lastLoginAt,
      profileImageUrl: this.profileImageUrl,
      preferences: Object.fromEntries(this.preferences)
    };
  }
}