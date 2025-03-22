/**
 * Unit tests for AuthenticateAdminUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AuthenticateAdminUseCase } from '../../../../../../core/application/use-cases/admin/authenticate-admin-use-case';
import { IAdminRepository, AdminSearchOptions, AdminSearchResult } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAuthProvider, UserInfo, AuthToken, UserCredentials, CustomClaims } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService, AuthenticationResult } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser, AdminUserStatus } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';
import { MfaStatus, MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';
import { Permission } from '../../../../../../core/domain/admin/permission';

describe('AuthenticateAdminUseCase', () => {
  let adminRepository: jest.Mocked<IAdminRepository>;
  let credentialsRepository: jest.Mocked<IAdminCredentialsRepository>;
  let authProvider: jest.Mocked<IAuthProvider>;
  let authService: AdminAuthenticationService;
  let useCase: AuthenticateAdminUseCase;
  
  beforeEach(() => {
    // Create mocks
    adminRepository = {
      findById: jest.fn().mockResolvedValue(null),
      findByEmail: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation(admin => Promise.resolve(admin)),
      update: jest.fn().mockImplementation(admin => Promise.resolve(admin)),
      delete: jest.fn().mockResolvedValue(true),
      list: jest.fn().mockResolvedValue({ admins: [], total: 0, limit: 10, offset: 0 }),
      listPendingApprovals: jest.fn().mockResolvedValue({ admins: [], total: 0, limit: 10, offset: 0 }),
      countByStatus: jest.fn().mockResolvedValue(0)
    } as unknown as jest.Mocked<IAdminRepository>;
    
    credentialsRepository = {
      getCredentials: jest.fn().mockResolvedValue(null),
      getCredentialsByEmail: jest.fn().mockResolvedValue(null),
      createCredentials: jest.fn().mockImplementation(creds => Promise.resolve(creds)),
      updateCredentials: jest.fn().mockImplementation(creds => Promise.resolve(creds)),
      updatePassword: jest.fn().mockResolvedValue(true),
      setupMfa: jest.fn().mockResolvedValue(true),
      disableMfa: jest.fn().mockResolvedValue(true),
      storeTemporaryToken: jest.fn().mockResolvedValue(true),
      validateTemporaryToken: jest.fn().mockResolvedValue(true),
      clearTemporaryToken: jest.fn().mockResolvedValue(true),
      deleteCredentials: jest.fn().mockResolvedValue(true)
    } as unknown as jest.Mocked<IAdminCredentialsRepository>;
    
    authProvider = {
      createUser: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@example.com', emailVerified: false, disabled: false }),
      getUser: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@example.com', emailVerified: false, disabled: false }),
      getUserByEmail: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@example.com', emailVerified: false, disabled: false }),
      updateUser: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@example.com', emailVerified: false, disabled: false }),
      deleteUser: jest.fn().mockResolvedValue(true),
      setCustomClaims: jest.fn().mockResolvedValue(true),
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'user-123', email: 'user@example.com', emailVerified: false, disabled: false }),
      generateToken: jest.fn().mockResolvedValue({ token: 'token123', expiresIn: 3600 }),
      revokeRefreshTokens: jest.fn().mockResolvedValue(true),
      generatePasswordResetLink: jest.fn().mockResolvedValue('https://reset-password.example.com'),
      generateEmailVerificationLink: jest.fn().mockResolvedValue('https://verify-email.example.com'),
      generateSignInWithEmailLink: jest.fn().mockResolvedValue('https://sign-in.example.com')
    } as unknown as jest.Mocked<IAuthProvider>;
    
    // Create mock authentication service with spies
    authService = new AdminAuthenticationService();
    jest.spyOn(authService, 'authenticate').mockImplementation(
      (credentials: AdminCredentials | null, password: string): AuthenticationResult => {
        if (!credentials) {
          return { success: false, requiresMfa: false, error: 'Invalid credentials' };
        }
        
        if (password === 'correct-password') {
          if (credentials.hasMfaSecret) {
            return { 
              success: true, 
              requiresMfa: true,
              temporaryToken: 'temp-token-123'
            };
          }
          return { success: true, requiresMfa: false };
        }
        
        return { success: false, requiresMfa: false, error: 'Invalid password' };
      }
    );
    
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
    const adminUser = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      'cred-123',
      adminId,
      new Date(),
      false,
      null,
      null
    );
    
    // Set password hash and authentication method
    jest.spyOn(credentials, 'hasPassword', 'get').mockReturnValue(true);
    jest.spyOn(credentials, '_passwordHash', 'get').mockReturnValue('hashed-password');
    
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service
    jest.spyOn(authService, 'authenticate').mockReturnValue({
      success: true,
      requiresMfa: false
    });
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toEqual(adminUser);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(false);
    expect(authProvider.getUserByEmail).toHaveBeenCalledWith(email);
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.getCredentials).toHaveBeenCalledWith(adminId);
  });
  
  it('should indicate MFA is required for admins with MFA enabled', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'correct-password';
    const adminId = 'admin-123';
    const tempToken = 'temp-token-123';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    const adminUser = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      'cred-123',
      adminId,
      new Date(),
      true,
      'totp',
      'mfa-secret-123'
    );
    
    // Set password hash and authentication method
    jest.spyOn(credentials, 'hasPassword', 'get').mockReturnValue(true);
    jest.spyOn(credentials, '_passwordHash', 'get').mockReturnValue('hashed-password');
    jest.spyOn(credentials, 'hasMfaSecret', 'get').mockReturnValue(true);
    
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service
    jest.spyOn(authService, 'authenticate').mockReturnValue({
      success: true,
      requiresMfa: true,
      temporaryToken: tempToken
    });
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toEqual(adminUser);
    expect(result.requiresMfa).toBe(true);
    expect(result.temporaryToken).toBe(tempToken);
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
  
  it('should fail for inactive admin', async () => {
    // Arrange
    const email = 'inactive@example.com';
    const password = 'password123';
    const adminId = 'admin-456';
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response with inactive admin
    const adminUser = new AdminUser(
      adminId,
      email,
      'Inactive Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.PENDING_APPROVAL, // Inactive
      new Date(),
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Spy on isActive method
    jest.spyOn(adminUser, 'isActive').mockReturnValue(false);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toContain('Administrator account is not active');
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
    const adminUser = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      'cred-123',
      adminId,
      new Date(),
      false,
      null,
      null
    );
    
    // Set password hash
    jest.spyOn(credentials, 'hasPassword', 'get').mockReturnValue(true);
    jest.spyOn(credentials, '_passwordHash', 'get').mockReturnValue('hashed-password');
    
    credentialsRepository.getCredentials.mockResolvedValue(credentials);
    
    // Mock authentication service to indicate invalid password
    jest.spyOn(authService, 'authenticate').mockReturnValue({
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
    
    // Mock getUserByEmail
    authProvider.getUserByEmail.mockResolvedValue({
      uid: adminId,
      email,
      emailVerified: true,
      disabled: false
    });
    
    // Mock admin repository response
    const adminUser = new AdminUser(
      adminId,
      email,
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    adminRepository.findById.mockResolvedValue(adminUser);
    
    // Mock credentials repository to return null (credentials not found)
    credentialsRepository.getCredentials.mockResolvedValue(null);
    
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