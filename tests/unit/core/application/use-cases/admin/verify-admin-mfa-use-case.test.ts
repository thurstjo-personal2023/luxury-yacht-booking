/**
 * Unit tests for VerifyAdminMfaUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { VerifyAdminMfaUseCase } from '../../../../../../core/application/use-cases/admin/verify-admin-mfa-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAuthProvider } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../../core/domain/admin/admin-role';
import { MfaStatus } from '../../../../../../core/domain/admin/mfa-status';

describe('VerifyAdminMfaUseCase', () => {
  let adminRepository: IAdminRepository;
  let authProvider: IAuthProvider;
  let authService: AdminAuthenticationService;
  let useCase: VerifyAdminMfaUseCase;
  
  beforeEach(() => {
    // Create mocks
    adminRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findPendingApprovals: jest.fn()
    };
    
    authProvider = {
      authenticateWithEmailPassword: jest.fn(),
      createUserWithEmailPassword: jest.fn(),
      verifyMfaCode: jest.fn(),
      generateMfaSecret: jest.fn(),
      validatePassword: jest.fn(),
      getUserById: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      generatePasswordHash: jest.fn()
    };
    
    authService = new AdminAuthenticationService(authProvider);
    
    // Create use case
    useCase = new VerifyAdminMfaUseCase(
      adminRepository,
      authProvider,
      authService
    );
  });
  
  it('should verify a valid MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    const mfaSecret = 'mfa-secret';
    
    // Mock admin repository
    const adminUser = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock auth provider
    (authProvider.verifyMfaCode as jest.Mock).mockResolvedValue(true);
    (authProvider.getUserById as jest.Mock).mockResolvedValue({
      mfaSecret
    });
    
    const mockToken = 'auth-token-123';
    (authProvider.updateUser as jest.Mock).mockResolvedValue({
      token: mockToken
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(adminUser);
    expect(result.token).toBe(mockToken);
    expect(authProvider.verifyMfaCode).toHaveBeenCalledWith(adminId, mfaCode, mfaSecret);
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
  });
  
  it('should fail for invalid MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = 'invalid-code';
    const mfaSecret = 'mfa-secret';
    
    // Mock admin repository
    const adminUser = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock auth provider - verification fails
    (authProvider.verifyMfaCode as jest.Mock).mockResolvedValue(false);
    (authProvider.getUserById as jest.Mock).mockResolvedValue({
      mfaSecret
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid MFA code');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail for admin without MFA enabled', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    
    // Mock admin repository with admin that doesn't have MFA enabled
    const adminUser = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.DISABLED,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('MFA is not enabled for this account');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail for non-existent admin', async () => {
    // Arrange
    const adminId = 'non-existent-admin';
    const mfaCode = '123456';
    
    // Mock admin repository to return null (admin not found)
    (adminRepository.findById as jest.Mock).mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin not found');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail for unapproved admin', async () => {
    // Arrange
    const adminId = 'unapproved-admin';
    const mfaCode = '123456';
    
    // Mock admin repository with unapproved admin
    const adminUser = new AdminUser({
      id: adminId,
      email: 'unapproved@example.com',
      name: 'Unapproved Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED,
      isApproved: false
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin account is pending approval');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should handle missing MFA secret', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    
    // Mock admin repository
    const adminUser = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock auth provider to return null (no MFA secret)
    (authProvider.getUserById as jest.Mock).mockResolvedValue({
      mfaSecret: null
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('MFA is not properly configured for this account');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should handle auth provider errors', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    
    // Mock admin repository
    const adminUser = new AdminUser({
      id: adminId,
      email: 'admin@example.com',
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      mfaStatus: MfaStatus.ENABLED,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock auth provider to throw an error
    (authProvider.getUserById as jest.Mock).mockRejectedValue(
      new Error('Auth provider error')
    );
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Auth provider error');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
});