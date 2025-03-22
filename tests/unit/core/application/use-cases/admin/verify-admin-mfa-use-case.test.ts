/**
 * Unit tests for VerifyAdminMfaUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { VerifyAdminMfaUseCase } from '../../../../../../core/application/use-cases/admin/verify-admin-mfa-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAuthProvider, AuthToken } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { MfaStatus, MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';

describe('VerifyAdminMfaUseCase', () => {
  let adminRepository: jest.Mocked<IAdminRepository>;
  let authProvider: jest.Mocked<IAuthProvider>;
  let authService: jest.Mocked<AdminAuthenticationService>;
  let useCase: VerifyAdminMfaUseCase;
  
  beforeEach(() => {
    // Create mocks
    adminRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByAuthId: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findByStatus: jest.fn(),
      findByRole: jest.fn(),
      count: jest.fn()
    } as unknown as jest.Mocked<IAdminRepository>;
    
    authProvider = {
      createUser: jest.fn(),
      getUser: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      setCustomClaims: jest.fn(),
      verifyIdToken: jest.fn(),
      generateToken: jest.fn(),
      revokeRefreshTokens: jest.fn(),
      generatePasswordResetLink: jest.fn(),
      generateEmailVerificationLink: jest.fn(),
      generateSignInWithEmailLink: jest.fn()
    } as unknown as jest.Mocked<IAuthProvider>;
    
    // Create the authentication service with spies for its methods
    authService = {
      verifyMfaCode: jest.fn(),
      sendMfaCode: jest.fn()
    } as unknown as jest.Mocked<AdminAuthenticationService>;
    
    // Create use case with mocked dependencies
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
    
    // Mock admin repository
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock auth service and provider
    authService.verifyMfaCode.mockResolvedValue(true);
    authProvider.generateToken.mockResolvedValue({
      token: 'auth-token-123',
      expiresIn: 3600
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(authService.verifyMfaCode).toHaveBeenCalledWith(adminId, mfaCode);
    expect(authProvider.generateToken).toHaveBeenCalledWith(adminId);
    
    expect(result.success).toBe(true);
    expect(result.token).toBe('auth-token-123');
    expect(result.admin).toBe(adminUser);
  });
  
  it('should fail when admin is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    const mfaCode = '123456';
    
    // Mock admin repository
    adminRepository.findById.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Administrator not found');
  });
  
  it('should fail with invalid MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = 'invalid';
    
    // Mock admin repository
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock auth service
    authService.verifyMfaCode.mockResolvedValue(false);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(authService.verifyMfaCode).toHaveBeenCalledWith(adminId, mfaCode);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid MFA code');
  });
  
  it('should handle exceptions during verification', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    
    // Mock admin repository
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock auth service to throw an error
    const errorMessage = 'Network error';
    authService.verifyMfaCode.mockRejectedValue(new Error(errorMessage));
    
    // Act
    const result = await useCase.execute(adminId, mfaCode);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(authService.verifyMfaCode).toHaveBeenCalledWith(adminId, mfaCode);
    
    expect(result.success).toBe(false);
    expect(result.error).toContain(errorMessage);
  });
  
  it('should resend MFA code successfully', async () => {
    // Arrange
    const adminId = 'admin-123';
    
    // Mock admin repository
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock auth service
    authService.sendMfaCode.mockResolvedValue(true);
    
    // Act
    const result = await useCase.resendMfaCode(adminId);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(authService.sendMfaCode).toHaveBeenCalledWith(adminId);
    expect(result).toBe(true);
  });
  
  it('should fail to resend MFA code when admin is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    
    // Mock admin repository
    adminRepository.findById.mockResolvedValue(null);
    
    // Act
    const result = await useCase.resendMfaCode(adminId);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(result).toBe(false);
  });
  
  it('should handle exceptions when resending MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    
    // Mock admin repository
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock auth service to throw an error
    authService.sendMfaCode.mockRejectedValue(new Error('Service unavailable'));
    
    // Act
    const result = await useCase.resendMfaCode(adminId);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(authService.sendMfaCode).toHaveBeenCalledWith(adminId);
    expect(result).toBe(false);
  });
});