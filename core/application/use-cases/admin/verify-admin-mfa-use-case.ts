/**
 * Verify Admin MFA Use Case
 * 
 * This use case handles the verification of Multi-Factor Authentication
 * for administrators during the login process.
 */

import { AdminAuthenticationService } from '../../../domain/admin/admin-authentication-service';
import { AdminUser } from '../../../domain/admin/admin-user';
import { IAdminRepository } from '../../interfaces/repositories/admin-repository';
import { IAuthProvider } from '../../interfaces/auth/auth-provider';

export interface MfaVerificationResult {
  success: boolean;
  admin?: AdminUser;
  token?: string;
  error?: string;
}

export class VerifyAdminMfaUseCase {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authService: AdminAuthenticationService
  ) {}

  /**
   * Verify an administrator's MFA code
   * 
   * @param adminId Administrator ID
   * @param mfaCode MFA verification code
   * @returns MFA verification result
   */
  async execute(adminId: string, mfaCode: string): Promise<MfaVerificationResult> {
    try {
      // Get the administrator
      const admin = await this.adminRepository.findById(adminId);
      if (!admin) {
        return {
          success: false,
          error: 'Administrator not found'
        };
      }

      // Verify the MFA code
      const isValid = await this.authService.verifyMfaCode(admin.authId, mfaCode);
      if (!isValid) {
        return {
          success: false,
          error: 'Invalid MFA code'
        };
      }

      // Generate a new token
      const authToken = await this.authProvider.generateToken(admin.authId);

      return {
        success: true,
        admin,
        token: authToken.token
      };
    } catch (error) {
      return {
        success: false,
        error: `MFA verification error: ${error.message}`
      };
    }
  }

  /**
   * Resend MFA code to the administrator
   * 
   * @param adminId Administrator ID
   * @returns Success status
   */
  async resendMfaCode(adminId: string): Promise<boolean> {
    try {
      // Get the administrator
      const admin = await this.adminRepository.findById(adminId);
      if (!admin) {
        return false;
      }

      // Request a new MFA code
      return await this.authService.sendMfaCode(admin.authId);
    } catch (error) {
      return false;
    }
  }
}