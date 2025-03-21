/**
 * Admin Authorization Service
 * 
 * Domain service for admin authorization operations.
 * This service contains pure business logic without external dependencies.
 */

import { AdminUser } from './admin-user';
import { Permission, PermissionAction, PermissionCategory } from './permission';

/**
 * Result of an authorization check
 */
export interface AuthorizationResult {
  authorized: boolean;
  reason?: string;
}

/**
 * Admin authorization service
 */
export class AdminAuthorizationService {
  /**
   * Verify if an admin has a specific permission
   * @param admin The admin user
   * @param category Permission category
   * @param action Permission action
   * @returns Authorization result
   */
  verifyPermission(
    admin: AdminUser,
    category: PermissionCategory,
    action: PermissionAction
  ): AuthorizationResult {
    // Check if the admin is active
    if (!admin.isActive()) {
      return {
        authorized: false,
        reason: 'Account is not active'
      };
    }

    // Create the permission to check
    const permission = new Permission(category, action);

    // Check if admin has the permission
    const hasPermission = admin.hasPermission(permission);

    if (!hasPermission) {
      return {
        authorized: false,
        reason: `Missing permission: ${permission.toString()}`
      };
    }

    return {
      authorized: true
    };
  }

  /**
   * Verify if an admin has one of the specified permissions
   * @param admin The admin user
   * @param permissions List of permissions to check
   * @returns Authorization result
   */
  verifyAnyPermission(
    admin: AdminUser,
    permissions: { category: PermissionCategory; action: PermissionAction }[]
  ): AuthorizationResult {
    // Check if the admin is active
    if (!admin.isActive()) {
      return {
        authorized: false,
        reason: 'Account is not active'
      };
    }

    // Check each permission
    for (const { category, action } of permissions) {
      const permission = new Permission(category, action);
      if (admin.hasPermission(permission)) {
        return {
          authorized: true
        };
      }
    }

    // If we get here, the admin doesn't have any of the permissions
    return {
      authorized: false,
      reason: 'Missing required permissions'
    };
  }

  /**
   * Validate if an admin has the required role
   * @param admin The admin user
   * @param requiredRole The minimum required role
   * @returns Authorization result
   */
  validateRole(
    admin: AdminUser,
    requiredRole: 'super_admin' | 'admin' | 'moderator'
  ): AuthorizationResult {
    // Check if the admin is active
    if (!admin.isActive()) {
      return {
        authorized: false,
        reason: 'Account is not active'
      };
    }

    let hasRequiredRole = false;

    switch (requiredRole) {
      case 'super_admin':
        hasRequiredRole = admin.role.isSuperAdmin();
        break;
      case 'admin':
        hasRequiredRole = admin.role.isAdmin();
        break;
      case 'moderator':
        hasRequiredRole = admin.role.isModerator();
        break;
    }

    if (!hasRequiredRole) {
      return {
        authorized: false,
        reason: `Requires ${requiredRole} role`
      };
    }

    return {
      authorized: true
    };
  }

  /**
   * Check if an IP address is allowed for an admin
   * @param admin The admin user
   * @param ipAddress The IP address to check
   * @returns Authorization result
   */
  checkIpAllowed(
    admin: AdminUser,
    ipAddress: string
  ): AuthorizationResult {
    // Check if the admin is active
    if (!admin.isActive()) {
      return {
        authorized: false,
        reason: 'Account is not active'
      };
    }

    // Check if IP is whitelisted
    const isWhitelisted = admin.isIpWhitelisted(ipAddress);

    if (!isWhitelisted) {
      return {
        authorized: false,
        reason: 'IP address is not authorized'
      };
    }

    return {
      authorized: true
    };
  }

  /**
   * Get default permissions for a role
   * @param role Role name
   * @returns Array of default permissions
   */
  getDefaultPermissions(role: string): Permission[] {
    const permissions: Permission[] = [];
    
    // Common permissions for all roles
    permissions.push(new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.VIEW));
    permissions.push(new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.VIEW));
    permissions.push(new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.VIEW));
    
    // For admin and super_admin
    if (role === 'admin' || role === 'super_admin') {
      permissions.push(new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.CREATE));
      permissions.push(new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.EDIT));
      permissions.push(new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.CREATE));
      permissions.push(new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.EDIT));
      permissions.push(new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.CREATE));
      permissions.push(new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.EDIT));
      permissions.push(new Permission(PermissionCategory.ANALYTICS, PermissionAction.VIEW));
    }
    
    // For super_admin only
    if (role === 'super_admin') {
      permissions.push(new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.DELETE));
      permissions.push(new Permission(PermissionCategory.USER_MANAGEMENT, PermissionAction.APPROVE));
      permissions.push(new Permission(PermissionCategory.CONTENT_MANAGEMENT, PermissionAction.DELETE));
      permissions.push(new Permission(PermissionCategory.MEDIA_MANAGEMENT, PermissionAction.DELETE));
      permissions.push(new Permission(PermissionCategory.SYSTEM_SETTINGS, PermissionAction.VIEW));
      permissions.push(new Permission(PermissionCategory.SYSTEM_SETTINGS, PermissionAction.EDIT));
    }
    
    return permissions;
  }
}