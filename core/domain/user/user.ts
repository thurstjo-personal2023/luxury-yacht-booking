/**
 * User Domain Entity
 * 
 * This represents a user in the domain model.
 */

import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';
import { Password } from '../value-objects/password';
import { UserRole } from './user-role';

/**
 * User properties
 */
export interface UserProps {
  id: string;
  email: EmailAddress;
  firstName: string;
  lastName: string;
  phone?: PhoneNumber;
  password?: Password;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
}

/**
 * User entity
 */
export class User {
  readonly id: string;
  readonly email: EmailAddress;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: PhoneNumber;
  readonly password?: Password;
  readonly role: UserRole;
  readonly isEmailVerified: boolean;
  readonly isPhoneVerified: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly lastLoginAt?: Date;
  
  constructor(props: UserProps) {
    this.id = props.id;
    this.email = props.email;
    this.firstName = props.firstName;
    this.lastName = props.lastName;
    this.phone = props.phone;
    this.password = props.password;
    this.role = props.role;
    this.isEmailVerified = props.isEmailVerified;
    this.isPhoneVerified = props.isPhoneVerified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.lastLoginAt = props.lastLoginAt;
    
    this.validate();
  }
  
  /**
   * Validate the user entity
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
    
    if (!this.role) {
      throw new Error('User role is required');
    }
    
    if (!(this.createdAt instanceof Date)) {
      throw new Error('Created at must be a Date');
    }
    
    if (!(this.updatedAt instanceof Date)) {
      throw new Error('Updated at must be a Date');
    }
    
    if (this.lastLoginAt && !(this.lastLoginAt instanceof Date)) {
      throw new Error('Last login at must be a Date');
    }
  }
  
  /**
   * Get the full name of the user
   */
  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }
  
  /**
   * Check if the user has a verified email
   */
  hasVerifiedEmail(): boolean {
    return this.isEmailVerified;
  }
  
  /**
   * Check if the user has a verified phone
   */
  hasVerifiedPhone(): boolean {
    return this.isPhoneVerified && !!this.phone;
  }
  
  /**
   * Check if the user has a password
   */
  hasPassword(): boolean {
    return !!this.password;
  }
  
  /**
   * Create a copy of the user with verified email
   */
  verifyEmail(): User {
    return new User({
      ...this,
      isEmailVerified: true,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with verified phone
   */
  verifyPhone(): User {
    if (!this.phone) {
      throw new Error('Cannot verify phone: Phone number not set');
    }
    
    return new User({
      ...this,
      isPhoneVerified: true,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with a new phone number
   */
  updatePhone(phone: PhoneNumber): User {
    return new User({
      ...this,
      phone,
      isPhoneVerified: false,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with a new password
   */
  updatePassword(password: Password): User {
    return new User({
      ...this,
      password,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with a new email
   */
  updateEmail(email: EmailAddress): User {
    return new User({
      ...this,
      email,
      isEmailVerified: false,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with updated names
   */
  updateNames(firstName: string, lastName: string): User {
    return new User({
      ...this,
      firstName,
      lastName,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with a new role
   */
  updateRole(role: UserRole): User {
    return new User({
      ...this,
      role,
      updatedAt: new Date()
    });
  }
  
  /**
   * Create a copy of the user with updated login time
   */
  recordLogin(): User {
    return new User({
      ...this,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  /**
   * Check if the user is an administrator
   */
  isAdmin(): boolean {
    return this.role === UserRole.ADMINISTRATOR || this.role === UserRole.SUPER_ADMINISTRATOR;
  }
  
  /**
   * Check if the user is a super administrator
   */
  isSuperAdmin(): boolean {
    return this.role === UserRole.SUPER_ADMINISTRATOR;
  }
  
  /**
   * Check if the user's email matches the provided email
   */
  hasEmail(email: string | EmailAddress): boolean {
    const emailToCompare = typeof email === 'string' 
      ? email.toLowerCase().trim() 
      : email.getValue();
    
    return this.email.getValue() === emailToCompare;
  }
  
  /**
   * Compare this user with another user
   */
  equals(other: User): boolean {
    return this.id === other.id;
  }
}