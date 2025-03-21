/**
 * Administrator Repository Interface
 * 
 * Defines the contract for administrator data persistence operations.
 */

import { Administrator } from '../../../core/domain/user/administrator';
import { AdministratorApprovalStatus } from '../../../core/domain/user/administrator-approval-status';
import { EmailAddress } from '../../../core/domain/value-objects/email-address';
import { UserRole } from '../../../core/domain/user/user-role';

/**
 * Administrator invitation data
 */
export interface AdministratorInvitation {
  id: string;
  email: string;
  token: string;
  role: UserRole;
  invitedBy: string;
  invitedAt: Date;
  expiresAt: Date;
  isAccepted: boolean;
  acceptedAt?: Date;
}

/**
 * Administrator search criteria
 */
export interface AdministratorSearchCriteria {
  role?: UserRole;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  position?: string;
  approvalStatus?: AdministratorApprovalStatus;
  mfaEnabled?: boolean;
  isEmailVerified?: boolean;
  invitedBy?: string;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
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
  findByEmail(email: EmailAddress | string): Promise<Administrator | null>;
  
  /**
   * Find administrators by role
   */
  findByRole(role: UserRole): Promise<Administrator[]>;
  
  /**
   * Find administrators by approval status
   */
  findByApprovalStatus(status: AdministratorApprovalStatus): Promise<Administrator[]>;
  
  /**
   * Find administrators by who invited them
   */
  findByInvitedBy(invitedBy: string): Promise<Administrator[]>;
  
  /**
   * Search for administrators based on criteria
   */
  search(criteria: AdministratorSearchCriteria): Promise<Administrator[]>;
  
  /**
   * Count administrators matching criteria
   */
  count(criteria: AdministratorSearchCriteria): Promise<number>;
  
  /**
   * Save an administrator (create or update)
   */
  save(administrator: Administrator): Promise<Administrator>;
  
  /**
   * Create a new administrator
   */
  create(administrator: Administrator): Promise<Administrator>;
  
  /**
   * Update an existing administrator
   */
  update(administrator: Administrator): Promise<Administrator>;
  
  /**
   * Delete an administrator by ID
   */
  delete(id: string): Promise<boolean>;
  
  /**
   * Create an invitation for a new administrator
   */
  createInvitation(invitation: Omit<AdministratorInvitation, 'id'>): Promise<AdministratorInvitation>;
  
  /**
   * Find an invitation by token
   */
  findInvitationByToken(token: string): Promise<AdministratorInvitation | null>;
  
  /**
   * Find invitations by email
   */
  findInvitationsByEmail(email: string): Promise<AdministratorInvitation[]>;
  
  /**
   * Find invitations by who sent them
   */
  findInvitationsByInviter(invitedBy: string): Promise<AdministratorInvitation[]>;
  
  /**
   * Mark an invitation as accepted
   */
  markInvitationAsAccepted(invitationId: string): Promise<boolean>;
  
  /**
   * Delete an invitation
   */
  deleteInvitation(invitationId: string): Promise<boolean>;
  
  /**
   * Approve an administrator
   */
  approve(id: string, approvedBy: string): Promise<Administrator | null>;
  
  /**
   * Reject an administrator
   */
  reject(id: string, rejectedBy: string, reason: string): Promise<Administrator | null>;
  
  /**
   * Update administrator activity
   */
  updateActivity(id: string): Promise<Administrator | null>;
}