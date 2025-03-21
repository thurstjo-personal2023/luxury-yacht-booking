/**
 * User Role Enum
 * 
 * This defines the different roles that users can have in the system.
 */

/**
 * User roles
 */
export enum UserRole {
  CONSUMER = 'consumer',
  PRODUCER = 'producer',
  PARTNER = 'partner',
  ADMINISTRATOR = 'administrator',
  SUPER_ADMINISTRATOR = 'super_administrator'
}

/**
 * Get the permissions for a user role
 */
export function getRolePermissions(role: UserRole): string[] {
  const permissions: Record<UserRole, string[]> = {
    [UserRole.CONSUMER]: [
      'view_yacht_listings',
      'book_yacht',
      'view_own_bookings',
      'cancel_own_bookings',
      'update_own_profile'
    ],
    [UserRole.PRODUCER]: [
      'view_yacht_listings',
      'create_yacht_listings',
      'update_own_yacht_listings',
      'delete_own_yacht_listings',
      'view_own_bookings',
      'cancel_own_bookings',
      'update_own_profile',
      'view_own_analytics'
    ],
    [UserRole.PARTNER]: [
      'view_yacht_listings',
      'create_addons',
      'update_own_addons',
      'delete_own_addons',
      'view_own_bookings',
      'update_own_profile',
      'view_own_analytics'
    ],
    [UserRole.ADMINISTRATOR]: [
      'view_all_yacht_listings',
      'update_any_yacht_listing',
      'delete_any_yacht_listing',
      'view_all_bookings',
      'update_any_booking',
      'cancel_any_booking',
      'view_all_users',
      'update_any_user',
      'view_all_analytics',
      'validate_media',
      'repair_media'
    ],
    [UserRole.SUPER_ADMINISTRATOR]: [
      'view_all_yacht_listings',
      'update_any_yacht_listing',
      'delete_any_yacht_listing',
      'view_all_bookings',
      'update_any_booking',
      'cancel_any_booking',
      'view_all_users',
      'update_any_user',
      'delete_any_user',
      'create_admin_users',
      'approve_admin_users',
      'view_all_analytics',
      'validate_media',
      'repair_media',
      'view_system_settings',
      'update_system_settings'
    ]
  };
  
  return permissions[role] || [];
}

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  const permissions = getRolePermissions(role);
  return permissions.includes(permission);
}

/**
 * Check if a role is an administrative role
 */
export function isAdminRole(role: UserRole): boolean {
  return role === UserRole.ADMINISTRATOR || role === UserRole.SUPER_ADMINISTRATOR;
}

/**
 * Get all available roles
 */
export function getAllRoles(): UserRole[] {
  return Object.values(UserRole);
}

/**
 * Get all consumer-facing roles (non-administrative)
 */
export function getConsumerFacingRoles(): UserRole[] {
  return [UserRole.CONSUMER, UserRole.PRODUCER, UserRole.PARTNER];
}

/**
 * Get all administrative roles
 */
export function getAdminRoles(): UserRole[] {
  return [UserRole.ADMINISTRATOR, UserRole.SUPER_ADMINISTRATOR];
}