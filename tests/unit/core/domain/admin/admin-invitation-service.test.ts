/**
 * Unit tests for AdminInvitationService
 */
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { AdminInvitationService } from '../../../../../core/domain/admin/admin-invitation-service';
import { AdminInvitation } from '../../../../../core/domain/admin/admin-invitation';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';

describe('AdminInvitationService', () => {
  describe('createInvitationData', () => {
    it('should create invitation data with default expiration time', () => {
      // Arrange
      const randomStringGenerator = {
        generateRandomString: jest.fn().mockReturnValue('generated-code')
      };
      
      const invitationService = new AdminInvitationService(randomStringGenerator);
      
      const email = 'admin@example.com';
      const name = 'Test Admin';
      const role = AdminRole.ADMIN;
      const invitedById = 'inviter-123';
      
      // Act
      const invitation = invitationService.createInvitationData({
        email,
        name,
        role,
        invitedById,
      });
      
      // Assert
      expect(invitation.email).toBe(email);
      expect(invitation.name).toBe(name);
      expect(invitation.role).toBe(role);
      expect(invitation.invitedById).toBe(invitedById);
      expect(invitation.code).toBe('generated-code');
      expect(invitation.expiresAt).toBeInstanceOf(Date);
      
      // Should expire in 7 days by default
      const expectedExpiration = new Date();
      expectedExpiration.setDate(expectedExpiration.getDate() + 7);
      expect(invitation.expiresAt?.getDate()).toBe(expectedExpiration.getDate());
      
      expect(randomStringGenerator.generateRandomString).toHaveBeenCalledWith(16);
    });
    
    it('should create invitation data with custom expiration time', () => {
      // Arrange
      const randomStringGenerator = {
        generateRandomString: jest.fn().mockReturnValue('generated-code')
      };
      
      const invitationService = new AdminInvitationService(randomStringGenerator);
      
      const email = 'admin@example.com';
      const name = 'Test Admin';
      const role = AdminRole.ADMIN;
      const invitedById = 'inviter-123';
      const expirationDays = 30;
      
      // Act
      const invitation = invitationService.createInvitationData({
        email,
        name,
        role,
        invitedById,
        expirationDays
      });
      
      // Assert
      expect(invitation.email).toBe(email);
      expect(invitation.name).toBe(name);
      expect(invitation.role).toBe(role);
      expect(invitation.invitedById).toBe(invitedById);
      expect(invitation.code).toBe('generated-code');
      expect(invitation.expiresAt).toBeInstanceOf(Date);
      
      // Should expire in 30 days
      const expectedExpiration = new Date();
      expectedExpiration.setDate(expectedExpiration.getDate() + 30);
      expect(invitation.expiresAt?.getDate()).toBe(expectedExpiration.getDate());
    });
  });
  
  describe('verifyInvitation', () => {
    it('should verify valid invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in future
      });
      
      // Act
      const result = invitationService.verifyInvitation(invitation, 'valid-code');
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should reject invitation with incorrect code', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 1 day in future
      });
      
      // Act
      const result = invitationService.verifyInvitation(invitation, 'invalid-code');
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should reject expired invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code',
        expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000) // 1 day in past
      });
      
      // Act
      const result = invitationService.verifyInvitation(invitation, 'valid-code');
      
      // Assert
      expect(result).toBe(false);
    });
  });
  
  describe('isInvitationExpired', () => {
    it('should return true for expired invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // 1 day ago
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code',
        expiresAt: pastDate
      });
      
      // Act
      const result = invitationService.isInvitationExpired(invitation);
      
      // Assert
      expect(result).toBe(true);
    });
    
    it('should return false for valid invitation', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1); // 1 day in future
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code',
        expiresAt: futureDate
      });
      
      // Act
      const result = invitationService.isInvitationExpired(invitation);
      
      // Assert
      expect(result).toBe(false);
    });
    
    it('should return true if expiration date is missing', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      const invitation = new AdminInvitation({
        id: 'invitation-123',
        email: 'admin@example.com',
        name: 'Test Admin',
        role: AdminRole.ADMIN,
        invitedById: 'inviter-123',
        code: 'valid-code'
        // No expiresAt
      });
      
      // Act
      const result = invitationService.isInvitationExpired(invitation);
      
      // Assert
      expect(result).toBe(true);
    });
  });
  
  describe('generateInvitationCode', () => {
    it('should generate random code with default length', () => {
      // Arrange
      const randomStringGenerator = {
        generateRandomString: jest.fn().mockReturnValue('abcdef1234567890')
      };
      
      const invitationService = new AdminInvitationService(randomStringGenerator);
      
      // Act
      const code = invitationService.generateInvitationCode();
      
      // Assert
      expect(code).toBe('abcdef1234567890');
      expect(randomStringGenerator.generateRandomString).toHaveBeenCalledWith(16);
    });
    
    it('should generate random code with custom length', () => {
      // Arrange
      const randomStringGenerator = {
        generateRandomString: jest.fn().mockReturnValue('abcdef1234')
      };
      
      const invitationService = new AdminInvitationService(randomStringGenerator);
      
      // Act
      const code = invitationService.generateInvitationCode(10);
      
      // Assert
      expect(code).toBe('abcdef1234');
      expect(randomStringGenerator.generateRandomString).toHaveBeenCalledWith(10);
    });
    
    it('should use internal random generator if not provided', () => {
      // Arrange
      const invitationService = new AdminInvitationService();
      
      // Act
      const code = invitationService.generateInvitationCode();
      
      // Assert
      expect(code).toHaveLength(16);
      expect(typeof code).toBe('string');
    });
  });
});