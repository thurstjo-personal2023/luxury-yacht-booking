/**
 * User Role Definition
 * 
 * Defines the possible roles for users in the system.
 */

export enum UserRole {
  CONSUMER = 'consumer',
  PRODUCER = 'producer',
  PARTNER = 'partner',
  ADMINISTRATOR = 'administrator',
  SUPER_ADMINISTRATOR = 'super_administrator'
}

/**
 * Permission-to-role mapping
 */
const ROLE_PERMISSIONS: Record<UserRole, string[]> = {
  [UserRole.CONSUMER]: [
    'view:yacht',
    'book:yacht',
    'rate:yacht',
    'view:profile',
    'edit:own_profile'
  ],
  [UserRole.PRODUCER]: [
    'view:yacht',
    'book:yacht',
    'rate:yacht',
    'view:profile',
    'edit:own_profile',
    'create:yacht',
    'edit:own_yacht',
    'delete:own_yacht',
    'view:producer_dashboard',
    'view:bookings'
  ],
  [UserRole.PARTNER]: [
    'view:yacht',
    'book:yacht',
    'rate:yacht',
    'view:profile',
    'edit:own_profile',
    'view:partner_dashboard',
    'create:addon',
    'edit:own_addon',
    'delete:own_addon'
  ],
  [UserRole.ADMINISTRATOR]: [
    'view:yacht',
    'edit:yacht',
    'delete:yacht',
    'view:profile',
    'edit:profile',
    'view:admin_dashboard',
    'manage:users',
    'manage:content',
    'validate:media',
    'repair:media'
  ],
  [UserRole.SUPER_ADMINISTRATOR]: [
    'view:yacht',
    'edit:yacht',
    'delete:yacht',
    'view:profile',
    'edit:profile',
    'view:admin_dashboard',
    'manage:users',
    'manage:content',
    'validate:media',
    'repair:media',
    'manage:administrators',
    'create:administrator',
    'approve:administrator',
    'reject:administrator',
    'view:system_settings',
    'edit:system_settings'
  ]
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: UserRole, permission: string): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}