/**
 * Unit tests for AdminInvitationService
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AdminInvitationService, InvitationValidationResult } from '../../../../../core/domain/admin/admin-invitation-service';
import { AdminInvitation, AdminInvitationStatus } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';

describe('AdminInvitationService', () => {
  describe('createInvitationData', () => {
    it('should create invitation data with default expiration time', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const email = 'admin@example.com';
      const role = 'admin';
      const invitedBy = 'inviter-123';
      
      // Act
      const invitation = invitationService.createInvitationData(
        email,
        role,
        invitedBy
      );
      
      // Assert
      expect(invitation.email).toBe(email);
      expect(invitation.role.type).toBe(AdminRoleType.ADMIN);
      expect(invitation.invitedBy).toBe(invitedBy);
      expect(invitation.invitationCode).toBeTruthy();
      expect(invitation.expirationDate).toBeInstanceOf(Date);
      
      // Should expire in 7 days by default
      const expectedExpiration = new Date();
      expectedExpiration.setDate(expectedExpiration.getDate() + 7);
      expect(invitation.expirationDate.getDate()).toBe(expectedExpiration.getDate());
    });
    
    it('should create invitation data with custom expiration time', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const email = 'admin@example.com';
      const role = 'admin';
      const invitedBy = 'inviter-123';
      const validityDays = 30;
      
      // Act
      const invitation = invitationService.createInvitationData(
        email,
        role,
        invitedBy,
        validityDays
      );
      
      // Assert
      expect(invitation.email).toBe(email);
      expect(invitation.role.type).toBe(AdminRoleType.ADMIN);
      expect(invitation.invitedBy).toBe(invitedBy);
      expect(invitation.invitationCode).toBeTruthy();
      expect(invitation.expirationDate).toBeInstanceOf(Date);
      
      // Should expire in 30 days
      const expectedExpiration = new Date();
      expectedExpiration.setDate(expectedExpiration.getDate() + 30);
      expect(invitation.expirationDate.getDate()).toBe(expectedExpiration.getDate());
    });
  });
  
  describe('validateInvitation', () => {
    it('should validate a valid invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
      
      const invitation = new AdminInvitation(
        'invitation-123',
        'newadmin@example.com',
        new AdminRole(AdminRoleType.ADMIN),
        'admin-456',
        new Date(),
        futureDate,
        AdminInvitationStatus.PENDING,
        'valid-code'
      );
      
      // Act
      const result = invitationService.validateInvitation(invitation, 'valid-code');
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.invitation).toBe(invitation);
    });
    
    it('should reject null invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const result = invitationService.validateInvitation(null, 'valid-code');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invitation not found');
    });
    
    it('should reject invitation with incorrect code', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
      
      const invitation = new AdminInvitation(
        'invitation-123',
        'newadmin@example.com',
        new AdminRole(AdminRoleType.ADMIN),
        'admin-456',
        new Date(),
        futureDate,
        AdminInvitationStatus.PENDING,
        'valid-code'
      );
      
      // Act
      const result = invitationService.validateInvitation(invitation, 'invalid-code');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid invitation code');
    });
    
    it('should reject expired invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day in past
      
      const invitation = new AdminInvitation(
        'invitation-123',
        'newadmin@example.com',
        new AdminRole(AdminRoleType.ADMIN),
        'admin-456',
        new Date(),
        pastDate,
        AdminInvitationStatus.PENDING,
        'valid-code'
      );
      
      // Act
      const result = invitationService.validateInvitation(invitation, 'valid-code');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invitation has expired');
    });
    
    it('should reject non-pending invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7); // 7 days in future
      
      const invitation = new AdminInvitation(
        'invitation-123',
        'newadmin@example.com',
        new AdminRole(AdminRoleType.ADMIN),
        'admin-456',
        new Date(),
        futureDate,
        AdminInvitationStatus.REVOKED, // Not pending
        'valid-code'
      );
      
      // Act
      const result = invitationService.validateInvitation(invitation, 'valid-code');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invitation is revoked');
    });
  });
  
  describe('canInviteWithRole', () => {
    it('should allow super admin to invite any role', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      const superAdminRole = new AdminRole(AdminRoleType.SUPER_ADMIN);
      const adminRole = new AdminRole(AdminRoleType.ADMIN);
      const moderatorRole = new AdminRole(AdminRoleType.MODERATOR);
      
      // Act & Assert
      expect(invitationService.canInviteWithRole(superAdminRole, superAdminRole)).toBe(true);
      expect(invitationService.canInviteWithRole(superAdminRole, adminRole)).toBe(true);
      expect(invitationService.canInviteWithRole(superAdminRole, moderatorRole)).toBe(true);
    });
    
    it('should allow admin to invite only moderators', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      const adminRole = new AdminRole(AdminRoleType.ADMIN);
      const moderatorRole = new AdminRole(AdminRoleType.MODERATOR);
      const superAdminRole = new AdminRole(AdminRoleType.SUPER_ADMIN);
      
      // Act & Assert
      expect(invitationService.canInviteWithRole(adminRole, moderatorRole)).toBe(true);
      expect(invitationService.canInviteWithRole(adminRole, adminRole)).toBe(false);
      expect(invitationService.canInviteWithRole(adminRole, superAdminRole)).toBe(false);
    });
    
    it('should not allow moderator to invite anyone', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      const moderatorRole = new AdminRole(AdminRoleType.MODERATOR);
      const adminRole = new AdminRole(AdminRoleType.ADMIN);
      const superAdminRole = new AdminRole(AdminRoleType.SUPER_ADMIN);
      
      // Act & Assert
      expect(invitationService.canInviteWithRole(moderatorRole, moderatorRole)).toBe(false);
      expect(invitationService.canInviteWithRole(moderatorRole, adminRole)).toBe(false);
      expect(invitationService.canInviteWithRole(moderatorRole, superAdminRole)).toBe(false);
    });
  });
  
  describe('validateInvitationData', () => {
    it('should validate correct email and role', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const result = invitationService.validateInvitationData('valid@example.com', 'admin');
      
      // Assert
      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
    
    it('should reject invalid email', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const result = invitationService.validateInvitationData('invalid-email', 'admin');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid email address');
    });
    
    it('should reject invalid role', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const result = invitationService.validateInvitationData('valid@example.com', 'invalid-role');
      
      // Assert
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Invalid role');
    });
  });
  
  describe('generateInvitationCode', () => {
    it('should generate an invitation code', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const code = invitationService.generateInvitationCode();
      
      // Assert
      expect(typeof code).toBe('string');
      expect(code.length).toBeGreaterThan(0);
    });
  });
});