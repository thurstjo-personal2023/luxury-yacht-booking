/**
 * User Repository Interface
 * 
 * This interface defines the contract for user repository implementations.
 */

import { User } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * User filter options
 */
export interface UserFilterOptions {
  role?: UserRole;
  isEmailVerified?: boolean;
  searchTerm?: string;
}

/**
 * User pagination options
 */
export interface UserPaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated user result
 */
export interface PaginatedUsers {
  users: User[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * User repository interface
 */
export interface IUserRepository {
  /**
   * Save a user
   */
  save(user: User): Promise<User>;
  
  /**
   * Find a user by ID
   */
  findById(id: string): Promise<User | null>;
  
  /**
   * Find a user by email
   */
  findByEmail(email: EmailAddress | string): Promise<User | null>;
  
  /**
   * Get all users
   */
  findAll(
    filters?: UserFilterOptions,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers>;
  
  /**
   * Delete a user
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Check if a user exists by email
   */
  existsByEmail(email: EmailAddress | string): Promise<boolean>;
  
  /**
   * Find users by role
   */
  findByRole(
    role: UserRole,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers>;
  
  /**
   * Search users
   */
  search(
    query: string,
    filters?: UserFilterOptions,
    pagination?: UserPaginationOptions
  ): Promise<PaginatedUsers>;
  
  /**
   * Count users by role
   */
  countByRole(role: UserRole): Promise<number>;
}