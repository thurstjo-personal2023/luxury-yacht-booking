/**
 * Unit tests for AdminUser entity
 */
import { describe, expect, it } from '@jest/globals';
import { AdminUser, AdminUserStatus, AdminLoginAttempt } from '../../../../../core/domain/admin/admin-user';
import { AdminRole, AdminRoleType } from '../../../../../core/domain/admin/admin-role';
import { MfaStatus, MfaStatusType } from '../../../../../core/domain/admin/mfa-status';
import { Permission, PermissionCategory, PermissionAction } from '../../../../../core/domain/admin/permission';

describe('AdminUser Entity', () => {
  it('should create an admin user with valid properties', () => {
    // Arrange
    const id = 'admin-123';
    const email = 'admin@example.com';
    const name = 'Test Admin';
    const role = new AdminRole(AdminRoleType.ADMIN);
    const permissions = [
      new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW),
      new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.VIEW)
    ];
    const mfaStatus = new MfaStatus(MfaStatusType.ENABLED);
    const status = AdminUserStatus.ACTIVE;
    const createdAt = new Date();
    const updatedAt = new Date();
    const lastLoginAt = new Date();
    const loginAttempts: AdminLoginAttempt[] = [{
      timestamp: new Date(),
      ipAddress: '127.0.0.1',
      successful: true,
      userAgent: 'Jest Test'
    }];
    const whitelistedIps = ['127.0.0.1'];
    
    // Act
    const adminUser = new AdminUser(
      id,
      email,
      name,
      role,
      permissions,
      mfaStatus,
      status,
      createdAt,
      updatedAt,
      lastLoginAt,
      loginAttempts,
      whitelistedIps
    );
    
    // Assert
    expect(adminUser.id).toBe(id);
    expect(adminUser.email).toBe(email);
    expect(adminUser.name).toBe(name);
    expect(adminUser.role).toBe(role);
    expect(adminUser.permissions).toEqual(permissions);
    expect(adminUser.mfaStatus).toBe(mfaStatus);
    expect(adminUser.status).toBe(status);
    expect(adminUser.createdAt).toEqual(createdAt);
    expect(adminUser.updatedAt).toEqual(updatedAt);
    expect(adminUser.lastLoginAt).toEqual(lastLoginAt);
    expect(adminUser.lastLoginAttempts).toEqual(loginAttempts);
    expect(adminUser.whitelistedIps).toEqual(whitelistedIps);
  });
  
  it('should correctly check if admin is active', () => {
    // Arrange
    const activeAdmin = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const pendingAdmin = new AdminUser(
      'admin-456',
      'admin2@example.com',
      'Test Admin 2',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.PENDING_APPROVAL,
      new Date(),
      new Date()
    );
    
    const disabledAdmin = new AdminUser(
      'admin-789',
      'admin3@example.com',
      'Test Admin 3',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.DISABLED,
      new Date(),
      new Date()
    );
    
    // Act & Assert
    expect(activeAdmin.isActive()).toBe(true);
    expect(pendingAdmin.isActive()).toBe(false);
    expect(disabledAdmin.isActive()).toBe(false);
  });
  
  it('should check if admin has a specific permission', () => {
    // Arrange
    const viewPermission = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW);
    const editPermission = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT);
    const deletePermission = new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.DELETE);
    
    const adminWithPermissions = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [viewPermission, editPermission],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const superAdmin = new AdminUser(
      'admin-456',
      'superadmin@example.com',
      'Super Admin',
      new AdminRole(AdminRoleType.SUPER_ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    // Act & Assert
    expect(adminWithPermissions.hasPermission(viewPermission)).toBe(true);
    expect(adminWithPermissions.hasPermission(editPermission)).toBe(true);
    expect(adminWithPermissions.hasPermission(deletePermission)).toBe(false);
    
    // Super admin has all permissions implicitly
    expect(superAdmin.hasPermission(viewPermission)).toBe(true);
    expect(superAdmin.hasPermission(editPermission)).toBe(true);
    expect(superAdmin.hasPermission(deletePermission)).toBe(true);
  });
  
  it('should update admin properties correctly', () => {
    // Arrange
    const admin = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const initialUpdatedAt = admin.updatedAt;
    
    // Wait to ensure timestamps are different
    jest.advanceTimersByTime(1000);
    
    // Act
    admin.updateName('Updated Admin');
    admin.updateEmail('updated@example.com');
    admin.updateRole(new AdminRole(AdminRoleType.SUPER_ADMIN));
    admin.updateMfaStatus(new MfaStatus(MfaStatusType.ENABLED));
    admin.updateStatus(AdminUserStatus.DISABLED);
    
    // Assert
    expect(admin.name).toBe('Updated Admin');
    expect(admin.email).toBe('updated@example.com');
    expect(admin.role.type).toBe(AdminRoleType.SUPER_ADMIN);
    expect(admin.mfaStatus.type).toBe(MfaStatusType.ENABLED);
    expect(admin.status).toBe(AdminUserStatus.DISABLED);
    expect(admin.updatedAt.getTime()).toBeGreaterThan(initialUpdatedAt.getTime());
  });
  
  it('should correctly check if admin requires MFA', () => {
    // Arrange
    const adminRequiresMfa = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.REQUIRED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const adminWithEnabledMfa = new AdminUser(
      'admin-456',
      'admin2@example.com',
      'Test Admin 2',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const adminWithDisabledMfa = new AdminUser(
      'admin-789',
      'admin3@example.com',
      'Test Admin 3',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.DISABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    // Act & Assert
    expect(adminRequiresMfa.requiresMfa()).toBe(true);
    expect(adminWithEnabledMfa.requiresMfa()).toBe(false);
    expect(adminWithDisabledMfa.requiresMfa()).toBe(false);
  });
  
  it('should correctly handle login attempts', () => {
    // Arrange
    const admin = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const loginAttempt: AdminLoginAttempt = {
      timestamp: new Date(),
      ipAddress: '192.168.0.1',
      successful: true,
      userAgent: 'Test Browser'
    };
    
    // Act
    admin.addLoginAttempt(loginAttempt);
    
    // Assert
    expect(admin.lastLoginAttempts.length).toBe(1);
    expect(admin.lastLoginAttempts[0].ipAddress).toBe('192.168.0.1');
    expect(admin.lastLoginAt).toEqual(loginAttempt.timestamp);
  });
  
  it('should handle IP whitelisting correctly', () => {
    // Arrange
    const admin = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date(),
      undefined,
      [],
      ['192.168.0.1', '10.0.0.1']
    );
    
    // Act & Assert
    expect(admin.isIpWhitelisted('192.168.0.1')).toBe(true);
    expect(admin.isIpWhitelisted('10.0.0.1')).toBe(true);
    expect(admin.isIpWhitelisted('8.8.8.8')).toBe(false);
    
    // Test with no whitelist (allow all)
    const adminNoWhitelist = new AdminUser(
      'admin-456',
      'admin2@example.com',
      'Test Admin 2',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date(),
      undefined,
      [],
      []
    );
    
    expect(adminNoWhitelist.isIpWhitelisted('8.8.8.8')).toBe(true);
  });
  
  it('should correctly check if admin can approve others', () => {
    // Arrange
    const superAdmin = new AdminUser(
      'admin-123',
      'superadmin@example.com',
      'Super Admin',
      new AdminRole(AdminRoleType.SUPER_ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    const regularAdmin = new AdminUser(
      'admin-456',
      'admin@example.com',
      'Regular Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    // Act & Assert
    expect(superAdmin.canApproveAdmins()).toBe(true);
    expect(regularAdmin.canApproveAdmins()).toBe(false);
  });
  
  it('should serialize to and deserialize from data objects', () => {
    // Arrange
    const original = new AdminUser(
      'admin-123',
      'admin@example.com',
      'Test Admin',
      new AdminRole(AdminRoleType.ADMIN),
      [
        new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW),
        new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.EDIT)
      ],
      new MfaStatus(MfaStatusType.ENABLED),
      AdminUserStatus.ACTIVE,
      new Date(),
      new Date()
    );
    
    // Act
    const data = original.toData();
    const recreated = AdminUser.fromData(data);
    
    // Assert
    expect(recreated.id).toBe(original.id);
    expect(recreated.email).toBe(original.email);
    expect(recreated.name).toBe(original.name);
    expect(recreated.role.type).toBe(original.role.type);
    expect(recreated.status).toBe(original.status);
    expect(recreated.mfaStatus.type).toBe(original.mfaStatus.type);
    expect(recreated.permissions.length).toBe(original.permissions.length);
  });
});