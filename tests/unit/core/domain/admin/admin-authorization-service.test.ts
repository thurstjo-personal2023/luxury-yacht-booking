/**
 * Unit tests for AdminAuthorizationService
 */
import { describe, expect, it, beforeEach } from '@jest/globals';
import { AdminAuthorizationService, AuthorizationResult } from '../../../../../core/domain/admin/admin-authorization-service';
import { AdminUser } from '../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';
import { Permission, PermissionCategory, PermissionAction } from '../../../../../core/domain/admin/permission';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';

describe('AdminAuthorizationService', () => {
  let authorizationService: AdminAuthorizationService;
  
  beforeEach(() => {
    // Create authorization service
    authorizationService = new AdminAuthorizationService();
  });
  
  describe('verifyPermission', () => {
    it('should grant permission to an active admin with the required permission', () => {
      // Arrange
      const superAdmin = new AdminUser(
        'super-admin-123',
        'superadmin@example.com',
        'Super Admin',
        new AdminRole(AdminRoleType.SUPER_ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [
          new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.VIEW),
          new Permission(PermissionCategory.SYSTEM_SETTINGS, PermissionAction.EDIT)
        ],
        true,
        []
      );
      
      // Act
      const result = authorizationService.verifyPermission(
        superAdmin,
        PermissionCategory.SYSTEM_SETTINGS,
        PermissionAction.EDIT
      );
      
      // Assert
      expect(result.authorized).toBe(true);
    });
    
    it('should deny permission to an active admin without the required permission', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Regular Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [
          new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT)
        ],
        true,
        []
      );
      
      // Act
      const result = authorizationService.verifyPermission(
        admin,
        PermissionCategory.SYSTEM_SETTINGS,
        PermissionAction.EDIT
      );
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toContain('Missing permission');
    });
    
    it('should deny permission to an inactive admin', () => {
      // Arrange
      const inactiveAdmin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Inactive Admin',
        new AdminRole(AdminRoleType.ADMIN),
        false, // inactive
        new MfaStatus(MfaStatusType.ENABLED),
        [
          new Permission(PermissionCategory.SYSTEM_SETTINGS, PermissionAction.EDIT)
        ],
        true,
        []
      );
      
      // Act
      const result = authorizationService.verifyPermission(
        inactiveAdmin,
        PermissionCategory.SYSTEM_SETTINGS,
        PermissionAction.EDIT
      );
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Account is not active');
    });
  });
  
  describe('verifyAnyPermission', () => {
    it('should allow access if admin has at least one of the required permissions', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [
          new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT)
        ],
        true,
        []
      );
      
      // Act
      const result = authorizationService.verifyAnyPermission(
        admin,
        [
          { category: PermissionCategory.SYSTEM_SETTINGS, action: PermissionAction.EDIT },
          { category: PermissionCategory.CONTENT_MANAGEMENT, action: PermissionAction.EDIT }
        ]
      );
      
      // Assert
      expect(result.authorized).toBe(true);
    });
    
    it('should deny access if admin has none of the required permissions', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [
          new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW)
        ],
        true,
        []
      );
      
      // Act
      const result = authorizationService.verifyAnyPermission(
        admin,
        [
          { category: PermissionCategory.SYSTEM_SETTINGS, action: PermissionAction.EDIT },
          { category: PermissionCategory.CONTENT_MANAGEMENT, action: PermissionAction.EDIT }
        ]
      );
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Missing required permissions');
    });
  });
  
  describe('validateRole', () => {
    it('should grant access to super_admin when the required role is super_admin', () => {
      // Arrange
      const superAdmin = new AdminUser(
        'super-admin-123',
        'superadmin@example.com',
        'Super Admin',
        new AdminRole(AdminRoleType.SUPER_ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        []
      );
      
      // Act
      const result = authorizationService.validateRole(superAdmin, 'super_admin');
      
      // Assert
      expect(result.authorized).toBe(true);
    });
    
    it('should grant access to super_admin when the required role is admin', () => {
      // Arrange
      const superAdmin = new AdminUser(
        'super-admin-123',
        'superadmin@example.com',
        'Super Admin',
        new AdminRole(AdminRoleType.SUPER_ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        []
      );
      
      // Act
      const result = authorizationService.validateRole(superAdmin, 'admin');
      
      // Assert
      expect(result.authorized).toBe(true);
    });
    
    it('should deny access to admin when the required role is super_admin', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        []
      );
      
      // Act
      const result = authorizationService.validateRole(admin, 'super_admin');
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Requires super_admin role');
    });
    
    it('should deny access to moderator when the required role is admin', () => {
      // Arrange
      const moderator = new AdminUser(
        'mod-123',
        'mod@example.com',
        'Moderator',
        new AdminRole(AdminRoleType.MODERATOR),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        []
      );
      
      // Act
      const result = authorizationService.validateRole(moderator, 'admin');
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('Requires admin role');
    });
  });
  
  describe('checkIpAllowed', () => {
    it('should allow access if the IP address is whitelisted', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        ['192.168.1.1', '10.0.0.1']
      );
      
      // Act
      const result = authorizationService.checkIpAllowed(admin, '192.168.1.1');
      
      // Assert
      expect(result.authorized).toBe(true);
    });
    
    it('should deny access if the IP address is not whitelisted', () => {
      // Arrange
      const admin = new AdminUser(
        'admin-123',
        'admin@example.com',
        'Admin',
        new AdminRole(AdminRoleType.ADMIN),
        true,
        new MfaStatus(MfaStatusType.ENABLED),
        [],
        true,
        ['192.168.1.1', '10.0.0.1']
      );
      
      // Act
      const result = authorizationService.checkIpAllowed(admin, '172.16.0.1');
      
      // Assert
      expect(result.authorized).toBe(false);
      expect(result.reason).toBe('IP address is not authorized');
    });
  });
  
  describe('getDefaultPermissions', () => {
    it('should return a basic set of permissions for moderator role', () => {
      // Act
      const permissions = authorizationService.getDefaultPermissions('moderator');
      
      // Assert
      expect(permissions.length).toBeGreaterThan(0);
      // Check that it has view permissions
      const hasViewPermissions = permissions.some(p => 
        p.action === PermissionAction.VIEW && p.category === PermissionCategory.USER_MANAGEMENT);
      expect(hasViewPermissions).toBe(true);
    });
    
    it('should return extended permissions for admin role', () => {
      // Act
      const permissions = authorizationService.getDefaultPermissions('admin');
      
      // Assert
      expect(permissions.length).toBeGreaterThan(3);
      // Check that it has edit permissions
      const hasEditPermissions = permissions.some(p => 
        p.action === PermissionAction.EDIT && p.category === PermissionCategory.CONTENT_MANAGEMENT);
      expect(hasEditPermissions).toBe(true);
    });
    
    it('should return all permissions for super_admin role', () => {
      // Act
      const permissions = authorizationService.getDefaultPermissions('super_admin');
      
      // Assert
      expect(permissions.length).toBeGreaterThan(7);
      // Check that it has delete permissions
      const hasDeletePermissions = permissions.some(p => 
        p.action === PermissionAction.DELETE && p.category === PermissionCategory.USER_MANAGEMENT);
      expect(hasDeletePermissions).toBe(true);
    });
  });
});