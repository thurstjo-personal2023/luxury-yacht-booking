/**
 * Unit tests for RegisterAdminUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { RegisterAdminUseCase } from '../../../../../../core/application/use-cases/admin/register-admin-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminCredentialsRepository } from '../../../../../../core/application/interfaces/repositories/admin-credentials-repository';
import { IAdminInvitationRepository } from '../../../../../../core/application/interfaces/repositories/admin-invitation-repository';
import { IAuthProvider } from '../../../../../../core/application/interfaces/auth/auth-provider';
import { AdminAuthenticationService } from '../../../../../../core/domain/admin/admin-authentication-service';
import { AdminUser } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../../core/domain/admin/admin-role';
import { AdminInvitation } from '../../../../../../core/domain/admin/admin-invitation';
import { AdminCredentials } from '../../../../../../core/domain/admin/admin-credentials';

describe('RegisterAdminUseCase', () => {
  let adminRepository: IAdminRepository;
  let credentialsRepository: IAdminCredentialsRepository;
  let invitationRepository: IAdminInvitationRepository;
  let authProvider: IAuthProvider;
  let authService: AdminAuthenticationService;
  let useCase: RegisterAdminUseCase;
  
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
    
    invitationRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByCode: jest.fn(),
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
    useCase = new RegisterAdminUseCase(
      adminRepository,
      credentialsRepository,
      invitationRepository,
      authProvider,
      authService
    );
  });
  
  it('should register a new admin successfully', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'New Admin';
    const phoneNumber = '+1234567890';
    const invitationCode = 'valid-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Mock admin repository to return null (admin not exists)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock auth provider to validate password
    (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
    
    // Mock auth provider to create user
    const userId = 'new-admin-123';
    (authProvider.createUserWithEmailPassword as jest.Mock).mockResolvedValue({
      userId
    });
    
    // Mock auth provider to generate password hash
    const passwordHash = 'hashed-password';
    (authProvider.generatePasswordHash as jest.Mock).mockResolvedValue(passwordHash);
    
    // Mock admin repository to create admin
    const createdAdmin = new AdminUser({
      id: userId,
      email,
      name,
      role: AdminRole.ADMIN,
      phoneNumber,
      isApproved: false // New admin should not be automatically approved
    });
    (adminRepository.create as jest.Mock).mockResolvedValue(createdAdmin);
    
    // Mock credentials repository to create credentials
    const createdCredentials = new AdminCredentials({
      adminId: userId,
      passwordHash
    });
    (credentialsRepository.create as jest.Mock).mockResolvedValue(createdCredentials);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(createdAdmin);
    expect(result.requiresApproval).toBe(true);
    expect(invitationRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(adminRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(authProvider.validatePassword).toHaveBeenCalledWith(password);
    expect(authProvider.createUserWithEmailPassword).toHaveBeenCalledWith(email, password);
    expect(authProvider.generatePasswordHash).toHaveBeenCalledWith(password);
    expect(adminRepository.create).toHaveBeenCalled();
    expect(credentialsRepository.create).toHaveBeenCalled();
    expect(invitationRepository.delete).toHaveBeenCalledWith(validInvitation.id);
  });
  
  it('should fail for non-existent invitation', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'Non-existent';
    const phoneNumber = '+1234567890';
    const invitationCode = 'any-code';
    
    // Mock invitation repository to return null (no invitation found)
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation not found');
    expect(result.admin).toBeUndefined();
  });
  
  it('should fail for expired invitation', async () => {
    // Arrange
    const email = 'expired@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'Expired';
    const phoneNumber = '+1234567890';
    const invitationCode = 'expired-code';
    
    // Mock invitation repository to return an expired invitation
    const expiredInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(expiredInvitation);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation has expired');
    expect(result.admin).toBeUndefined();
  });
  
  it('should fail for incorrect invitation code', async () => {
    // Arrange
    const email = 'invited@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'Invited';
    const phoneNumber = '+1234567890';
    const correctCode = 'correct-code';
    const incorrectCode = 'wrong-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: correctCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode: incorrectCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid invitation code');
    expect(result.admin).toBeUndefined();
  });
  
  it('should fail if admin already exists', async () => {
    // Arrange
    const email = 'existing@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'Existing';
    const phoneNumber = '+1234567890';
    const invitationCode = 'valid-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Mock admin repository to return an existing admin
    const existingAdmin = new AdminUser({
      id: 'existing-admin',
      email,
      name: 'Existing Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(existingAdmin);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin with this email already exists');
    expect(result.admin).toBeUndefined();
  });
  
  it('should fail for weak password', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const password = 'weak';
    const name = 'New Admin';
    const phoneNumber = '+1234567890';
    const invitationCode = 'valid-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Mock admin repository to return null (admin not exists)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock auth provider to validate password - fails for weak password
    (authProvider.validatePassword as jest.Mock).mockResolvedValue(false);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Password does not meet security requirements');
    expect(result.admin).toBeUndefined();
  });
  
  it('should handle auth provider errors', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const password = 'SecureP@ssw0rd';
    const name = 'New Admin';
    const phoneNumber = '+1234567890';
    const invitationCode = 'valid-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Mock admin repository to return null (admin not exists)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock auth provider to validate password
    (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
    
    // Mock auth provider to throw error when creating user
    (authProvider.createUserWithEmailPassword as jest.Mock).mockRejectedValue(
      new Error('Auth provider error')
    );
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Auth provider error');
    expect(result.admin).toBeUndefined();
  });
  
  it('should set Super Admin as automatically approved', async () => {
    // Arrange
    const email = 'superadmin@example.com';
    const password = 'SuperSecureP@ssw0rd';
    const name = 'Super Admin';
    const phoneNumber = '+1234567890';
    const invitationCode = 'valid-code';
    
    // Mock invitation repository to return a valid invitation for Super Admin
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role: AdminRole.SUPER_ADMIN,
      invitedById: 'admin-123',
      code: invitationCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Mock admin repository to return null (admin not exists)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock auth provider to validate password
    (authProvider.validatePassword as jest.Mock).mockResolvedValue(true);
    
    // Mock auth provider to create user
    const userId = 'super-admin-123';
    (authProvider.createUserWithEmailPassword as jest.Mock).mockResolvedValue({
      userId
    });
    
    // Mock auth provider to generate password hash
    (authProvider.generatePasswordHash as jest.Mock).mockResolvedValue('hashed-password');
    
    // Mock admin repository to create admin - Note the isApproved: true
    const createdAdmin = new AdminUser({
      id: userId,
      email,
      name,
      role: AdminRole.SUPER_ADMIN,
      phoneNumber,
      isApproved: true // Super admin should be automatically approved
    });
    (adminRepository.create as jest.Mock).mockResolvedValue(createdAdmin);
    
    // Act
    const result = await useCase.execute({
      email,
      password,
      name,
      phoneNumber,
      invitationCode
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.admin).toBe(createdAdmin);
    expect(result.requiresApproval).toBe(false); // Super admin doesn't require approval
    expect(adminRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      isApproved: true
    }));
  });
});