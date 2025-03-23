/**
 * Admin Authentication Use Cases
 * 
 * This module implements the authentication use cases for administrators,
 * following the clean architecture pattern.
 */

import { IAdminAuthenticationService } from './auth-service.interface';
import { Administrator } from '../../domain/auth/user';
import { INavigationService } from '../navigation/navigation-service.interface';
import { AdminAuthenticationError, MfaRequiredError } from '../../domain/auth/auth-exceptions';

/**
 * Authentication use cases for administrators
 */
export class AdminAuthenticationUseCase {
  constructor(
    private adminAuthService: IAdminAuthenticationService,
    private navigationService: INavigationService
  ) {}

  /**
   * Login as an administrator
   */
  async adminLogin(email: string, password: string): Promise<Administrator> {
    try {
      const admin = await this.adminAuthService.adminSignIn(email, password);
      
      // Check if MFA verification is required
      if (admin.mfaEnabled && !admin.mfaVerified) {
        this.navigationService.navigateTo('/admin/verify-mfa');
        throw new MfaRequiredError();
      }
      
      return admin;
    } catch (error) {
      if (error instanceof AdminAuthenticationError || error instanceof MfaRequiredError) {
        throw error;
      }
      throw new AdminAuthenticationError('Admin login failed', 'admin/unknown-error');
    }
  }

  /**
   * Logout the current administrator
   */
  async adminLogout(): Promise<void> {
    await this.adminAuthService.adminSignOut();
    this.navigationService.navigateTo('/admin/login');
  }

  /**
   * Verify an MFA code
   */
  async verifyMfa(code: string): Promise<boolean> {
    try {
      const result = await this.adminAuthService.verifyMfa(code);
      if (result) {
        this.navigationService.navigateTo('/admin/dashboard');
      }
      return result;
    } catch (error) {
      throw new AdminAuthenticationError('MFA verification failed', 'admin/mfa-verification-failed');
    }
  }

  /**
   * Set up MFA for the current administrator
   */
  async setupMfa(): Promise<{ qrCodeUrl: string, secret: string }> {
    try {
      return await this.adminAuthService.setupMfa();
    } catch (error) {
      throw new AdminAuthenticationError('MFA setup failed', 'admin/mfa-setup-failed');
    }
  }

  /**
   * Get the currently authenticated administrator
   */
  getCurrentAdmin(): Administrator | null {
    return this.adminAuthService.getCurrentAdmin();
  }

  /**
   * Check if an administrator is authenticated
   */
  isAdminAuthenticated(): boolean {
    return this.adminAuthService.isAdminAuthenticated();
  }
  
  /**
   * Redirect to the admin dashboard
   */
  redirectToAdminDashboard(): void {
    this.navigationService.navigateTo('/admin/dashboard');
  }

  /**
   * Redirect to the MFA setup page
   */
  redirectToMfaSetup(): void {
    this.navigationService.navigateTo('/admin/setup-mfa');
  }

  /**
   * Redirect to the admin login page
   */
  redirectToAdminLogin(): void {
    this.navigationService.navigateTo('/admin/login');
  }
}