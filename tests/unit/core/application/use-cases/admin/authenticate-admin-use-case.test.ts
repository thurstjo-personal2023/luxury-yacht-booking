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
import { AdminRole } from '../../../../../../core/domain/admin/admin-role';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';
import { MfaStatus } from '../../../../../../core/domain/admin/mfa-status';

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
    
    // Mock auth provider response
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
      userId: adminId,
      token
    });
    
    // Mock admin repository response
    const adminUser = new AdminUser({
      id: adminId,
      email,
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials({
      adminId,
      passwordHash: 'hashed-password',
      mfaStatus: MfaStatus.DISABLED
    });
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(adminUser);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(false);
    expect(authProvider.authenticateWithEmailPassword).toHaveBeenCalledWith(email, password);
    expect(adminRepository.findById).toHaveBeenCalledWith(adminId);
    expect(credentialsRepository.findByAdminId).toHaveBeenCalledWith(adminId);
  });
  
  it('should indicate MFA is required for admins with MFA enabled', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    
    // Mock auth provider response
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
      userId: adminId,
      token
    });
    
    // Mock admin repository response
    const adminUser = new AdminUser({
      id: adminId,
      email,
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      isApproved: true,
      mfaStatus: MfaStatus.ENABLED
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials({
      adminId,
      passwordHash: 'hashed-password',
      mfaStatus: MfaStatus.ENABLED,
      mfaSecret: 'mfa-secret'
    });
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(adminUser);
    expect(result.token).toBe(token);
    expect(result.requiresMfa).toBe(true);
  });
  
  it('should fail for non-existent admin', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    const password = 'password123';
    
    // Mock auth provider to throw an error
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockRejectedValue(
      new Error('Authentication failed')
    );
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Authentication failed');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should fail for unapproved admin', async () => {
    // Arrange
    const email = 'unapproved@example.com';
    const password = 'password123';
    const adminId = 'admin-456';
    const token = 'auth-token-456';
    
    // Mock auth provider response
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
      userId: adminId,
      token
    });
    
    // Mock admin repository response with unapproved admin
    const adminUser = new AdminUser({
      id: adminId,
      email,
      name: 'Unapproved Admin',
      role: AdminRole.ADMIN,
      isApproved: false
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository response
    const credentials = new AdminCredentials({
      adminId,
      passwordHash: 'hashed-password'
    });
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(credentials);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin account is pending approval');
    expect(result.admin).toBeUndefined();
    expect(result.token).toBeUndefined();
  });
  
  it('should handle missing credentials', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    const token = 'auth-token-123';
    
    // Mock auth provider response
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
      userId: adminId,
      token
    });
    
    // Mock admin repository response
    const adminUser = new AdminUser({
      id: adminId,
      email,
      name: 'Test Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(adminUser);
    
    // Mock credentials repository to return null (credentials not found)
    (credentialsRepository.findByAdminId as jest.Mock).mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin credentials not found');
  });
  
  it('should handle repository errors', async () => {
    // Arrange
    const email = 'admin@example.com';
    const password = 'password123';
    const adminId = 'admin-123';
    
    // Mock auth provider response
    (authProvider.authenticateWithEmailPassword as jest.Mock).mockResolvedValue({
      userId: adminId,
      token: 'auth-token-123'
    });
    
    // Mock admin repository to throw an error
    (adminRepository.findById as jest.Mock).mockRejectedValue(
      new Error('Database connection error')
    );
    
    // Act
    const result = await useCase.execute(email, password);
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database connection error');
  });
});