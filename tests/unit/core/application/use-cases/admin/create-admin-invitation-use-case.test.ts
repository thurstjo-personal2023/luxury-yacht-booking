/**
 * Unit tests for CreateAdminInvitationUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { CreateAdminInvitationUseCase } from '../../../../../../core/application/use-cases/admin/create-admin-invitation-use-case';
import { IAdminRepository } from '../../../../../../core/application/interfaces/repositories/admin-repository';
import { IAdminInvitationRepository } from '../../../../../../core/application/interfaces/repositories/admin-invitation-repository';
import { AdminInvitationService } from '../../../../../../core/domain/admin/admin-invitation-service';
import { AdminAuthorizationService } from '../../../../../../core/domain/admin/admin-authorization-service';
import { AdminUser } from '../../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../../core/domain/admin/admin-role';
import { AdminInvitation } from '../../../../../../core/domain/admin/admin-invitation';

describe('CreateAdminInvitationUseCase', () => {
  let invitationRepository: IAdminInvitationRepository;
  let adminRepository: IAdminRepository;
  let invitationService: AdminInvitationService;
  let authorizationService: AdminAuthorizationService;
  let useCase: CreateAdminInvitationUseCase;
  
  beforeEach(() => {
    // Create mocks
    invitationRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      findByCode: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    
    adminRepository = {
      findById: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findAll: jest.fn(),
      findPendingApprovals: jest.fn()
    };
    
    invitationService = new AdminInvitationService({
      generateRandomString: jest.fn().mockReturnValue('generated-code')
    });
    
    authorizationService = new AdminAuthorizationService();
    
    // Create use case
    useCase = new CreateAdminInvitationUseCase(
      invitationRepository,
      adminRepository,
      invitationService,
      authorizationService
    );
  });
  
  it('should create an invitation successfully', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedByAdminId = 'super-admin-123';
    
    // Mock admin repository to return the inviter
    const inviterAdmin = new AdminUser({
      id: invitedByAdminId,
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(inviterAdmin);
    
    // Mock admin repository to return null for new admin (email not found)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock invitation repository to return null (no existing invitation)
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock invitation repository create to return the created invitation
    const createdInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name,
      role,
      invitedById: invitedByAdminId,
      code: 'generated-code'
    });
    (invitationRepository.create as jest.Mock).mockResolvedValue(createdInvitation);
    
    // Act
    const result = await useCase.execute({
      email,
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(true);
    expect(result.invitation).toBe(createdInvitation);
    expect(result.invitationCode).toBe('generated-code');
    expect(adminRepository.findById).toHaveBeenCalledWith(invitedByAdminId);
    expect(adminRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(invitationRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(invitationRepository.create).toHaveBeenCalled();
  });
  
  it('should fail if inviter does not exist', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedByAdminId = 'nonexistent-admin';
    
    // Mock admin repository to return null (inviter not found)
    (adminRepository.findById as jest.Mock).mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute({
      email,
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Inviter admin not found');
    expect(result.invitation).toBeUndefined();
    expect(result.invitationCode).toBeUndefined();
  });
  
  it('should fail if inviter is not authorized to create invitation for the role', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.SUPER_ADMIN; // Regular admin cannot invite super admin
    const invitedByAdminId = 'regular-admin-123';
    
    // Mock admin repository to return the inviter with insufficient privileges
    const inviterAdmin = new AdminUser({
      id: invitedByAdminId,
      email: 'regularadmin@example.com',
      name: 'Regular Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(inviterAdmin);
    
    // Act
    const result = await useCase.execute({
      email,
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Not authorized to create invitation for this role');
    expect(result.invitation).toBeUndefined();
    expect(result.invitationCode).toBeUndefined();
  });
  
  it('should fail if admin with email already exists', async () => {
    // Arrange
    const email = 'existing@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedByAdminId = 'super-admin-123';
    
    // Mock admin repository to return the inviter
    const inviterAdmin = new AdminUser({
      id: invitedByAdminId,
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(inviterAdmin);
    
    // Mock admin repository to return an existing admin with the same email
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
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Admin with this email already exists');
    expect(result.invitation).toBeUndefined();
    expect(result.invitationCode).toBeUndefined();
  });
  
  it('should fail if invitation with email already exists', async () => {
    // Arrange
    const email = 'invited@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedByAdminId = 'super-admin-123';
    
    // Mock admin repository to return the inviter
    const inviterAdmin = new AdminUser({
      id: invitedByAdminId,
      email: 'superadmin@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN,
      isApproved: true
    });
    (adminRepository.findById as jest.Mock).mockResolvedValue(inviterAdmin);
    
    // Mock admin repository to return null (no existing admin)
    (adminRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Mock invitation repository to return an existing invitation
    const existingInvitation = new AdminInvitation({
      id: 'existing-invitation',
      email,
      name: 'Already Invited',
      role: AdminRole.ADMIN,
      invitedById: invitedByAdminId,
      code: 'existing-code'
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(existingInvitation);
    
    // Act
    const result = await useCase.execute({
      email,
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invitation for this email already exists');
    expect(result.invitation).toBeUndefined();
    expect(result.invitationCode).toBeUndefined();
  });
  
  it('should handle repository errors', async () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedByAdminId = 'super-admin-123';
    
    // Mock admin repository to throw an error
    (adminRepository.findById as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );
    
    // Act
    const result = await useCase.execute({
      email,
      name,
      role,
      invitedByAdminId
    });
    
    // Assert
    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
    expect(result.invitation).toBeUndefined();
    expect(result.invitationCode).toBeUndefined();
  });
});