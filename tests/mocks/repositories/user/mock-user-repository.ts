/**
 * Mock User Repository
 * 
 * This class provides a mock implementation of the IUserRepository interface
 * for testing use cases and controllers without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IUserRepository } from '../../../../core/application/ports/repositories/user-repository';
import { User } from '../../../../core/domain/user/user';
import { UserProfile } from '../../../../core/domain/user/user-profile';
import { UserQueryOptions, PagedUsers } from '../../../../core/application/ports/repositories/user-repository';
import { UserRole } from '../../../../core/domain/user/user-role';

export class MockUserRepository extends BaseMockRepository implements IUserRepository {
  // In-memory storage for users and profiles
  private users: Map<string, User> = new Map();
  private profiles: Map<string, UserProfile> = new Map();
  
  /**
   * Get a user by ID
   * @param id User ID
   */
  async getById(id: string): Promise<User | null> {
    return this.executeMethod<User | null>('getById', [id], () => {
      return this.users.has(id) ? this.users.get(id) || null : null;
    });
  }
  
  /**
   * Get a user by email
   * @param email User email
   */
  async getByEmail(email: string): Promise<User | null> {
    return this.executeMethod<User | null>('getByEmail', [email], () => {
      return Array.from(this.users.values())
        .find(user => user.email === email) || null;
    });
  }
  
  /**
   * Create a new user
   * @param user User to create
   */
  async create(user: User): Promise<string> {
    return this.executeMethod<string>('create', [user], () => {
      const id = user.id || `mock-user-${Date.now()}`;
      const newUser = { ...user, id };
      this.users.set(id, newUser);
      return id;
    });
  }
  
  /**
   * Update an existing user
   * @param id User ID
   * @param user Updated user data
   */
  async update(id: string, user: Partial<User>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, user], () => {
      if (!this.users.has(id)) {
        return false;
      }
      
      const existingUser = this.users.get(id);
      if (!existingUser) return false;
      
      this.users.set(id, { ...existingUser, ...user });
      return true;
    });
  }
  
  /**
   * Delete a user
   * @param id User ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      // Also delete profile if it exists
      this.profiles.delete(id);
      return this.users.delete(id);
    });
  }
  
  /**
   * List users by query options
   * @param options Query options
   */
  async listUsers(options?: UserQueryOptions): Promise<PagedUsers> {
    return this.executeMethod<PagedUsers>('listUsers', [options], () => {
      const page = options?.page || 1;
      const pageSize = options?.pageSize || 10;
      
      let filteredUsers = Array.from(this.users.values());
      
      // Apply filters
      if (options?.role) {
        filteredUsers = filteredUsers.filter(user => 
          user.role === options.role
        );
      }
      
      if (options?.status) {
        filteredUsers = filteredUsers.filter(user => 
          user.status === options.status
        );
      }
      
      if (options?.search) {
        const searchLower = options.search.toLowerCase();
        filteredUsers = filteredUsers.filter(user => 
          user.email.toLowerCase().includes(searchLower) ||
          user.displayName?.toLowerCase().includes(searchLower)
        );
      }
      
      // Apply sorting
      if (options?.sortBy) {
        const sortField = options.sortBy;
        const sortDir = options?.sortDir || 'asc';
        
        filteredUsers.sort((a: any, b: any) => {
          const aValue = a[sortField];
          const bValue = b[sortField];
          
          if (aValue === bValue) return 0;
          
          if (sortDir === 'asc') {
            return aValue < bValue ? -1 : 1;
          } else {
            return aValue > bValue ? -1 : 1;
          }
        });
      }
      
      const totalCount = filteredUsers.length;
      const startIndex = (page - 1) * pageSize;
      const items = filteredUsers.slice(startIndex, startIndex + pageSize);
      
      return {
        items,
        totalCount,
        hasMore: startIndex + pageSize < totalCount
      };
    });
  }
  
  /**
   * Get users by role
   * @param role User role
   */
  async getByRole(role: UserRole): Promise<User[]> {
    return this.executeMethod<User[]>('getByRole', [role], () => {
      return Array.from(this.users.values())
        .filter(user => user.role === role);
    });
  }
  
  /**
   * Get a user profile by user ID
   * @param userId User ID
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    return this.executeMethod<UserProfile | null>('getProfile', [userId], () => {
      return this.profiles.has(userId) ? this.profiles.get(userId) || null : null;
    });
  }
  
  /**
   * Create a new user profile
   * @param profile User profile to create
   */
  async createProfile(profile: UserProfile): Promise<boolean> {
    return this.executeMethod<boolean>('createProfile', [profile], () => {
      this.profiles.set(profile.userId, profile);
      return true;
    });
  }
  
  /**
   * Update an existing user profile
   * @param userId User ID
   * @param profile Updated profile data
   */
  async updateProfile(userId: string, profile: Partial<UserProfile>): Promise<boolean> {
    return this.executeMethod<boolean>('updateProfile', [userId, profile], () => {
      if (!this.profiles.has(userId)) {
        return false;
      }
      
      const existingProfile = this.profiles.get(userId);
      if (!existingProfile) return false;
      
      this.profiles.set(userId, { ...existingProfile, ...profile });
      return true;
    });
  }
  
  /**
   * Check if a user exists by ID
   * @param id User ID
   */
  async exists(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('exists', [id], () => {
      return this.users.has(id);
    });
  }
  
  /**
   * Check if a user exists by email
   * @param email User email
   */
  async existsByEmail(email: string): Promise<boolean> {
    return this.executeMethod<boolean>('existsByEmail', [email], () => {
      return Array.from(this.users.values())
        .some(user => user.email === email);
    });
  }
  
  /**
   * Count users matching criteria
   * @param options Query options
   */
  async count(options?: UserQueryOptions): Promise<number> {
    return this.executeMethod<number>('count', [options], () => {
      let filteredUsers = Array.from(this.users.values());
      
      // Apply filters
      if (options?.role) {
        filteredUsers = filteredUsers.filter(user => 
          user.role === options.role
        );
      }
      
      if (options?.status) {
        filteredUsers = filteredUsers.filter(user => 
          user.status === options.status
        );
      }
      
      return filteredUsers.length;
    });
  }
  
  /**
   * Set mock users for testing
   * @param users Array of users to use as mock data
   */
  setMockUsers(users: User[]): void {
    this.users.clear();
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }
  
  /**
   * Set mock profiles for testing
   * @param profiles Array of user profiles to use as mock data
   */
  setMockProfiles(profiles: UserProfile[]): void {
    this.profiles.clear();
    for (const profile of profiles) {
      this.profiles.set(profile.userId, profile);
    }
  }
  
  /**
   * Clear all mock users and profiles
   */
  clearMockUsers(): void {
    this.users.clear();
    this.profiles.clear();
  }
}