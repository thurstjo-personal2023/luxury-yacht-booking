/**
 * User Repository Interface
 * 
 * Defines the contract for user data persistence operations.
 */

import { User } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { PhoneNumber } from '../../../core/domain/value-objects/phone-number';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * User search criteria
 */
export interface UserSearchCriteria {
  role?: UserRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  isEmailVerified?: boolean;
  isPhoneVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

/**
 * User repository interface
 */
export interface IUserRepository {
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Find a user by email
   */
  findByEmail(email: EmailAddress | string): Promise<User | null>;
  
  /**
   * Find a user by phone number
   */
  findByPhone(phone: PhoneNumber | string): Promise<User | null>;
  
  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;
  
  /**
   * Search for users based on criteria
   */
  search(criteria: UserSearchCriteria): Promise<User[]>;
  
  /**
   * Count users matching criteria
   */
  count(criteria: UserSearchCriteria): Promise<number>;
  
  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<User>;
  
  /**
   * Create a new user
   */
  create(user: User): Promise<User>;
  
  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;
  
  /**
   * Delete a user by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Verify a user's email
   */
  verifyEmail(id: string): Promise<User | null>;
  
  /**
   * Verify a user's phone number
   */
  verifyPhone(id: string): Promise<User | null>;
  
  /**
   * Update a user's last login time
   */
  updateLastLogin(id: string, lastLoginAt: Date): Promise<User | null>;
}