/**
 * Unit tests for AdminInvitation entity
 */
import { describe, expect, it } from '@jest/globals';
import { AdminInvitation } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';

describe('AdminInvitation Entity', () => {
  it('should create an admin invitation with valid properties', () => {
    // Arrange
    const id = 'invitation-123';
    const email = 'newadmin@example.com';
    const name = 'New Admin';
    const role = AdminRole.ADMIN;
    const invitedById = 'admin-456';
    const code = 'abc123';
    const createdAt = new Date();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    
    // Act
    const invitation = new AdminInvitation({
      id,
      email,
      name,
      role,
      invitedById,
      code,
      createdAt,
      expiresAt
    });
    
    // Assert
    expect(invitation.id).toBe(id);
    expect(invitation.email).toBe(email);
    expect(invitation.name).toBe(name);
    expect(invitation.role).toBe(role);
    expect(invitation.invitedById).toBe(invitedById);
    expect(invitation.code).toBe(code);
    expect(invitation.createdAt).toBe(createdAt);
    expect(invitation.expiresAt).toBe(expiresAt);
  });
  
  it('should validate email format', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminInvitation({
        id: 'invitation-123',
        email: 'invalid-email',
        name: 'New Admin',
        role: AdminRole.ADMIN,
        invitedById: 'admin-456',
        code: 'abc123'
      });
    }).toThrow('Invalid email format');
  });
  
  it('should require a name', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminInvitation({
        id: 'invitation-123',
        email: 'newadmin@example.com',
        name: '',
        role: AdminRole.ADMIN,
        invitedById: 'admin-456',
        code: 'abc123'
      });
    }).toThrow('Name is required');
  });
  
  it('should require a code', () => {
    // Arrange & Act & Assert
    expect(() => {
      new AdminInvitation({
        id: 'invitation-123',
        email: 'newadmin@example.com',
        name: 'New Admin',
        role: AdminRole.ADMIN,
        invitedById: 'admin-456',
        code: ''
      });
    }).toThrow('Invitation code is required');
  });
  
  it('should check if invitation is expired', () => {
    // Arrange
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    
    const expiredInvitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-456',
      code: 'abc123',
      expiresAt: pastDate
    });
    
    const validInvitation = new AdminInvitation({
      id: 'invitation-456',
      email: 'newadmin2@example.com',
      name: 'New Admin 2',
      role: AdminRole.ADMIN,
      invitedById: 'admin-456',
      code: 'def456',
      expiresAt: futureDate
    });
    
    // Act & Assert
    expect(expiredInvitation.isExpired()).toBe(true);
    expect(validInvitation.isExpired()).toBe(false);
  });
  
  it('should verify the correct invitation code', () => {
    // Arrange
    const invitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-456',
      code: 'correct-code'
    });
    
    // Act & Assert
    expect(invitation.verifyCode('correct-code')).toBe(true);
    expect(invitation.verifyCode('wrong-code')).toBe(false);
  });
  
  it('should create with default expiresAt if not provided', () => {
    // Arrange
    const now = new Date();
    
    // Act
    const invitation = new AdminInvitation({
      id: 'invitation-123',
      email: 'newadmin@example.com',
      name: 'New Admin',
      role: AdminRole.ADMIN,
      invitedById: 'admin-456',
      code: 'abc123'
    });
    
    // Assert
    expect(invitation.expiresAt).toBeInstanceOf(Date);
    
    // Should be approximately 7 days from now (allow 1 second tolerance for test execution time)
    const expectedExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const diffMs = Math.abs(invitation.expiresAt.getTime() - expectedExpiry.getTime());
    expect(diffMs).toBeLessThan(1000);
  });
});