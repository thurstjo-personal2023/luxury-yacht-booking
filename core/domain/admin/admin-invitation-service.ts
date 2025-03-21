/**
 * Admin Invitation Service
 * 
 * Domain service for admin invitation operations.
 * This service contains pure business logic without external dependencies.
 */

import { AdminInvitation, AdminInvitationStatus } from './admin-invitation';
import { AdminRole } from './admin-role';

/**
 * Result of an invitation validation
 */
export interface InvitationValidationResult {
  valid: boolean;
  invitation?: AdminInvitation;
  error?: string;
}

/**
 * Admin invitation service
 */
export class AdminInvitationService {
  /**
   * Validate an invitation code
   * @param invitation The invitation to validate
   * @param code The invitation code to check
   * @returns Validation result
   */
  validateInvitation(
    invitation: AdminInvitation | null,
    code: string
  ): InvitationValidationResult {
    if (!invitation) {
      return {
        valid: false,
        error: 'Invitation not found'
      };
    }

    // Check if invitation is still valid
    if (invitation.status !== AdminInvitationStatus.PENDING) {
      return {
        valid: false,
        error: `Invitation is ${invitation.status}`
      };
    }

    // Check if invitation is expired
    if (invitation.isExpired()) {
      return {
        valid: false,
        error: 'Invitation has expired'
      };
    }

    // Verify the invitation code
    if (!invitation.verifyInvitationCode(code)) {
      return {
        valid: false,
        error: 'Invalid invitation code'
      };
    }

    return {
      valid: true,
      invitation
    };
  }

  /**
   * Generate a new invitation code
   * @returns A newly generated invitation code
   */
  generateInvitationCode(): string {
    return AdminInvitation.generateInvitationCode();
  }

  /**
   * Create invitation data for a new invitation
   * @param email The email to send the invitation to
   * @param role The role for the new admin
   * @param invitedBy ID of the admin creating the invitation
   * @param validityDays Number of days the invitation is valid
   * @returns Data for creating a new invitation
   */
  createInvitationData(
    email: string,
    role: string,
    invitedBy: string,
    validityDays: number = 7
  ): {
    email: string;
    role: AdminRole;
    invitedBy: string;
    expirationDate: Date;
    status: AdminInvitationStatus;
    invitationCode: string;
  } {
    const adminRole = AdminRole.fromString(role);
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + validityDays);
    
    return {
      email,
      role: adminRole,
      invitedBy,
      expirationDate,
      status: AdminInvitationStatus.PENDING,
      invitationCode: this.generateInvitationCode()
    };
  }

  /**
   * Check if a role is allowed to invite admins with a specific role
   * @param inviterRole Role of the inviter
   * @param inviteeRole Role to be assigned to the invitee
   * @returns True if the invitation is allowed
   */
  canInviteWithRole(inviterRole: AdminRole, inviteeRole: AdminRole): boolean {
    // Super admins can invite any role
    if (inviterRole.isSuperAdmin()) {
      return true;
    }
    
    // Regular admins can only invite moderators
    if (inviterRole.isAdmin() && !inviteeRole.isAdmin()) {
      return true;
    }
    
    // Moderators cannot invite anyone
    return false;
  }

  /**
   * Validate invitation data
   * @param email Email to validate
   * @param role Role to validate
   * @returns Validation result with any errors
   */
  validateInvitationData(
    email: string,
    role: string
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      errors.push('Invalid email address');
    }
    
    // Validate role
    try {
      AdminRole.fromString(role);
    } catch (error) {
      errors.push(`Invalid role: ${role}`);
    }
    
    return {
      valid: errors.length === 0,
      errors
    };
  }
}