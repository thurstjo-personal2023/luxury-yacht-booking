/**
 * Unit tests for AdminAuthorizationService
 */
import { describe, expect, it } from '@jest/globals';
import { AdminAuthorizationService } from '../../../../../core/domain/admin/admin-authorization-service';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole } from '../../../../../core/domain/admin/admin-role';
import { Permission } from '../../../../../core/domain/admin/permission';

describe('AdminAuthorizationService', () => {
  let authorizationService: AdminAuthorizationService;
  
  beforeEach(() => {
    authorizationService = new AdminAuthorizationService();
  });
  
  it('should check if user has a specific permission', () => {
    // Arrange
    const superAdmin = new AdminUser({
      id: 'super-admin',
      email: 'super@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN
    });
    
    const admin = new AdminUser({
      id: 'admin',
      email: 'admin@example.com',
      name: 'Regular Admin',
      role: AdminRole.ADMIN
    });
    
    const moderator = new AdminUser({
      id: 'moderator',
      email: 'mod@example.com',
      name: 'Moderator',
      role: AdminRole.MODERATOR
    });
    
    // Act & Assert
    
    // Super admin should have all permissions
    expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_ADMINS)).toBe(true);
    expect(authorizationService.hasPermission(superAdmin, Permission.MANAGE_CONTENT)).toBe(true);
    expect(authorizationService.hasPermission(superAdmin, Permission.VIEW_ANALYTICS)).toBe(true);
    
    // Admin should have manage content and view analytics, but not manage admins
    expect(authorizationService.hasPermission(admin, Permission.MANAGE_ADMINS)).toBe(false);
    expect(authorizationService.hasPermission(admin, Permission.MANAGE_CONTENT)).toBe(true);
    expect(authorizationService.hasPermission(admin, Permission.VIEW_ANALYTICS)).toBe(true);
    
    // Moderator should only have view analytics
    expect(authorizationService.hasPermission(moderator, Permission.MANAGE_ADMINS)).toBe(false);
    expect(authorizationService.hasPermission(moderator, Permission.MANAGE_CONTENT)).toBe(false);
    expect(authorizationService.hasPermission(moderator, Permission.VIEW_ANALYTICS)).toBe(true);
  });
  
  it('should check if user can manage another user based on roles', () => {
    // Arrange
    const superAdmin = new AdminUser({
      id: 'super-admin',
      email: 'super@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN
    });
    
    const admin = new AdminUser({
      id: 'admin',
      email: 'admin@example.com',
      name: 'Regular Admin',
      role: AdminRole.ADMIN
    });
    
    const moderator = new AdminUser({
      id: 'moderator',
      email: 'mod@example.com',
      name: 'Moderator',
      role: AdminRole.MODERATOR
    });
    
    // Act & Assert
    
    // Super admin can manage everyone
    expect(authorizationService.canManageUser(superAdmin, admin)).toBe(true);
    expect(authorizationService.canManageUser(superAdmin, moderator)).toBe(true);
    expect(authorizationService.canManageUser(superAdmin, superAdmin)).toBe(false); // Can't manage self
    
    // Admin can manage moderators but not super admins or other admins
    expect(authorizationService.canManageUser(admin, superAdmin)).toBe(false);
    expect(authorizationService.canManageUser(admin, admin)).toBe(false);
    expect(authorizationService.canManageUser(admin, moderator)).toBe(true);
    
    // Moderator can't manage anyone
    expect(authorizationService.canManageUser(moderator, superAdmin)).toBe(false);
    expect(authorizationService.canManageUser(moderator, admin)).toBe(false);
    expect(authorizationService.canManageUser(moderator, moderator)).toBe(false);
  });
  
  it('should check if user can create invitations with specific roles', () => {
    // Arrange
    const superAdmin = new AdminUser({
      id: 'super-admin',
      email: 'super@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN
    });
    
    const admin = new AdminUser({
      id: 'admin',
      email: 'admin@example.com',
      name: 'Regular Admin',
      role: AdminRole.ADMIN
    });
    
    const moderator = new AdminUser({
      id: 'moderator',
      email: 'mod@example.com',
      name: 'Moderator',
      role: AdminRole.MODERATOR
    });
    
    // Act & Assert
    
    // Super admin can create invitations for all roles
    expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.SUPER_ADMIN)).toBe(true);
    expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.ADMIN)).toBe(true);
    expect(authorizationService.canCreateInvitationWithRole(superAdmin, AdminRole.MODERATOR)).toBe(true);
    
    // Admin can create invitations for moderators only
    expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.SUPER_ADMIN)).toBe(false);
    expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.ADMIN)).toBe(false);
    expect(authorizationService.canCreateInvitationWithRole(admin, AdminRole.MODERATOR)).toBe(true);
    
    // Moderator can't create any invitations
    expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.SUPER_ADMIN)).toBe(false);
    expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.ADMIN)).toBe(false);
    expect(authorizationService.canCreateInvitationWithRole(moderator, AdminRole.MODERATOR)).toBe(false);
  });
  
  it('should check if user can approve another user', () => {
    // Arrange
    const superAdmin = new AdminUser({
      id: 'super-admin',
      email: 'super@example.com',
      name: 'Super Admin',
      role: AdminRole.SUPER_ADMIN
    });
    
    const admin = new AdminUser({
      id: 'admin',
      email: 'admin@example.com',
      name: 'Regular Admin',
      role: AdminRole.ADMIN
    });
    
    const moderator = new AdminUser({
      id: 'moderator',
      email: 'mod@example.com',
      name: 'Moderator',
      role: AdminRole.MODERATOR
    });
    
    const pendingSuperAdmin = new AdminUser({
      id: 'pending-super',
      email: 'pending-super@example.com',
      name: 'Pending Super Admin',
      role: AdminRole.SUPER_ADMIN,
      isApproved: false
    });
    
    const pendingAdmin = new AdminUser({
      id: 'pending-admin',
      email: 'pending-admin@example.com',
      name: 'Pending Admin',
      role: AdminRole.ADMIN,
      isApproved: false
    });
    
    const pendingModerator = new AdminUser({
      id: 'pending-mod',
      email: 'pending-mod@example.com',
      name: 'Pending Moderator',
      role: AdminRole.MODERATOR,
      isApproved: false
    });
    
    // Act & Assert
    
    // Super admin can approve all pending users
    expect(authorizationService.canApproveUser(superAdmin, pendingSuperAdmin)).toBe(true);
    expect(authorizationService.canApproveUser(superAdmin, pendingAdmin)).toBe(true);
    expect(authorizationService.canApproveUser(superAdmin, pendingModerator)).toBe(true);
    
    // Admin can approve only pending moderators
    expect(authorizationService.canApproveUser(admin, pendingSuperAdmin)).toBe(false);
    expect(authorizationService.canApproveUser(admin, pendingAdmin)).toBe(false);
    expect(authorizationService.canApproveUser(admin, pendingModerator)).toBe(true);
    
    // Moderator can't approve anyone
    expect(authorizationService.canApproveUser(moderator, pendingSuperAdmin)).toBe(false);
    expect(authorizationService.canApproveUser(moderator, pendingAdmin)).toBe(false);
    expect(authorizationService.canApproveUser(moderator, pendingModerator)).toBe(false);
    
    // No one can approve users that are already approved
    const approvedAdmin = new AdminUser({
      id: 'approved-admin',
      email: 'approved@example.com',
      name: 'Approved Admin',
      role: AdminRole.ADMIN,
      isApproved: true
    });
    
    expect(authorizationService.canApproveUser(superAdmin, approvedAdmin)).toBe(false);
  });
});