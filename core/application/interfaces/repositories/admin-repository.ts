/**
 * Admin Repository Interface
 * 
 * This interface defines the repository operations for admin users.
 * It abstracts the data access layer from the application logic.
 */

import { AdminUser, AdminUserStatus } from '../../../domain/admin/admin-user';

/**
 * Search options for finding admins
 */
export interface AdminSearchOptions {
  status?: AdminUserStatus;
  role?: string;
  limit?: number;
  offset?: number;
}

/**
 * Result of a paginated admin search
 */
export interface AdminSearchResult {
  admins: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface for the admin repository
 */
export interface IAdminRepository {
  /**
   * Find an admin by ID
   * @param id Admin ID
   * @returns Admin user or null if not found
   */
  findById(id: string): Promise<AdminUser | null>;

  /**
   * Find an admin by email
   * @param email Admin email
   * @returns Admin user or null if not found
   */
  findByEmail(email: string): Promise<AdminUser | null>;

  /**
   * Create a new admin
   * @param admin Admin user data
   * @returns Created admin user
   */
  create(admin: AdminUser): Promise<AdminUser>;

  /**
   * Update an existing admin
   * @param admin Admin user data
   * @returns Updated admin user
   */
  update(admin: AdminUser): Promise<AdminUser>;

  /**
   * Delete an admin
   * @param id Admin ID
   * @returns True if successful
   */
  delete(id: string): Promise<boolean>;

  /**
   * List admins with pagination and filtering
   * @param options Search options
   * @returns Search result with pagination
   */
  list(options?: AdminSearchOptions): Promise<AdminSearchResult>;

  /**
   * List pending admin approvals
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns List of admins pending approval
   */
  listPendingApprovals(limit?: number, offset?: number): Promise<AdminSearchResult>;

  /**
   * Count admins by status
   * @param status Admin status
   * @returns Count of admins with the specified status
   */
  countByStatus(status: AdminUserStatus): Promise<number>;
}