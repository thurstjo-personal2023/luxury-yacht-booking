/**
 * Administrator Repository Interface
 * 
 * This defines the contract for storing and retrieving Administrator entities.
 */

import { Administrator } from '../../../core/domain/user/administrator';
import { IUserRepository, UserFilters } from './user-repository';

/**
 * Administrator specific filters
 */
export interface AdministratorFilters extends UserFilters {
  isApproved?: boolean;
  mfaEnabled?: boolean;
  isSuper?: boolean;
  invitedBy?: string;
}

/**
 * Paginated result for administrators
 */
export interface PaginatedAdministrators {
  administrators: Administrator[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Administrator repository interface
 */
export interface IAdministratorRepository extends Omit<IUserRepository, 'findUsers'> {
  /**
   * Find administrators matching the given filters with pagination
   */
  findAdministrators(filters: AdministratorFilters, page: number, pageSize: number): Promise<PaginatedAdministrators>;
  
  /**
   * Get pending administrator approvals
   */
  getPendingApprovals(page: number, pageSize: number): Promise<PaginatedAdministrators>;
  
  /**
   * Check if invitation code is valid
   */
  isInvitationValid(invitationCode: string): Promise<boolean>;
  
  /**
   * Create an admin invitation
   */
  createInvitation(superAdminId: string, email: string): Promise<{ code: string; expiresAt: Date }>;
  
  /**
   * Get administrator by invitation code
   */
  findByInvitationCode(code: string): Promise<Administrator | null>;
  
  /**
   * Save an administrator (create if doesn't exist, update if exists)
   */
  saveAdministrator(administrator: Administrator): Promise<Administrator>;
}