/**
 * Unit tests for AuthenticateAdminUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AuthenticateAdminUseCase } from '../../../../../../core/application/use-cases/admin/authenticate-admin-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAuthProvider } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser, AdminUserStatus } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../../core/domain/admin/admin-role';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';
import { MfaStatus, MfaStatusType } from '../../../../../../core/domain/admin/mfa-status';
import { Permission } from '../../../../../../core/domain/admin/permission';

// Mock UserInfo for authProvider
interface UserInfo {
  uid: string;
  email: string;
  [key: string]: any;
}

describe('AuthenticateAdminUseCase', () => {
  let adminRepository: IAdminRepository;
  let credentialsRepository: IAdminCredentialsRepository;
  let authProvider: IAuthProvider;
  let authService: AdminAuthenticationService;
  let useCase: AuthenticateAdminUseCase;
  
  beforeEach(() => {
    // Create mocks
    adminRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByAuthId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findPendingApprovals: jest.fn()
    };
    
    credentialsRepository = {
      findByAdminId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    authProvider = {
      getUserById: jest.fn(),
      getUserByEmail: jest.fn(),
      updateUser: jest.fn(),
      deleteUser: jest.fn(),
      verifyCredentials: jest.fn(),
      generateToken: jest.fn(),
      verifyToken: jest.fn(),
      revokeToken: jest.fn()
    };
    
    authService = new AdminAuthenticationService(authProvider);
    
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
    const password = 'password123';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    
    // Mock getUserByEmail
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
    // Mock verifyCredentials
    (authService.verifyCredentials as jest.Mock).mockResolvedValue(true);
    
    // Mock generateToken
    (authProvider.generateToken as jest.Mock).mockResolvedValue({
      token
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
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      adminId,
      'hashed-password',
      false
    );
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(adminUser);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(false);
    expect(authProvider.getUserByEmail).toHaveBeenCalledWith(email);
    expect(adminRepository.findByAuthId).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.findByAdminId).toHaveBeenCalledWith(adminId);
  });
  
  it('should indicate MFA is required for admins with MFA enabled', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    
    // Mock getUserByEmail
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
    // Mock verifyCredentials
    (authService.verifyCredentials as jest.Mock).mockResolvedValue(true);
    
    // Mock generateToken
    (authProvider.generateToken as jest.Mock).mockResolvedValue({
      token
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
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      adminId,
      'hashed-password',
      true,
      'mfa-secret'
    );
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(adminUser);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(true);
  });
  
  it('should fail for non-existent admin user', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    const password = 'password123';
    
    // Mock getUserByEmail to throw an error
    (authProvider.getUserByEmail as jest.Mock).mockRejectedValue(
      new Error('User not found')
    );
    
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
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: userId,
      email
    } as UserInfo);
    
    // Mock admin repository to return null (not an admin)
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(null);
    
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
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
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
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(adminUser);
    
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
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
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
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials(
      adminId,
      'hashed-password',
      false
    );
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Mock verifyCredentials to return false (invalid password)
    (authService.verifyCredentials as jest.Mock).mockResolvedValue(false);
    
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
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
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
    (adminRepository.findByAuthId as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository to return null (credentials not found)
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(null);
    
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
    (authProvider.getUserByEmail as jest.Mock).mockResolvedValue({
      uid: adminId,
      email
    } as UserInfo);
    
    // Mock admin repository to throw an error
    (adminRepository.findByAuthId as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication error: Database connection error');
  });
});