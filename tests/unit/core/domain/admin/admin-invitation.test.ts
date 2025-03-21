/**
 * Unit tests for AdminInvitation entity
 */
import { describe, expect, it } from '@jest/globals';
import { AdminInvitation, AdminInvitationStatus } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';

describe('AdminInvitation Entity', () => {
  it('should create an admin invitation with valid properties', () => {
    // Arrange
    const id = 'invitation-123';
    const email = 'newadmin@example.com';
    const role = new AdminRole(AdminRoleType.ADMIN);
    const invitedBy = 'admin-456';
    const createdAt = new Date();
    const expirationDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
    const status = AdminInvitationStatus.PENDING;
    const invitationCode = 'abc123';
    
    // Act
    const invitation = new AdminInvitation(
      id,
      email,
      role,
      invitedBy,
      createdAt,
      expirationDate,
      status,
      invitationCode
    );
    
    // Assert
    expect(invitation.id).toBe(id);
    expect(invitation.email).toBe(email);
    expect(invitation.role).toBe(role);
    expect(invitation.invitedBy).toBe(invitedBy);
    expect(invitation.createdAt).toEqual(createdAt);
    expect(invitation.expirationDate).toEqual(expirationDate);
    expect(invitation.status).toBe(status);
    expect(invitation.invitationCode).toBe(invitationCode);
  });
  
  it('should correctly determine if invitation is expired', () => {
    // Arrange
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 1 day ago
    const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day from now
    
    const expiredInvitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      pastDate,
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    const validInvitation = new AdminInvitation(
      'invitation-456',
      'newadmin2@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      futureDate,
      AdminInvitationStatus.PENDING,
      'def456'
    );
    
    const markedExpiredInvitation = new AdminInvitation(
      'invitation-789',
      'newadmin3@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      futureDate,
      AdminInvitationStatus.EXPIRED,
      'ghi789'
    );
    
    // Act & Assert
    expect(expiredInvitation.isExpired()).toBe(true); // expired by date
    expect(validInvitation.isExpired()).toBe(false); // not expired
    expect(markedExpiredInvitation.isExpired()).toBe(true); // expired by status
  });
  
  it('should allow marking an invitation as expired', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    // Act
    invitation.markExpired();
    
    // Assert
    expect(invitation.status).toBe(AdminInvitationStatus.EXPIRED);
    expect(invitation.isExpired()).toBe(true);
  });
  
  it('should allow marking an invitation as accepted', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    // Act
    invitation.markAccepted('new-admin-789');
    
    // Assert
    expect(invitation.status).toBe(AdminInvitationStatus.ACCEPTED);
    expect(invitation.acceptedBy).toBe('new-admin-789');
    expect(invitation.acceptedAt).toBeInstanceOf(Date);
  });
  
  it('should not allow accepting an expired invitation', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    // Act & Assert
    expect(() => {
      invitation.markAccepted('new-admin-789');
    }).toThrow('Cannot accept an expired invitation');
  });
  
  it('should not allow accepting a non-pending invitation', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.REVOKED,
      'abc123'
    );
    
    // Act & Assert
    expect(() => {
      invitation.markAccepted('new-admin-789');
    }).toThrow('Cannot accept invitation with status: revoked');
  });
  
  it('should allow marking an invitation as revoked', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    // Act
    invitation.markRevoked();
    
    // Assert
    expect(invitation.status).toBe(AdminInvitationStatus.REVOKED);
  });
  
  it('should not allow revoking an accepted invitation', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.ACCEPTED,
      'abc123',
      'new-admin-789',
      new Date()
    );
    
    // Act & Assert
    expect(() => {
      invitation.markRevoked();
    }).toThrow('Cannot revoke an accepted invitation');
  });
  
  it('should correctly verify the invitation code', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'correct-code'
    );
    
    // Act & Assert
    expect(invitation.verifyInvitationCode('correct-code')).toBe(true);
    expect(invitation.verifyInvitationCode('wrong-code')).toBe(false);
  });
  
  it('should not verify code if invitation is expired', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
      AdminInvitationStatus.PENDING,
      'correct-code'
    );
    
    // Act & Assert
    expect(invitation.verifyInvitationCode('correct-code')).toBe(false);
  });
  
  it('should not verify code if invitation is not pending', () => {
    // Arrange
    const invitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.REVOKED,
      'correct-code'
    );
    
    // Act & Assert
    expect(invitation.verifyInvitationCode('correct-code')).toBe(false);
  });
  
  it('should correctly check if invitation can be used', () => {
    // Arrange
    const validInvitation = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    const expiredInvitation = new AdminInvitation(
      'invitation-456',
      'newadmin2@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() - 24 * 60 * 60 * 1000), // expired
      AdminInvitationStatus.PENDING,
      'def456'
    );
    
    const acceptedInvitation = new AdminInvitation(
      'invitation-789',
      'newadmin3@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.ACCEPTED,
      'ghi789'
    );
    
    // Act & Assert
    expect(validInvitation.canBeUsed()).toBe(true);
    expect(expiredInvitation.canBeUsed()).toBe(false);
    expect(acceptedInvitation.canBeUsed()).toBe(false);
  });
  
  it('should serialize to and deserialize from data objects', () => {
    // Arrange
    const original = new AdminInvitation(
      'invitation-123',
      'newadmin@example.com',
      new AdminRole(AdminRoleType.ADMIN),
      'admin-456',
      new Date(),
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      AdminInvitationStatus.PENDING,
      'abc123'
    );
    
    // Act
    const data = original.toData();
    const recreated = AdminInvitation.fromData(data);
    
    // Assert
    expect(recreated.id).toBe(original.id);
    expect(recreated.email).toBe(original.email);
    expect(recreated.role.type).toBe(original.role.type);
    expect(recreated.invitedBy).toBe(original.invitedBy);
    expect(recreated.status).toBe(original.status);
    expect(recreated.invitationCode).toBe(original.invitationCode);
  });
  
  it('should correctly generate invitation codes', () => {
    // Act
    const code = AdminInvitation.generateInvitationCode();
    
    // Assert
    expect(typeof code).toBe('string');
    expect(code.length).toBeGreaterThan(0);
  });
});