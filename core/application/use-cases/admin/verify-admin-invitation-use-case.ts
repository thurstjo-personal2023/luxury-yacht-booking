/**
 * Verify Admin Invitation Use Case
 * 
 * This use case handles the verification of invitation codes for new administrators.
 * It checks if the invitation code is valid and not expired.
 */

import { AdminInvitationService } from '../../../domain/admin/admin-invitation-service';
import { AdminInvitation } from '../../../domain/admin/admin-invitation';
import { IAdminInvitationRepository } from '../../interfaces/repositories/admin-invitation-repository';

export interface VerifyInvitationResult {
  valid: boolean;
  invitation?: AdminInvitation;
  error?: string;
}

export class VerifyAdminInvitationUseCase {
  constructor(
    private readonly invitationRepository: IAdminInvitationRepository,
    private readonly invitationService: AdminInvitationService
  ) {}

  /**
   * Verify an administrator invitation code
   * 
   * @param email Email associated with the invitation
   * @param code Invitation code
   * @returns Verification result
   */
  async execute(email: string, code: string): Promise<VerifyInvitationResult> {
    try {
      // Find the invitation by email
      const invitation = await this.invitationRepository.findByEmail(email);
      if (!invitation) {
        return {
          valid: false,
          error: 'No invitation found for this email'
        };
      }

      // Verify the code
      if (invitation.code !== code) {
        return {
          valid: false,
          error: 'Invalid invitation code'
        };
      }

      // Check if the invitation is expired
      if (this.invitationService.isInvitationExpired(invitation)) {
        return {
          valid: false,
          error: 'Invitation has expired'
        };
      }

      // Check if the invitation has been used
      if (invitation.used) {
        return {
          valid: false,
          error: 'Invitation has already been used'
        };
      }

      return {
        valid: true,
        invitation
      };
    } catch (error) {
      return {
        valid: false,
        error: `Failed to verify invitation: ${error.message}`
      };
    }
  }
}