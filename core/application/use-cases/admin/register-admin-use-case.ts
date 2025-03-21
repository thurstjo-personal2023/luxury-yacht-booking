/**
 * Register Admin Use Case
 * 
 * This use case handles the registration of new administrators
 * using a valid invitation.
 */

import { AdminUser } from '../../../domain/admin/admin-user';
import { AdminCredentials } from '../../../domain/admin/admin-credentials';
import { AdminInvitation } from '../../../domain/admin/admin-invitation';
import { MfaStatus } from '../../../domain/admin/mfa-status';
import { IAdminRepository } from '../../interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../interfaces/repositories/admin-credentials-repository';
import { IAdminInvitationRepository } from '../../interfaces/repositories/admin-invitation-repository';
import { IAuthProvider, UserCredentials } from '../../interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../domain/admin/admin-authentication-service';

export interface RegisterAdminRequest {
  email: string;
  password: string;
  name: string;
  phoneNumber: string;
  invitationCode: string;
}

export interface RegisterAdminResult {
  success: boolean;
  admin?: AdminUser;
  error?: string;
  requiresApproval: boolean;
}

export class RegisterAdminUseCase {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly credentialsRepository: IAdminCredentialsRepository,
    private readonly invitationRepository: IAdminInvitationRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authService: AdminAuthenticationService
  ) {}

  /**
   * Register a new administrator using an invitation
   * 
   * @param request Registration data
   * @returns Registration result
   */
  async execute(request: RegisterAdminRequest): Promise<RegisterAdminResult> {
    try {
      // Verify the invitation
      const invitation = await this.invitationRepository.findByEmail(request.email);
      if (!invitation) {
        return {
          success: false,
          requiresApproval: false,
          error: 'No invitation found for this email'
        };
      }

      // Verify the invitation code
      if (invitation.code !== request.invitationCode) {
        return {
          success: false,
          requiresApproval: false,
          error: 'Invalid invitation code'
        };
      }

      // Check if the invitation has been used
      if (invitation.used) {
        return {
          success: false,
          requiresApproval: false,
          error: 'Invitation has already been used'
        };
      }

      // Validate the password
      if (!this.authService.isPasswordValid(request.password)) {
        return {
          success: false,
          requiresApproval: false,
          error: 'Password does not meet security requirements'
        };
      }

      // Create the user in the authentication system
      const credentials: UserCredentials = {
        email: request.email,
        password: request.password
      };
      
      const userInfo = await this.authProvider.createUser(credentials);
      
      // Set custom claims for the admin role
      await this.authProvider.setCustomClaims(userInfo.uid, {
        role: 'admin',
        adminRole: invitation.role
      });

      // Create the admin user
      const admin: AdminUser = {
        id: userInfo.uid,
        authId: userInfo.uid,
        email: request.email,
        name: request.name,
        phoneNumber: request.phoneNumber,
        role: invitation.role,
        status: 'pending', // Requires approval
        mfaStatus: MfaStatus.REQUIRED, // MFA will be required
        createdAt: new Date(),
        lastLoginAt: null,
        createdBy: invitation.invitedBy
      };
      
      // Save the admin user
      const savedAdmin = await this.adminRepository.save(admin);

      // Create and save admin credentials
      const adminCredentials: AdminCredentials = {
        id: this.credentialsRepository.generateId(),
        adminId: savedAdmin.id,
        passwordLastChanged: new Date(),
        mfaEnabled: false,
        mfaMethod: null,
        mfaSecret: null
      };
      
      await this.credentialsRepository.save(adminCredentials);

      // Mark the invitation as used
      invitation.used = true;
      invitation.usedAt = new Date();
      await this.invitationRepository.update(invitation);

      return {
        success: true,
        admin: savedAdmin,
        requiresApproval: true
      };
    } catch (error) {
      return {
        success: false,
        requiresApproval: false,
        error: `Registration failed: ${error.message}`
      };
    }
  }
}