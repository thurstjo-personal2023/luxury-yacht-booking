/**
 * UserRole Value Object
 * 
 * This enum defines the possible roles a user can have in the system.
 */

export enum UserRole {
  ADMINISTRATOR = 'administrator',
  CONSUMER = 'consumer',
  PRODUCER = 'producer',
  PARTNER = 'partner'
}

/**
 * Check if a string is a valid UserRole
 */
export function isValidUserRole(role: string): role is UserRole {
  return Object.values(UserRole).includes(role as UserRole);
}