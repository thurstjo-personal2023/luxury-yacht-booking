/**
 * Admin Invitation Repository Interface
 * 
 * This interface defines the repository operations for admin invitations.
 * It abstracts the invitation data access layer from the application logic.
 */

import { AdminInvitation, AdminInvitationStatus } from '../../../domain/admin/admin-invitation';

/**
 * Search options for finding invitations
 */
export interface InvitationSearchOptions {
  status?: AdminInvitationStatus;
  email?: string;
  invitedBy?: string;
  limit?: number;
  offset?: number;
}

/**
 * Result of a paginated invitation search
 */
export interface InvitationSearchResult {
  invitations: AdminInvitation[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * Interface for the admin invitation repository
 */
export interface IAdminInvitationRepository {
  /**
   * Create a new invitation
   * @param invitation Admin invitation data
   * @returns Created invitation
   */
  create(invitation: AdminInvitation): Promise<AdminInvitation>;

  /**
   * Find an invitation by ID
   * @param id Invitation ID
   * @returns Invitation or null if not found
   */
  findById(id: string): Promise<AdminInvitation | null>;

  /**
   * Find an active invitation by email
   * @param email Email address
   * @returns Active invitation or null if not found
   */
  findActiveByEmail(email: string): Promise<AdminInvitation | null>;

  /**
   * Find an invitation by code
   * @param code Invitation code
   * @returns Invitation or null if not found
   */
  findByCode(code: string): Promise<AdminInvitation | null>;

  /**
   * Update an invitation
   * @param invitation Updated invitation data
   * @returns Updated invitation
   */
  update(invitation: AdminInvitation): Promise<AdminInvitation>;

  /**
   * Mark an invitation as used
   * @param id Invitation ID
   * @param userId ID of the user who accepted the invitation
   * @returns Updated invitation
   */
  markUsed(id: string, userId: string): Promise<AdminInvitation | null>;

  /**
   * Mark an invitation as expired
   * @param id Invitation ID
   * @returns Updated invitation
   */
  markExpired(id: string): Promise<AdminInvitation | null>;

  /**
   * Mark an invitation as revoked
   * @param id Invitation ID
   * @returns Updated invitation
   */
  markRevoked(id: string): Promise<AdminInvitation | null>;

  /**
   * Delete an invitation
   * @param id Invitation ID
   * @returns True if successful
   */
  delete(id: string): Promise<boolean>;

  /**
   * List invitations with pagination and filtering
   * @param options Search options
   * @returns Search result with pagination
   */
  list(options?: InvitationSearchOptions): Promise<InvitationSearchResult>;

  /**
   * List active invitations
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns List of active invitations
   */
  listActive(limit?: number, offset?: number): Promise<InvitationSearchResult>;

  /**
   * List expired invitations
   * @param limit Maximum number of results
   * @param offset Pagination offset
   * @returns List of expired invitations
   */
  listExpired(limit?: number, offset?: number): Promise<InvitationSearchResult>;

  /**
   * Count invitations by status
   * @param status Invitation status
   * @returns Count of invitations with the specified status
   */
  countByStatus(status: AdminInvitationStatus): Promise<number>;

  /**
   * Mark all expired invitations as expired
   * @returns Number of invitations marked as expired
   */
  markAllExpired(): Promise<number>;
}