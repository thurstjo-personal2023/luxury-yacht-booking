/**
 * User Domain Entity
 * 
 * This represents the core User entity in the domain layer,
 * independent of any frameworks or external dependencies.
 */

import { UserRole } from './user-role';
import { EmailAddress } from '../value-objects/email-address';
import { PhoneNumber } from '../value-objects/phone-number';

export interface UserProps {
  id: string;
  name: string;
  email: EmailAddress;
  phone?: PhoneNumber;
  role: UserRole;
  emailVerified: boolean;
  points: number;
  createdAt: Date;
  updatedAt: Date;
}

export class User {
  readonly id: string;
  readonly name: string;
  readonly email: EmailAddress;
  readonly phone?: PhoneNumber;
  readonly role: UserRole;
  readonly emailVerified: boolean;
  readonly points: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;

  constructor(props: UserProps) {
    this.id = props.id;
    this.name = props.name;
    this.email = props.email;
    this.phone = props.phone;
    this.role = props.role;
    this.emailVerified = props.emailVerified;
    this.points = props.points;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }

  /**
   * Factory method to create a new User
   */
  static create(props: Omit<UserProps, 'createdAt' | 'updatedAt' | 'points' | 'emailVerified'>): User {
    return new User({
      ...props,
      points: 0,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  /**
   * Verify the user's email
   */
  verifyEmail(): User {
    return new User({
      ...this,
      emailVerified: true,
      updatedAt: new Date()
    });
  }

  /**
   * Add loyalty points to the user
   */
  addPoints(points: number): User {
    if (points < 0) {
      throw new Error('Cannot add negative points');
    }
    
    return new User({
      ...this,
      points: this.points + points,
      updatedAt: new Date()
    });
  }

  /**
   * Check if user has a specific role
   */
  hasRole(role: UserRole): boolean {
    return this.role === role;
  }

  /**
   * Create a copy of this user with updated properties
   */
  update(props: Partial<Omit<UserProps, 'id' | 'createdAt'>>): User {
    return new User({
      ...this,
      ...props,
      id: this.id, // Ensure ID cannot be changed
      createdAt: this.createdAt, // Ensure createdAt cannot be changed
      updatedAt: new Date() // Always update the updatedAt timestamp
    });
  }
}