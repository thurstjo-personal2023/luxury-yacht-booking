/**
 * Create Admin Invitation Use Case
 * 
 * This use case handles the creation of invitations for new administrators.
 * It enforces authorization checks to ensure only Super Admins can create invitations.
 */

import { AdminInvitationService } from '../../../domain/admin/admin-invitation-service';
import { AdminInvitation } from '../../../domain/admin/admin-invitation';
import { AdminRole } from '../../../domain/admin/admin-role';
import { AdminUser } from '../../../domain/admin/admin-user';
import { IAdminInvitationRepository } from '../../interfaces/repositories/admin-invitation-repository';
import { IAdminRepository } from '../../interfaces/repositories/admin-repository';
import { AdminAuthorizationService } from '../../../domain/admin/admin-authorization-service';

export interface CreateInvitationRequest {
  email: string;
  name: string;
  role: AdminRole;
  invitedByAdminId: string;
}

export interface CreateInvitationResult {
  success: boolean;
  invitation?: AdminInvitation;
  invitationCode?: string;
  error?: string;
}

export class CreateAdminInvitationUseCase {
  constructor(
    private readonly invitationRepository: IAdminInvitationRepository,
    private readonly adminRepository: IAdminRepository,
    private readonly invitationService: AdminInvitationService,
    private readonly authorizationService: AdminAuthorizationService
  ) {}

  /**
   * Create a new administrator invitation
   * 
   * @param request Invitation request data
   * @returns Invitation result
   */
  async execute(request: CreateInvitationRequest): Promise<CreateInvitationResult> {
    try {
      // Verify that the inviting admin exists and has the right to create invitations
      const invitingAdmin = await this.adminRepository.findById(request.invitedByAdminId);
      if (!invitingAdmin) {
        return {
          success: false,
          error: 'Inviting administrator not found'
        };
      }

      // Verify authorization
      if (!this.authorizationService.canCreateInvitation(invitingAdmin, request.role)) {
        return {
          success: false,
          error: 'Not authorized to create this type of invitation'
        };
      }

      // Check if an invitation already exists for this email
      const existingInvitation = await this.invitationRepository.findByEmail(request.email);
      if (existingInvitation) {
        return {
          success: false,
          error: 'An invitation already exists for this email'
        };
      }

      // Create the invitation
      const invitation = this.invitationService.createInvitation({
        email: request.email,
        name: request.name,
        role: request.role,
        invitedBy: invitingAdmin.id
      });

      // Generate invitation code
      const invitationCode = this.invitationService.generateInvitationCode();

      // Save the invitation
      const savedInvitation = await this.invitationRepository.save({
        ...invitation,
        code: invitationCode
      });

      return {
        success: true,
        invitation: savedInvitation,
        invitationCode
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to create invitation: ${error.message}`
      };
    }
  }
}