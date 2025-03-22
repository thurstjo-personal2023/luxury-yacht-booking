/**
 * Unit tests for AuthenticateAdminUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AuthenticateAdminUseCase } from '../../../../../../core/application/use-cases/admin/authenticate-admin-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAuthProvider } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService, AuthenticationResult } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser, AdminUserStatus } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { MfaStatus, MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';
import { Permission } from '../../../../../../core/domain/admin/permission';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';

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
    
    // Create mock authentication service
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
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance with all required parameters
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
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
    adminRepository.findById.mockResolvedValue(admin);
    
    // Create a proper AdminCredentials instance
    const credentials = new AdminCredentials(
      adminId,
      email,
      updatedDate,
      'hashed-password'
    );
    
    // Mock credentials repository
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service
    authService.authenticate.mockReturnValue({
      success: true,
      requiresMfa: false
    });
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(admin);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(false);
    expect(authProvider.getUserByEmail).toHaveBeenCalledWith(email);
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.getCredentials).toHaveBeenCalledWith(adminId);
    expect(authService.authenticate).toHaveBeenCalledWith(credentials, password);
  });
  
  it('should indicate MFA is required for admins with MFA enabled', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'correct-password';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance with MFA enabled
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
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
    adminRepository.findById.mockResolvedValue(admin);
    
    // Create a proper AdminCredentials instance with MFA secret
    const credentials = new AdminCredentials(
      adminId,
      email,
      updatedDate,
      'hashed-password',
      'mfa-secret'
    );
    
    // Mock credentials repository
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service to indicate MFA is required
    authService.authenticate.mockReturnValue({
      success: true,
      requiresMfa: true,
      temporaryToken: 'temp-token-123'
    });
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(admin);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(true);
    expect(authService.authenticate).toHaveBeenCalledWith(credentials, password);
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
    adminRepository.findById.mockResolvedValue(null);
    
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
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    adminRepository.findById.mockResolvedValue(admin);
    
    // Create a proper AdminCredentials instance
    const credentials = new AdminCredentials(
      adminId,
      email,
      updatedDate,
      'hashed-password'
    );
    
    // Mock credentials repository
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service to indicate invalid credentials
    authService.authenticate.mockReturnValue({
      success: false,
      requiresMfa: false,
      error: 'Invalid password'
    });
    
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
    const createdDate = new Date();
    const updatedDate = new Date();
    
    // Create a proper AdminUser instance
    const admin = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [], // permissions
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      createdDate,
      updatedDate
    );
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    adminRepository.findById.mockResolvedValue(admin);
    
    // Mock credentials repository to return null (credentials not found)
    credentialsRepository.getCredentials.mockResolvedValue(null);
    
    // Mock authentication service for missing credentials
    authService.authenticate.mockReturnValue({
      success: false,
      requiresMfa: false,
      error: 'Invalid credentials'
    });
    
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
    adminRepository.findById.mockRejectedValue(new Error('Database connection error'));
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication error: Database connection error');
  });
});