/**
 * Admin Authentication Controller
 * 
 * This controller adapts the clean architecture use cases to Express routes.
 * It handles HTTP requests and responses for admin authentication functionality.
 */

import { Request, Response } from 'express';
import { AuthenticateAdminUseCase } from '../../core/application/use-cases/admin/authenticate-admin-use-case';
import { VerifyAdminMfaUseCase } from '../../core/application/use-cases/admin/verify-admin-mfa-use-case';
import { CreateAdminInvitationUseCase } from '../../core/application/use-cases/admin/create-admin-invitation-use-case';
import { VerifyAdminInvitationUseCase } from '../../core/application/use-cases/admin/verify-admin-invitation-use-case';
import { RegisterAdminUseCase } from '../../core/application/use-cases/admin/register-admin-use-case';
import { AdminRole } from '../../core/domain/admin/admin-role';

export class AdminAuthController {
  constructor(
    private authenticateAdminUseCase: AuthenticateAdminUseCase,
    private verifyAdminMfaUseCase: VerifyAdminMfaUseCase,
    private createAdminInvitationUseCase: CreateAdminInvitationUseCase,
    private verifyAdminInvitationUseCase: VerifyAdminInvitationUseCase,
    private registerAdminUseCase: RegisterAdminUseCase
  ) {}

  /**
   * Handle admin login request
   */
  public async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Email and password are required'
        });
        return;
      }

      const result = await this.authenticateAdminUseCase.execute(email, password);

      if (result.success) {
        // Success response
        res.status(200).json({
          success: true,
          admin: {
            id: result.admin.id,
            email: result.admin.email,
            name: result.admin.name,
            role: result.admin.role.value
          },
          token: result.token,
          requiresMfa: result.requiresMfa
        });
      } else {
        // Error response
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in admin login:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during login'
      });
    }
  }

  /**
   * Handle MFA verification request
   */
  public async verifyMfa(req: Request, res: Response): Promise<void> {
    try {
      const { adminId, mfaCode } = req.body;

      if (!adminId || !mfaCode) {
        res.status(400).json({
          success: false,
          error: 'Admin ID and MFA code are required'
        });
        return;
      }

      const result = await this.verifyAdminMfaUseCase.execute(adminId, mfaCode);

      if (result.success) {
        // Success response
        res.status(200).json({
          success: true,
          admin: {
            id: result.admin.id,
            email: result.admin.email,
            name: result.admin.name,
            role: result.admin.role.value
          },
          token: result.token
        });
      } else {
        // Error response
        res.status(401).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error in MFA verification:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during MFA verification'
      });
    }
  }

  /**
   * Handle create invitation request
   */
  public async createInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { email, name, role, invitedByAdminId } = req.body;

      if (!email || !name || !role || !invitedByAdminId) {
        res.status(400).json({
          success: false,
          error: 'Email, name, role, and inviter ID are required'
        });
        return;
      }

      // Convert role string to AdminRole enum
      let adminRole: AdminRole;
      switch (role.toLowerCase()) {
        case 'super_admin':
          adminRole = AdminRole.SUPER_ADMIN;
          break;
        case 'admin':
          adminRole = AdminRole.ADMIN;
          break;
        case 'moderator':
          adminRole = AdminRole.MODERATOR;
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid role. Must be one of: super_admin, admin, moderator'
          });
          return;
      }

      const result = await this.createAdminInvitationUseCase.execute({
        email,
        name,
        role: adminRole,
        invitedByAdminId
      });

      if (result.success) {
        // Success response
        res.status(201).json({
          success: true,
          invitation: {
            id: result.invitation.id,
            email: result.invitation.email,
            name: result.invitation.name,
            role: result.invitation.role.value,
            expiresAt: result.invitation.expiresAt,
            createdAt: result.invitation.createdAt,
            invitedById: result.invitation.invitedById
          },
          invitationCode: result.invitationCode
        });
      } else {
        // Error response
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error creating invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during invitation creation'
      });
    }
  }

  /**
   * Handle verify invitation request
   */
  public async verifyInvitation(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        res.status(400).json({
          valid: false,
          error: 'Email and invitation code are required'
        });
        return;
      }

      const result = await this.verifyAdminInvitationUseCase.execute(email, code);

      if (result.valid) {
        // Success response
        res.status(200).json({
          valid: true,
          invitation: {
            id: result.invitation.id,
            email: result.invitation.email,
            name: result.invitation.name,
            role: result.invitation.role.value,
            expiresAt: result.invitation.expiresAt,
            createdAt: result.invitation.createdAt,
            invitedById: result.invitation.invitedById
          }
        });
      } else {
        // Error response
        res.status(400).json({
          valid: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error verifying invitation:', error);
      res.status(500).json({
        valid: false,
        error: 'Internal server error during invitation verification'
      });
    }
  }

  /**
   * Handle register admin request
   */
  public async registerAdmin(req: Request, res: Response): Promise<void> {
    try {
      const { email, password, name, phoneNumber, invitationCode } = req.body;

      if (!email || !password || !name || !phoneNumber || !invitationCode) {
        res.status(400).json({
          success: false,
          error: 'Email, password, name, phone number, and invitation code are required'
        });
        return;
      }

      const result = await this.registerAdminUseCase.execute({
        email,
        password,
        name,
        phoneNumber,
        invitationCode
      });

      if (result.success) {
        // Success response
        res.status(201).json({
          success: true,
          admin: {
            id: result.admin.id,
            email: result.admin.email,
            name: result.admin.name,
            role: result.admin.role.value,
            phoneNumber: result.admin.phoneNumber
          },
          requiresApproval: result.requiresApproval
        });
      } else {
        // Error response
        res.status(400).json({
          success: false,
          error: result.error
        });
      }
    } catch (error) {
      console.error('Error registering admin:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error during registration'
      });
    }
  }
}