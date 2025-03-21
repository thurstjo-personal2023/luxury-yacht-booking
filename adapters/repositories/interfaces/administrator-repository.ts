/**
 * Administrator Repository Interface
 * 
 * This interface defines the contract for administrator persistence operations.
 */

import { Administrator } from '../../../core/domain/user/administrator';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';

/**
 * Invitation data type
 */
export interface AdminInvitation {
  id: string;
  code: string;
  email: EmailAddress;
  invitedBy: string;
  createdAt: Date;
  expiresAt: Date;
  isUsed: boolean;
  usedAt?: Date;
}

/**
 * Administrator repository interface
 */
export interface IAdministratorRepository {
  /**
   * Find an administrator by ID
   */
  findById(id: string): Promise<Administrator | null>;
  
  /**
   * Find an administrator by email
   */
  findByEmail(email: EmailAddress): Promise<Administrator | null>;
  
  /**
   * Save an administrator (create or update)
   */
  save(administrator: Administrator): Promise<Administrator>;
  
  /**
   * Delete an administrator
   */
  delete(adminId: string): Promise<boolean>;
  
  /**
   * Find all administrators
   */
  findAll(includeNotApproved?: boolean, limit?: number, offset?: number): Promise<{
    administrators: Administrator[];
    total: number;
  }>;
  
  /**
   * Find pending approval administrators
   */
  findPendingApproval(limit?: number, offset?: number): Promise<{
    administrators: Administrator[];
    total: number;
  }>;
  
  /**
   * Create an invitation
   */
  createInvitation(email: EmailAddress, invitedBy: string, expiresInHours?: number): Promise<AdminInvitation>;
  
  /**
   * Find invitation by code
   */
  findInvitationByCode(code: string): Promise<AdminInvitation | null>;
  
  /**
   * Mark invitation as used
   */
  markInvitationAsUsed(code: string): Promise<AdminInvitation | null>;
  
  /**
   * Delete invitation
   */
  deleteInvitation(code: string): Promise<boolean>;
  
  /**
   * Get all invitations
   */
  findAllInvitations(includeUsed?: boolean, limit?: number, offset?: number): Promise<{
    invitations: AdminInvitation[];
    total: number;
  }>;
  
  /**
   * Search administrators by name, email, or role
   */
  search(query: string, limit?: number, offset?: number): Promise<{
    administrators: Administrator[];
    total: number;
  }>;
  
  /**
   * Count total administrators
   */
  countAll(includeNotApproved?: boolean): Promise<number>;
  
  /**
   * Count pending approvals
   */
  countPendingApproval(): Promise<number>;
  
  /**
   * Count active invitations
   */
  countActiveInvitations(): Promise<number>;
  
  /**
   * Record admin activity (to prevent session timeout)
   */
  recordActivity(adminId: string): Promise<boolean>;
  
  /**
   * Get last activity timestamp for admin
   */
  getLastActivity(adminId: string): Promise<Date | null>;
}