/**
 * Authenticate Admin Use Case
 * 
 * This use case handles the authentication of administrators,
 * checking credentials and MFA status.
 */

import { AdminAuthenticationService } from '../../../domain/admin/admin-authentication-service';
import { AdminUser } from '../../../domain/admin/admin-user';
import { MfaStatus } from '../../../domain/admin/mfa-status';
import { IAdminRepository } from '../../interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../interfaces/repositories/admin-credentials-repository';
import { IAuthProvider } from '../../interfaces/auth/auth-provider';

export interface AdminAuthenticationResult {
  success: boolean;
  admin?: AdminUser;
  token?: string;
  requiresMfa: boolean;
  error?: string;
}

export class AuthenticateAdminUseCase {
  constructor(
    private readonly adminRepository: IAdminRepository,
    private readonly credentialsRepository: IAdminCredentialsRepository,
    private readonly authProvider: IAuthProvider,
    private readonly authService: AdminAuthenticationService
  ) {}

  /**
   * Authenticate an administrator by email and password
   * 
   * @param email Administrator email
   * @param password Administrator password
   * @returns Authentication result
   */
  async execute(email: string, password: string): Promise<AdminAuthenticationResult> {
    try {
      // First, validate credentials using the auth provider
      let userInfo;
      try {
        userInfo = await this.authProvider.getUserByEmail(email);
      } catch (error) {
        return {
          success: false,
          requiresMfa: false,
          error: 'Invalid email or password'
        };
      }

      // Verify that this user is an administrator
      const admin = await this.adminRepository.findByAuthId(userInfo.uid);
      if (!admin) {
        return {
          success: false,
          requiresMfa: false,
          error: 'User is not an administrator'
        };
      }

      // Verify credentials
      const credentials = await this.credentialsRepository.findByAdminId(admin.id);
      if (!credentials) {
        return {
          success: false,
          requiresMfa: false,
          error: 'Administrator credentials not found'
        };
      }
      
      // Use the authentication service to verify the password
      const isValid = await this.authService.verifyCredentials(userInfo.uid, password);
      if (!isValid) {
        return {
          success: false,
          requiresMfa: false,
          error: 'Invalid email or password'
        };
      }

      // Generate token
      const authToken = await this.authProvider.generateToken(userInfo.uid);

      // Check MFA status
      const requiresMfa = admin.mfaStatus !== MfaStatus.DISABLED;

      return {
        success: true,
        admin,
        token: authToken.token,
        requiresMfa
      };
    } catch (error) {
      return {
        success: false,
        requiresMfa: false,
        error: `Authentication error: ${error.message}`
      };
    }
  }
}