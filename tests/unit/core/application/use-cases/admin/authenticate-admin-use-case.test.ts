/**
 * Unit tests for AuthenticateAdminUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AuthenticateAdminUseCase } from '../../../../../../core/application/use-cases/admin/authenticate-admin-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAuthProvider } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser } from '../../../../../../core/domain/admin/admin-user';
import { AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';

describe('AuthenticateAdminUseCase', () => {
  let adminRepository: jest.Mocked<IAdminRepository>;
  let credentialsRepository: jest.Mocked<IAdminCredentialsRepository>;
  let authProvider: jest.Mocked<IAuthProvider>;
  let authService: jest.Mocked<AdminAuthenticationService>;
  let useCase: AuthenticateAdminUseCase;
  
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
    
    credentialsRepository = {
      findByAdminId: jest.fn(),
      findByEmail: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
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
    
    // Create mock authentication service
    authService = {
      verifyCredentials: jest.fn()
    } as unknown as jest.Mocked<AdminAuthenticationService>;
    
    // Create use case
    useCase = new AuthenticateAdminUseCase(
      adminRepository,
      credentialsRepository,
      authProvider,
      authService
    );
  });
  
  it('should authenticate a valid admin without MFA', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'correct-password';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock generateToken
    authProvider.generateToken.mockResolvedValue({
      token,
      expiresIn: 3600
    });
    
    // Mock admin repository response
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.DISABLED,
      'active',
      new Date()
    );
    admin.lastLoginAt = new Date();
    
    adminRepository.findByAuthId.mockResolvedValue(admin);
    
    // Mock credentials
    credentialsRepository.findByAdminId.mockResolvedValue({
      id: 'cred-123',
      adminId
    });
    
    // Mock authentication verification
    authService.verifyCredentials.mockResolvedValue(true);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(admin);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(false);
    expect(authProvider.getUserByEmail).toHaveBeenCalledWith(email);
    expect(adminRepository.findByAuthId).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.findByAdminId).toHaveBeenCalledWith(adminId);
    expect(authService.verifyCredentials).toHaveBeenCalledWith(adminId, password);
  });
  
  it('should indicate MFA is required for admins with MFA enabled', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'correct-password';
    const adminId = 'admin-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock generateToken
    authProvider.generateToken.mockResolvedValue({
      token: 'auth-token-123',
      expiresIn: 3600
    });
    
    // Mock admin repository response with MFA enabled
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.ENABLED,
      'active',
      new Date()
    );
    admin.lastLoginAt = new Date();
    
    adminRepository.findByAuthId.mockResolvedValue(admin);
    
    // Mock credentials
    credentialsRepository.findByAdminId.mockResolvedValue({
      id: 'cred-123',
      adminId
    });
    
    // Mock authentication verification
    authService.verifyCredentials.mockResolvedValue(true);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(admin);
    expect(result.token).toBe('auth-token-123');
    expect(result.requiresMfa).toBe(true);
  });
  
  it('should fail for non-existent admin user', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    const password = 'password123';
    
    // Mock getUserByEmail to throw an error
    authProvider.getUserByEmail.mockRejectedValue(new Error('User not found'));
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail if user is not an administrator', async () => {
    // Arrange
    const email = 'user@example.com';
    const password = 'password123';
    const userId = 'user-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: userId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository to return null (not an admin)
    adminRepository.findByAuthId.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('User is not an administrator');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail if credentials are invalid', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'wrong-password';
    const adminId = 'admin-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.DISABLED,
      'active',
      new Date()
    );
    
    adminRepository.findByAuthId.mockResolvedValue(admin);
    
    // Mock credentials
    credentialsRepository.findByAdminId.mockResolvedValue({
      id: 'cred-123',
      adminId
    });
    
    // Mock authentication verification to fail
    authService.verifyCredentials.mockResolvedValue(false);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid email or password');
    expect(result.requiresMfa).toBe(false);
  });
  
  it('should handle missing credentials', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      AdminRoleType.ADMIN,
      MfaStatusType.DISABLED,
      'active',
      new Date()
    );
    
    adminRepository.findByAuthId.mockResolvedValue(admin);
    
    // Mock credentials repository to return null (credentials not found)
    credentialsRepository.findByAdminId.mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Administrator credentials not found');
  });
  
  it('should handle repository errors', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository to throw an error
    adminRepository.findByAuthId.mockRejectedValue(new Error('Database connection error'));
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication error: Database connection error');
  });
});