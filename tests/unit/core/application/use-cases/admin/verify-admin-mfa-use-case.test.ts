/**
 * Unit tests for VerifyAdminMfaUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { VerifyAdminMfaUseCase } from '../../../../../../core/application/use-cases/admin/verify-admin-mfa-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAuthProvider, AuthToken } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService, AuthenticationResult } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser, AdminUserStatus } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { MfaStatus, MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';
import { Permission } from '../../../../../../core/domain/admin/permission';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';

describe('VerifyAdminMfaUseCase', () => {
  let adminRepository: jest.Mocked<IAdminRepository>;
  let credentialsRepository: jest.Mocked<IAdminCredentialsRepository>;
  let authProvider: jest.Mocked<IAuthProvider>;
  let authService: jest.Mocked<AdminAuthenticationService>;
  let useCase: VerifyAdminMfaUseCase;
  
  beforeEach(() => {
    // Create mocks
    adminRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as unknown as jest.Mocked<IAdminRepository>;
    
    credentialsRepository = {
      getCredentials: jest.fn(),
      getCredentialsByEmail: jest.fn(),
      createCredentials: jest.fn(),
      updateCredentials: jest.fn(),
      updatePassword: jest.fn(),
      setupMfa: jest.fn(),
      disableMfa: jest.fn(),
      storeTemporaryToken: jest.fn(),
      validateTemporaryToken: jest.fn(),
      clearTemporaryToken: jest.fn(),
      deleteCredentials: jest.fn()
    } as unknown as jest.Mocked<IAdminCredentialsRepository>;
    
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
      validatePassword: jest.fn(),
      hashPassword: jest.fn(),
      verifyPassword: jest.fn(),
      generateMfaSecret: jest.fn(),
      validateMfaToken: jest.fn(),
      generateSecureToken: jest.fn(),
      authenticate: jest.fn(),
      verifyMfa: jest.fn()
    } as unknown as jest.Mocked<AdminAuthenticationService>;
    
    // Create use case with mocked dependencies
    useCase = new VerifyAdminMfaUseCase(
      adminRepository,
      credentialsRepository,
      authProvider,
      authService
    );
  });
  
  it('should verify a valid MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const tempToken = 'temp-token-123';
    const mfaCode = '123456';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Create a proper AdminCredentials instance with MFA
    const credentials = new AdminCredentials(
      adminId,
      'admin@example.com',
      updatedDate,
      'hashed-password',
      'mfa-secret'
    );
    
    // Mock repository responses
    adminRepository.findById.mockResolvedValue(adminUser);
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock auth service to verify MFA token
    authService.verifyMfa.mockReturnValue({
      success: true,
      requiresMfa: false
    });
    
    // Mock auth provider token generation
    authProvider.generateToken.mockResolvedValue({
      token: 'auth-token-123',
      expiresIn: 3600
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode, tempToken);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.getCredentials).toHaveBeenCalledWith(adminId);
    expect(authService.verifyMfa).toHaveBeenCalledWith(credentials, mfaCode, tempToken);
    expect(authProvider.generateToken).toHaveBeenCalledWith(adminId);
    
    expect(result.success).toBe(true);
    expect(result.token).toBe('auth-token-123');
    expect(result.admin).toBe(adminUser);
  });
  
  it('should fail when admin is not found', async () => {
    // Arrange
    const adminId = 'nonexistent-admin';
    const mfaCode = '123456';
    const tempToken = 'temp-token-123';
    
    // Mock admin repository
    adminRepository.findById.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode, tempToken);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Administrator not found');
  });
  
  it('should fail when credentials are not found', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    const tempToken = 'temp-token-123';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Mock repository responses
    adminRepository.findById.mockResolvedValue(adminUser);
    credentialsRepository.getCredentials.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(adminId, mfaCode, tempToken);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.getCredentials).toHaveBeenCalledWith(adminId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('Administrator credentials not found');
  });
  
  it('should fail with invalid MFA code', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = 'invalid';
    const tempToken = 'temp-token-123';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Create a proper AdminCredentials instance with MFA
    const credentials = new AdminCredentials(
      adminId,
      'admin@example.com',
      updatedDate,
      'hashed-password',
      'mfa-secret'
    );
    
    // Mock repository responses
    adminRepository.findById.mockResolvedValue(adminUser);
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock auth service to indicate invalid MFA token
    authService.verifyMfa.mockReturnValue({
      success: false,
      requiresMfa: true,
      error: 'Invalid MFA token'
    });
    
    // Act
    const result = await useCase.execute(adminId, mfaCode, tempToken);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.getCredentials).toHaveBeenCalledWith(adminId);
    expect(authService.verifyMfa).toHaveBeenCalledWith(credentials, mfaCode, tempToken);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid MFA token');
  });
  
  it('should handle exceptions during verification', async () => {
    // Arrange
    const adminId = 'admin-123';
    const mfaCode = '123456';
    const tempToken = 'temp-token-123';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const adminUser = new AdminUser(
      adminId,
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Mock repository to throw an error
    adminRepository.findById.mockRejectedValue(new Error('Database error'));
    
    // Act
    const result = await useCase.execute(adminId, mfaCode, tempToken);
    
    // Assert
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(result.success).toBe(false);
    expect(result.error).toContain('Database error');
  });
});