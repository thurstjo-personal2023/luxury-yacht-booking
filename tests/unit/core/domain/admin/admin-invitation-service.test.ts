/**
 * Unit tests for AdminInvitationService
 */
import { describe, expect, it, jest } from '@jest/globals';
import { AdminInvitationService } from '../../../../../core/domain/admin/admin-invitation-service';
import { AdminInvitation } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';

describe('AdminInvitationService', () => {
  let invitationService: AdminInvitationService;
  
  beforeEach(() => {
    // Initialize with mock crypto function
    invitationService = new AdminInvitationService({
      generateRandomString: jest.fn().mockReturnValue('random-code')
    });
  });
  
  it('should create an invitation with the specified properties', () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedById = 'admin-123';
    
    // Act
    const invitation = invitationService.createInvitation({
      email,
      name,
      role,
      invitedById
    });
    
    // Assert
    expect(invitation).toBeInstanceOf(AdminInvitation);
    expect(invitation.email).toBe(email);
    expect(invitation.name).toBe(name);
    expect(invitation.role).toBe(role);
    expect(invitation.invitedById).toBe(invitedById);
    expect(invitation.code).toBe('random-code');
    expect(invitation.expiresAt).toBeInstanceOf(Date);
    
    // Check that the expiration date is in the future (approximately 7 days)
    const now = new Date();
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
    const expectedExpiry = new Date(now.getTime() + sevenDaysInMs);
    const diffMs = Math.abs(invitation.expiresAt.getTime() - expectedExpiry.getTime());
    expect(diffMs).toBeLessThan(1000); // Allow 1 second tolerance
  });
  
  it('should generate a unique code for each invitation', () => {
    // Arrange
    // Set up the mock to return different values on consecutive calls
    const generateRandomStringMock = jest.fn()
      .mockReturnValueOnce('code-1')
      .mockReturnValueOnce('code-2');
    
    const customInvitationService = new AdminInvitationService({
      generateRandomString: generateRandomStringMock
    });
    
    // Act
    const invitation1 = customInvitationService.createInvitation({
      email: 'admin1@example.com',
      name: 'Admin 1',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123'
    });
    
    const invitation2 = customInvitationService.createInvitation({
      email: 'admin2@example.com',
      name: 'Admin 2',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123'
    });
    
    // Assert
    expect(invitation1.code).toBe('code-1');
    expect(invitation2.code).toBe('code-2');
    expect(invitation1.code).not.toBe(invitation2.code);
    expect(generateRandomStringMock).toHaveBeenCalledTimes(2);
  });
  
  it('should verify a valid invitation code', () => {
    // Arrange
    const invitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'valid-code',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    
    // Act
    const isValid = invitationService.verifyInvitation(invitation, 'valid-code');
    
    // Assert
    expect(isValid).toBe(true);
  });
  
  it('should reject an invalid invitation code', () => {
    // Arrange
    const invitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'valid-code',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    
    // Act
    const isValid = invitationService.verifyInvitation(invitation, 'wrong-code');
    
    // Assert
    expect(isValid).toBe(false);
  });
  
  it('should reject an expired invitation', () => {
    // Arrange
    const invitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'valid-code',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
    });
    
    // Act
    const isValid = invitationService.verifyInvitation(invitation, 'valid-code');
    
    // Assert
    expect(isValid).toBe(false);
  });
  
  it('should determine if an invitation is expired', () => {
    // Arrange
    const expiredInvitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'expired@example.com',
      name: 'Expired Invitation',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'code',
      expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in the past
    });
    
    const validInvitation = new AdminInvitation({
      id: 'invitation-456',
      email: 'valid@example.com',
      name: 'Valid Invitation',
      role: AdminRole.ADMIN,
      invitedById: 'admin-123',
      code: 'code',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in the future
    });
    
    // Act & Assert
    expect(invitationService.isInvitationExpired(expiredInvitation)).toBe(true);
    expect(invitationService.isInvitationExpired(validInvitation)).toBe(false);
  });
  
  it('should create an invitation with a custom expiration date', () => {
    // Arrange
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedById = 'admin-123';
    const customExpiry = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days in the future
    
    // Act
    const invitation = invitationService.createInvitation({
      email,
      name,
      role,
      invitedById,
      expiresAt: customExpiry
    });
    
    // Assert
    expect(invitation.expiresAt).toBe(customExpiry);
  });
});