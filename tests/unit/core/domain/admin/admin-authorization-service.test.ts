/**
 * Unit tests for AdminAuthorizationService
 */
import { describe, expect, it, beforeEach } from '@jest/globals';
import { AdminAuthorizationService } from '../../../../../core/domain/admin/admin-authorization-service';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { Permission } from '../../../../../core/domain/admin/permission';

describe('AdminAuthorizationService', () => {
  let authorizationService: AdminAuthorizationService;
  
  beforeEach(() => {
    // Create authorization service
    authorizationService = new AdminAuthorizationService();
  });
  
  describe('hasPermission', () => {
    it('should grant all permissions to super admin', () => {
      // Arrange
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      // Act & Assert
      expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_ADMINS)).toBe(true);
      expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_CONTENT)).toBe(true);
      expect(authorizationService.hasPermission(superAdmin, Permission.VIEW_ANALYTICS)).toBe(true);
      expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_MEDIA)).toBe(true);
      expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_SETTINGS)).toBe(true);
    });
    
    it('should grant limited permissions to admin', () => {
      // Arrange
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      // Act & Assert
      expect(authorizationService.hasPermission(admin, Permission.MANAGE_ADMINS)).toBe(false);
      expect(authorizationService.hasPermission(admin, Permission.MANAGE_CONTENT)).toBe(true);
      expect(authorizationService.hasPermission(admin, Permission.VIEW_ANALYTICS)).toBe(true);
      expect(authorizationService.hasPermission(admin, Permission.MANAGE_MEDIA)).toBe(true);
      expect(authorizationService.hasPermission(admin, Permission.MANAGE_SETTINGS)).toBe(false);
    });
    
    it('should grant minimal permissions to moderator', () => {
      // Arrange
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      // Act & Assert
      expect(authorizationService.hasPermission(moderator, Permission.MANAGE_ADMINS)).toBe(false);
      expect(authorizationService.hasPermission(moderator, Permission.MANAGE_CONTENT)).toBe(false);
      expect(authorizationService.hasPermission(moderator, Permission.VIEW_ANALYTICS)).toBe(true);
      expect(authorizationService.hasPermission(moderator, Permission.MANAGE_MEDIA)).toBe(false);
      expect(authorizationService.hasPermission(moderator, Permission.MANAGE_SETTINGS)).toBe(false);
    });
  });
  
  describe('canManageUser', () => {
    it('should allow super admin to manage any user', () => {
      // Arrange
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const otherSuperAdmin = new AdminUser({
        id: 'other-super-admin',
        email: 'othersuperadmin@example.com',
        name: 'Other Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      // Act & Assert
      expect(authorizationService.canManageUser(superAdmin, otherSuperAdmin)).toBe(true);
      expect(authorizationService.canManageUser(superAdmin, admin)).toBe(true);
      expect(authorizationService.canManageUser(superAdmin, moderator)).toBe(true);
    });
    
    it('should allow admin to manage only moderators', () => {
      // Arrange
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const otherAdmin = new AdminUser({
        id: 'other-admin',
        email: 'otheradmin@example.com',
        name: 'Other Admin',
        role: AdminRole.ADMIN
      });
      
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      // Act & Assert
      expect(authorizationService.canManageUser(admin, superAdmin)).toBe(false);
      expect(authorizationService.canManageUser(admin, otherAdmin)).toBe(false);
      expect(authorizationService.canManageUser(admin, moderator)).toBe(true);
    });
    
    it('should not allow moderator to manage any user', () => {
      // Arrange
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      const otherModerator = new AdminUser({
        id: 'other-moderator',
        email: 'othermoderator@example.com',
        name: 'Other Moderator',
        role: AdminRole.MODERATOR
      });
      
      // Act & Assert
      expect(authorizationService.canManageUser(moderator, superAdmin)).toBe(false);
      expect(authorizationService.canManageUser(moderator, admin)).toBe(false);
      expect(authorizationService.canManageUser(moderator, otherModerator)).toBe(false);
    });
  });
  
  describe('canCreateInvitationWithRole', () => {
    it('should allow super admin to create invitations for any role', () => {
      // Arrange
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      // Act & Assert
      expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.SUPER_ADMIN)).toBe(true);
      expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.ADMIN)).toBe(true);
      expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.MODERATOR)).toBe(true);
    });
    
    it('should allow admin to create invitations only for moderators', () => {
      // Arrange
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      // Act & Assert
      expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.SUPER_ADMIN)).toBe(false);
      expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.ADMIN)).toBe(false);
      expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.MODERATOR)).toBe(true);
    });
    
    it('should not allow moderator to create any invitations', () => {
      // Arrange
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      // Act & Assert
      expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.SUPER_ADMIN)).toBe(false);
      expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.ADMIN)).toBe(false);
      expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.MODERATOR)).toBe(false);
    });
  });
  
  describe('canApproveUser', () => {
    it('should allow super admin to approve any role', () => {
      // Arrange
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const pendingSuperAdmin = new AdminUser({
        id: 'pending-super-admin',
        email: 'pendingsuperadmin@example.com',
        name: 'Pending Super Admin',
        role: AdminRole.SUPER_ADMIN,
        isApproved: false
      });
      
      const pendingAdmin = new AdminUser({
        id: 'pending-admin',
        email: 'pendingadmin@example.com',
        name: 'Pending Admin',
        role: AdminRole.ADMIN,
        isApproved: false
      });
      
      const pendingModerator = new AdminUser({
        id: 'pending-moderator',
        email: 'pendingmoderator@example.com',
        name: 'Pending Moderator',
        role: AdminRole.MODERATOR,
        isApproved: false
      });
      
      // Act & Assert
      expect(authorizationService.canApproveUser(superAdmin, pendingSuperAdmin)).toBe(true);
      expect(authorizationService.canApproveUser(superAdmin, pendingAdmin)).toBe(true);
      expect(authorizationService.canApproveUser(superAdmin, pendingModerator)).toBe(true);
    });
    
    it('should allow admin to approve only moderators', () => {
      // Arrange
      const admin = new AdminUser({
        id: 'admin-123',
        email: 'admin@example.com',
        name: 'Regular Admin',
        role: AdminRole.ADMIN
      });
      
      const pendingSuperAdmin = new AdminUser({
        id: 'pending-super-admin',
        email: 'pendingsuperadmin@example.com',
        name: 'Pending Super Admin',
        role: AdminRole.SUPER_ADMIN,
        isApproved: false
      });
      
      const pendingAdmin = new AdminUser({
        id: 'pending-admin',
        email: 'pendingadmin@example.com',
        name: 'Pending Admin',
        role: AdminRole.ADMIN,
        isApproved: false
      });
      
      const pendingModerator = new AdminUser({
        id: 'pending-moderator',
        email: 'pendingmoderator@example.com',
        name: 'Pending Moderator',
        role: AdminRole.MODERATOR,
        isApproved: false
      });
      
      // Act & Assert
      expect(authorizationService.canApproveUser(admin, pendingSuperAdmin)).toBe(false);
      expect(authorizationService.canApproveUser(admin, pendingAdmin)).toBe(false);
      expect(authorizationService.canApproveUser(admin, pendingModerator)).toBe(true);
    });
    
    it('should not allow moderator to approve any user', () => {
      // Arrange
      const moderator = new AdminUser({
        id: 'moderator-123',
        email: 'moderator@example.com',
        name: 'Moderator',
        role: AdminRole.MODERATOR
      });
      
      const pendingSuperAdmin = new AdminUser({
        id: 'pending-super-admin',
        email: 'pendingsuperadmin@example.com',
        name: 'Pending Super Admin',
        role: AdminRole.SUPER_ADMIN,
        isApproved: false
      });
      
      const pendingAdmin = new AdminUser({
        id: 'pending-admin',
        email: 'pendingadmin@example.com',
        name: 'Pending Admin',
        role: AdminRole.ADMIN,
        isApproved: false
      });
      
      const pendingModerator = new AdminUser({
        id: 'pending-moderator',
        email: 'pendingmoderator@example.com',
        name: 'Pending Moderator',
        role: AdminRole.MODERATOR,
        isApproved: false
      });
      
      // Act & Assert
      expect(authorizationService.canApproveUser(moderator, pendingSuperAdmin)).toBe(false);
      expect(authorizationService.canApproveUser(moderator, pendingAdmin)).toBe(false);
      expect(authorizationService.canApproveUser(moderator, pendingModerator)).toBe(false);
    });
    
    it('should not allow approving already approved users', () => {
      // Arrange
      const superAdmin = new AdminUser({
        id: 'super-admin-123',
        email: 'superadmin@example.com',
        name: 'Super Admin',
        role: AdminRole.SUPER_ADMIN
      });
      
      const approvedAdmin = new AdminUser({
        id: 'approved-admin',
        email: 'approvedadmin@example.com',
        name: 'Approved Admin',
        role: AdminRole.ADMIN,
        isApproved: true
      });
      
      // Act & Assert
      expect(authorizationService.canApproveUser(superAdmin, approvedAdmin)).toBe(false);
    });
  });
});