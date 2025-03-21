/**
 * User Repository Interface
 * 
 * This defines the contract for storing and retrieving User entities.
 */

import { User } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * Filters for retrieving users
 */
export interface UserFilters {
  role?: UserRole;
  emailVerified?: boolean;
  fromDate?: Date;
  toDate?: Date;
  searchTerm?: string;
}

/**
 * Paginated result for users
 */
export interface PaginatedUsers {
  users: User[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User repository interface
 */
export interface IUserRepository {
  /**
   * Find a user by their ID
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Find a user by their email
   */
  findByEmail(email: EmailAddress): Promise<User | null>;
  
  /**
   * Get users matching the given filters with pagination
   */
  findUsers(filters: UserFilters, page: number, pageSize: number): Promise<PaginatedUsers>;
  
  /**
   * Save a user (create if doesn't exist, update if exists)
   */
  save(user: User): Promise<User>;
  
  /**
   * Delete a user
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Check if a user with the given email exists
   */
  emailExists(email: EmailAddress): Promise<boolean>;
}