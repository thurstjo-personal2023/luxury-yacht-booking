/**
 * Mock Admin Invitation Repository
 * 
 * This class provides a mock implementation of the IAdminInvitationRepository interface
 * for testing admin invitation use cases without requiring a real database.
 */

import { BaseMockRepository } from '../base-mock-repository';
import { IAdminInvitationRepository } from '../../../../core/application/ports/repositories/admin-invitation-repository';
import { AdminInvitation } from '../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../core/domain/admin/admin-role';
import { InvitationStatus } from '../../../../core/domain/admin/invitation-status';

export class MockAdminInvitationRepository extends BaseMockRepository implements IAdminInvitationRepository {
  // In-memory storage for admin invitations
  private invitations: Map<string, AdminInvitation> = new Map();
  private emailToIdMap: Map<string, string> = new Map();
  
  /**
   * Get an invitation by ID
   * @param id Invitation ID
   */
  async getById(id: string): Promise<AdminInvitation | null> {
    return this.executeMethod<AdminInvitation | null>('getById', [id], () => {
      return this.invitations.has(id) ? this.invitations.get(id) || null : null;
    });
  }
  
  /**
   * Get an invitation by email
   * @param email Email address
   */
  async getByEmail(email: string): Promise<AdminInvitation | null> {
    return this.executeMethod<AdminInvitation | null>('getByEmail', [email], () => {
      const invitationId = this.emailToIdMap.get(email);
      if (!invitationId) return null;
      
      return this.invitations.get(invitationId) || null;
    });
  }
  
  /**
   * Create a new invitation
   * @param invitation Invitation to create
   */
  async create(invitation: AdminInvitation): Promise<string> {
    return this.executeMethod<string>('create', [invitation], () => {
      const id = invitation.id || `mock-invitation-${Date.now()}`;
      const newInvitation = { ...invitation, id };
      
      this.invitations.set(id, newInvitation);
      this.emailToIdMap.set(newInvitation.email, id);
      
      return id;
    });
  }
  
  /**
   * Update an existing invitation
   * @param id Invitation ID
   * @param invitation Updated invitation data
   */
  async update(id: string, invitation: Partial<AdminInvitation>): Promise<boolean> {
    return this.executeMethod<boolean>('update', [id, invitation], () => {
      if (!this.invitations.has(id)) {
        return false;
      }
      
      const existingInvitation = this.invitations.get(id);
      if (!existingInvitation) return false;
      
      // If email is being updated, update the map
      if (invitation.email && invitation.email !== existingInvitation.email) {
        this.emailToIdMap.delete(existingInvitation.email);
        this.emailToIdMap.set(invitation.email, id);
      }
      
      this.invitations.set(id, { ...existingInvitation, ...invitation });
      return true;
    });
  }
  
  /**
   * Delete an invitation
   * @param id Invitation ID
   */
  async delete(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('delete', [id], () => {
      const invitation = this.invitations.get(id);
      if (invitation) {
        this.emailToIdMap.delete(invitation.email);
      }
      
      return this.invitations.delete(id);
    });
  }
  
  /**
   * List invitations by status
   * @param status Invitation status
   */
  async listByStatus(status: InvitationStatus): Promise<AdminInvitation[]> {
    return this.executeMethod<AdminInvitation[]>('listByStatus', [status], () => {
      return Array.from(this.invitations.values())
        .filter(invitation => invitation.status === status);
    });
  }
  
  /**
   * List invitations for a specific role
   * @param role Admin role
   */
  async listByRole(role: AdminRole): Promise<AdminInvitation[]> {
    return this.executeMethod<AdminInvitation[]>('listByRole', [role], () => {
      return Array.from(this.invitations.values())
        .filter(invitation => invitation.role === role);
    });
  }
  
  /**
   * Check if an invitation exists for an email
   * @param email Email address
   */
  async existsForEmail(email: string): Promise<boolean> {
    return this.executeMethod<boolean>('existsForEmail', [email], () => {
      return this.emailToIdMap.has(email);
    });
  }
  
  /**
   * Mark an invitation as accepted
   * @param id Invitation ID
   * @param adminId ID of the admin account created
   */
  async markAsAccepted(id: string, adminId: string): Promise<boolean> {
    return this.executeMethod<boolean>('markAsAccepted', [id, adminId], () => {
      if (!this.invitations.has(id)) {
        return false;
      }
      
      const invitation = this.invitations.get(id);
      if (!invitation) return false;
      
      this.invitations.set(id, { 
        ...invitation, 
        status: InvitationStatus.ACCEPTED,
        adminId,
        acceptedAt: new Date()
      });
      
      return true;
    });
  }
  
  /**
   * Mark an invitation as expired
   * @param id Invitation ID
   */
  async markAsExpired(id: string): Promise<boolean> {
    return this.executeMethod<boolean>('markAsExpired', [id], () => {
      if (!this.invitations.has(id)) {
        return false;
      }
      
      const invitation = this.invitations.get(id);
      if (!invitation) return false;
      
      this.invitations.set(id, { 
        ...invitation, 
        status: InvitationStatus.EXPIRED
      });
      
      return true;
    });
  }
  
  /**
   * Get expired invitations
   * @param expirationDays Number of days after which an invitation is considered expired
   */
  async getExpiredInvitations(expirationDays: number = 7): Promise<AdminInvitation[]> {
    return this.executeMethod<AdminInvitation[]>(
      'getExpiredInvitations', 
      [expirationDays], 
      () => {
        const now = new Date();
        const cutoffDate = new Date(now);
        cutoffDate.setDate(cutoffDate.getDate() - expirationDays);
        
        return Array.from(this.invitations.values())
          .filter(invitation => 
            invitation.status === InvitationStatus.PENDING &&
            invitation.createdAt < cutoffDate
          );
      }
    );
  }
  
  /**
   * Count invitations by status
   * @param status Invitation status
   */
  async countByStatus(status: InvitationStatus): Promise<number> {
    return this.executeMethod<number>('countByStatus', [status], () => {
      return Array.from(this.invitations.values())
        .filter(invitation => invitation.status === status)
        .length;
    });
  }
  
  /**
   * Set mock invitations for testing
   * @param invitations Array of invitations to use as mock data
   */
  setMockInvitations(invitations: AdminInvitation[]): void {
    this.invitations.clear();
    this.emailToIdMap.clear();
    
    for (const invitation of invitations) {
      this.invitations.set(invitation.id, invitation);
      this.emailToIdMap.set(invitation.email, invitation.id);
    }
  }
  
  /**
   * Clear all mock invitations
   */
  clearMockInvitations(): void {
    this.invitations.clear();
    this.emailToIdMap.clear();
  }
}