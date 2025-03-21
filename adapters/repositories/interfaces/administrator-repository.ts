/**
 * Administrator Repository Interface
 * 
 * This interface defines the contract for administrator repository implementations.
 */

import { Administrator } from '../../../core/domain/user/administrator';
import { AdministratorApprovalStatus } from '../../../core/domain/user/administrator';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * Administrator filter options
 */
export interface AdministratorFilterOptions {
  role?: UserRole;
  approvalStatus?: AdministratorApprovalStatus;
  department?: string;
  mfaEnabled?: boolean;
  searchTerm?: string;
}

/**
 * Administrator pagination options
 */
export interface AdministratorPaginationOptions {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
}

/**
 * Paginated administrator result
 */
export interface PaginatedAdministrators {
  administrators: Administrator[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Administrator invitation
 */
export interface AdministratorInvitation {
  id: string;
  email: string;
  token: string;
  role: UserRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  acceptedAt?: Date;
  isAccepted: boolean;
}

/**
 * Administrator invitation filter options
 */
export interface InvitationFilterOptions {
  isAccepted?: boolean;
  isExpired?: boolean;
}

/**
 * Paginated invitation result
 */
export interface PaginatedInvitations {
  invitations: AdministratorInvitation[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Administrator repository interface
 */
export interface IAdministratorRepository {
  /**
   * Save an administrator
   */
  save(administrator: Administrator): Promise<Administrator>;
  
  /**
   * Find an administrator by ID
   */
  findById(id: string): Promise<Administrator | null>;
  
  /**
   * Find an administrator by email
   */
  findByEmail(email: EmailAddress | string): Promise<Administrator | null>;
  
  /**
   * Get all administrators
   */
  findAll(
    filters?: AdministratorFilterOptions,
    pagination?: AdministratorPaginationOptions
  ): Promise<PaginatedAdministrators>;
  
  /**
   * Delete an administrator
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Find administrators by approval status
   */
  findByApprovalStatus(
    status: AdministratorApprovalStatus,
    pagination?: AdministratorPaginationOptions
  ): Promise<PaginatedAdministrators>;
  
  /**
   * Count administrators by approval status
   */
  countByApprovalStatus(status: AdministratorApprovalStatus): Promise<number>;
  
  /**
   * Find administrators by role
   */
  findByRole(
    role: UserRole,
    pagination?: AdministratorPaginationOptions
  ): Promise<PaginatedAdministrators>;
  
  /**
   * Search administrators
   */
  search(
    query: string,
    filters?: AdministratorFilterOptions,
    pagination?: AdministratorPaginationOptions
  ): Promise<PaginatedAdministrators>;
  
  /**
   * Create an administrator invitation
   */
  createInvitation(invitation: Omit<AdministratorInvitation, 'id'>): Promise<AdministratorInvitation>;
  
  /**
   * Find an invitation by ID
   */
  findInvitationById(id: string): Promise<AdministratorInvitation | null>;
  
  /**
   * Find an invitation by token
   */
  findInvitationByToken(token: string): Promise<AdministratorInvitation | null>;
  
  /**
   * Find invitations by email
   */
  findInvitationsByEmail(email: string): Promise<AdministratorInvitation[]>;
  
  /**
   * Get all invitations
   */
  findAllInvitations(
    filters?: InvitationFilterOptions,
    pagination?: AdministratorPaginationOptions
  ): Promise<PaginatedInvitations>;
  
  /**
   * Mark an invitation as accepted
   */
  markInvitationAsAccepted(id: string): Promise<AdministratorInvitation>;
  
  /**
   * Delete an invitation
   */
  deleteInvitation(id: string): Promise<boolean>;
}