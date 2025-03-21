/**
 * Unit tests for VerifyAdminInvitationUseCase
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { VerifyAdminInvitationUseCase } from '../../../../../../core/application/use-cases/admin/verify-admin-invitation-use-case';
import { IAdminInvitationRepository } from '../../../../../../core/application/interfaces/repositories/admin-invitation-repository';
import { AdminInvitationService } from '../../../../../../core/domain/admin/admin-invitation-service';
import { AdminInvitation } from '../../../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../../../core/domain/admin/admin-role';

describe('VerifyAdminInvitationUseCase', () => {
  let invitationRepository: IAdminInvitationRepository;
  let invitationService: AdminInvitationService;
  let useCase: VerifyAdminInvitationUseCase;
  
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
    
    invitationService = new AdminInvitationService();
    
    // Create use case
    useCase = new VerifyAdminInvitationUseCase(
      invitationRepository,
      invitationService
    );
  });
  
  it('should verify a valid invitation', async () => {
    // Arrange
    const email = 'invited@example.com';
    const code = 'valid-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name: 'Invited Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Override the invitation service's verifyInvitation method for this test
    jest.spyOn(invitationService, 'verifyInvitation').mockReturnValue(true);
    
    // Act
    const result = await useCase.execute(email, code);
    
    // Assert
    expect(result.valid).toBe(true);
    expect(result.invitation).toBe(validInvitation);
    expect(result.error).toBeUndefined();
    expect(invitationRepository.findByEmail).toHaveBeenCalledWith(email);
    expect(invitationService.verifyInvitation).toHaveBeenCalledWith(validInvitation, code);
  });
  
  it('should fail for non-existent invitation', async () => {
    // Arrange
    const email = 'nonexistent@example.com';
    const code = 'any-code';
    
    // Mock invitation repository to return null (no invitation found)
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    
    // Act
    const result = await useCase.execute(email, code);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invitation not found');
    expect(result.invitation).toBeUndefined();
  });
  
  it('should fail for expired invitation', async () => {
    // Arrange
    const email = 'expired@example.com';
    const code = 'expired-code';
    
    // Mock invitation repository to return an expired invitation
    const expiredInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name: 'Expired Invitation',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code,
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(expiredInvitation);
    
    // Override the invitation service's verifyInvitation method for this test
    jest.spyOn(invitationService, 'verifyInvitation').mockReturnValue(false);
    
    // Act
    const result = await useCase.execute(email, code);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid or expired invitation code');
    expect(result.invitation).toBeUndefined();
  });
  
  it('should fail for incorrect code', async () => {
    // Arrange
    const email = 'invited@example.com';
    const correctCode = 'correct-code';
    const incorrectCode = 'wrong-code';
    
    // Mock invitation repository to return a valid invitation
    const validInvitation = new AdminInvitation({
      id: 'invitation-123',
      email,
      name: 'Invited Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: correctCode,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    (invitationRepository.findByEmail as jest.Mock).mockResolvedValue(validInvitation);
    
    // Override the invitation service's verifyInvitation method for this test
    jest.spyOn(invitationService, 'verifyInvitation').mockReturnValue(false);
    
    // Act
    const result = await useCase.execute(email, incorrectCode);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Invalid or expired invitation code');
    expect(result.invitation).toBeUndefined();
  });
  
  it('should handle repository errors', async () => {
    // Arrange
    const email = 'invited@example.com';
    const code = 'valid-code';
    
    // Mock invitation repository to throw an error
    (invitationRepository.findByEmail as jest.Mock).mockRejectedValue(
      new Error('Database error')
    );
    
    // Act
    const result = await useCase.execute(email, code);
    
    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Database error');
    expect(result.invitation).toBeUndefined();
  });
});