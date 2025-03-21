/**
 * User Repository Interface
 * 
 * This interface defines the contract for user persistence operations.
 */

import { User } from '../../../core/domain/user/user';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

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
  findByEmail(email: EmailAddress): Promise<User | null>;
  
  /**
   * Find users by role
   */
  findByRole(role: UserRole, limit?: number, offset?: number): Promise<User[]>;
  
  /**
   * Count users by role
   */
  countByRole(role: UserRole): Promise<number>;
  
  /**
   * Save a user (create or update)
   */
  save(user: User): Promise<User>;
  
  /**
   * Delete a user
   */
  delete(userId: string): Promise<boolean>;
  
  /**
   * Search users by name and/or email
   */
  search(query: string, role?: UserRole, limit?: number, offset?: number): Promise<User[]>;
  
  /**
   * Check if email exists
   */
  emailExists(email: EmailAddress): Promise<boolean>;
  
  /**
   * Get users by IDs
   */
  findByIds(ids: string[]): Promise<User[]>;
  
  /**
   * Find users with pagination
   */
  findAll(limit: number, offset: number): Promise<{
    users: User[];
    total: number;
  }>;
}