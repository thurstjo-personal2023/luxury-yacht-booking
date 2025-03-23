/**
 * User Repository Interface
 * 
 * This interface defines operations for accessing and manipulating user data.
 */

import { User } from '../../domain/auth/user';

export interface IUserRepository {
  /**
   * Get a user by their ID
   */
  getUserById(userId: string): Promise<User | null>;
  
  /**
   * Get a user by their email
   */
  getUserByEmail(email: string): Promise<User | null>;
  
  /**
   * Create a new user profile
   */
  createUserProfile(userId: string, userData: Partial<User>): Promise<void>;
  
  /**
   * Update an existing user profile
   */
  updateUserProfile(userId: string, userData: Partial<User>): Promise<void>;
}