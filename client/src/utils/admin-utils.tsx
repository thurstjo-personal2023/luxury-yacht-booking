/**
 * Admin Utilities
 * 
 * This file contains utility functions for admin-related operations
 * including role formatting, permission checking, and logging actions.
 */
import { apiRequest } from '../lib/queryClient';

// Activity type enum (mirroring the one in server/admin-activity-routes.ts)
export enum ActivityType {
  LOGIN = 'login',
  LOGOUT = 'logout',
  CREATE_ADMIN = 'create_admin',
  UPDATE_ADMIN = 'update_admin', 
  DISABLE_ADMIN = 'disable_admin',
  ENABLE_ADMIN = 'enable_admin',
  APPROVE_ADMIN = 'approve_admin',
  REJECT_ADMIN = 'reject_admin',
  SEND_INVITATION = 'send_invitation',
  VIEW_ADMIN_DETAILS = 'view_admin_details',
  REPAIR_MEDIA = 'repair_media',
  VALIDATE_MEDIA = 'validate_media',
  SYSTEM_SETTINGS = 'system_settings',
  OTHER = 'other'
}

// Role types
export type AdminRole = 'SUPER_ADMIN' | 'ADMIN' | 'MODERATOR' | 'super_admin' | 'admin' | 'moderator';

/**
 * Format admin role for display
 * 
 * @param role The admin role to format
 * @returns Formatted role string
 */
export function formatAdminRole(role: AdminRole | string): string {
  const upperRole = role.toUpperCase();
  
  switch (upperRole) {
    case 'SUPER_ADMIN':
      return 'Super Admin';
    case 'ADMIN':
      return 'Admin';
    case 'MODERATOR':
      return 'Moderator';
    default:
      return role;
  }
}

/**
 * Format admin department for display
 * 
 * @param department The admin department to format
 * @returns Formatted department string
 */
export function formatAdminDepartment(department: string): string {
  switch (department) {
    case 'technology':
      return 'Technology';
    case 'customer_support':
      return 'Customer Support';
    case 'finance':
      return 'Finance';
    case 'operations':
      return 'Operations';
    case 'marketing':
      return 'Marketing';
    case 'sales':
      return 'Sales';
    case 'human_resources':
      return 'Human Resources';
    case 'legal':
      return 'Legal';
    default:
      return department;
  }
}

/**
 * Format admin status for display
 * 
 * @param status The admin status to format
 * @returns Formatted status string
 */
export function formatAdminStatus(status: string): string {
  switch (status.toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'DISABLED':
      return 'Disabled';
    case 'PENDING':
      return 'Pending Approval';
    case 'REJECTED':
      return 'Rejected';
    default:
      return status;
  }
}

/**
 * Check if user has permission to perform an action
 * 
 * @param userRole The user's role
 * @param requiredRole The minimum role required for the action
 * @returns Whether the user has permission
 */
export function hasPermission(userRole: string, requiredRole: AdminRole): boolean {
  // Normalize roles for comparison
  const normalizedUserRole = userRole.toUpperCase();
  const normalizedRequiredRole = requiredRole.toUpperCase();
  
  // Role hierarchy: SUPER_ADMIN > ADMIN > MODERATOR
  if (normalizedUserRole === 'SUPER_ADMIN') {
    return true;
  }
  
  if (normalizedUserRole === 'ADMIN') {
    return normalizedRequiredRole !== 'SUPER_ADMIN';
  }
  
  if (normalizedUserRole === 'MODERATOR') {
    return normalizedRequiredRole === 'MODERATOR';
  }
  
  return false;
}

/**
 * Format timestamp for display
 * 
 * @param timestamp ISO timestamp string or Date object
 * @returns Formatted date and time string
 */
export function formatTimestamp(timestamp: string | Date): string {
  if (!timestamp) return 'N/A';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Calculate time difference from now (for "X ago" displays)
 * 
 * @param timestamp ISO timestamp string or Date object
 * @returns Formatted time difference string
 */
export function timeSince(timestamp: string | Date): string {
  if (!timestamp) return 'N/A';
  
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const secondsPast = Math.floor((now.getTime() - date.getTime()) / 1000);
  
  if (secondsPast < 60) {
    return `${secondsPast} seconds ago`;
  }
  
  const minutesPast = Math.floor(secondsPast / 60);
  if (minutesPast < 60) {
    return `${minutesPast} ${minutesPast === 1 ? 'minute' : 'minutes'} ago`;
  }
  
  const hoursPast = Math.floor(minutesPast / 60);
  if (hoursPast < 24) {
    return `${hoursPast} ${hoursPast === 1 ? 'hour' : 'hours'} ago`;
  }
  
  const daysPast = Math.floor(hoursPast / 24);
  if (daysPast < 30) {
    return `${daysPast} ${daysPast === 1 ? 'day' : 'days'} ago`;
  }
  
  const monthsPast = Math.floor(daysPast / 30);
  if (monthsPast < 12) {
    return `${monthsPast} ${monthsPast === 1 ? 'month' : 'months'} ago`;
  }
  
  const yearsPast = Math.floor(monthsPast / 12);
  return `${yearsPast} ${yearsPast === 1 ? 'year' : 'years'} ago`;
}

/**
 * Log an administrative action
 * 
 * @param type Action type from ActivityType enum
 * @param details Optional details about the action
 * @param targetId Optional ID of the target resource
 * @param targetType Optional type of the target resource
 * @returns Promise resolving to the result of the log operation
 */
export async function logAdminActivity(
  type: ActivityType | string,
  details?: string,
  targetId?: string,
  targetType?: string
): Promise<{ success: boolean; activityId?: string; error?: string }> {
  try {
    // Using any type here to avoid TypeScript issues with apiRequest
    // (In a real app, we'd define proper types for the API responses)
    const result = await apiRequest<any>('/api/admin/activity', {
      method: 'POST',
      body: JSON.stringify({ type, details, targetId, targetType }),
    });
    
    return { success: true, activityId: result?.activityId };
  } catch (error) {
    console.error('Failed to log admin activity:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error logging activity' 
    };
  }
}

/**
 * Get admin roles array (for select options, etc.)
 * 
 * @returns Array of admin role objects
 */
export function getAdminRoles(): { value: string; label: string }[] {
  return [
    { value: 'SUPER_ADMIN', label: 'Super Admin' },
    { value: 'ADMIN', label: 'Admin' },
    { value: 'MODERATOR', label: 'Moderator' }
  ];
}

/**
 * Get admin departments array (for select options, etc.)
 * 
 * @returns Array of admin department objects
 */
export function getAdminDepartments(): { value: string; label: string }[] {
  return [
    { value: 'technology', label: 'Technology' },
    { value: 'customer_support', label: 'Customer Support' },
    { value: 'finance', label: 'Finance' },
    { value: 'operations', label: 'Operations' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'sales', label: 'Sales' },
    { value: 'human_resources', label: 'Human Resources' },
    { value: 'legal', label: 'Legal' }
  ];
}

/**
 * Format date for form inputs
 * 
 * @param date Date object or ISO string
 * @returns Formatted date string (YYYY-MM-DD)
 */
export function formatDateForInput(date: Date | string | null): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Format role for API requests
 * 
 * @param role Role as displayed in UI
 * @returns Role formatted for API
 */
export function formatRoleForApi(role: string): string {
  return role.replace(' ', '_').toUpperCase();
}

/**
 * Format department for API requests
 * 
 * @param department Department as displayed in UI
 * @returns Department formatted for API
 */
export function formatDepartmentForApi(department: string): string {
  return department.replace(' ', '_').toLowerCase();
}

/**
 * Get CSS color class for admin role badges
 * 
 * @param role Admin role
 * @returns Tailwind CSS class for badge color
 */
export function getRoleBadgeColor(role: string): string {
  const normalizedRole = role.toUpperCase();
  
  switch (normalizedRole) {
    case 'SUPER_ADMIN':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'ADMIN':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'MODERATOR':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

/**
 * Get CSS color class for admin status badges
 * 
 * @param status Admin status
 * @returns Tailwind CSS class for badge color
 */
export function getStatusBadgeColor(status: string): string {
  const normalizedStatus = status.toUpperCase();
  
  switch (normalizedStatus) {
    case 'ACTIVE':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'DISABLED':
      return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
    case 'PENDING':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'REJECTED':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  }
}

/**
 * Get available admin statuses based on current status
 * 
 * @param currentStatus Current admin status
 * @returns Array of available status objects
 */
export function getAvailableStatuses(currentStatus: string): { value: string; label: string }[] {
  const normalizedStatus = currentStatus.toUpperCase();
  
  switch (normalizedStatus) {
    case 'ACTIVE':
      return [{ value: 'DISABLED', label: 'Disable Account' }];
    case 'DISABLED':
      return [{ value: 'ACTIVE', label: 'Activate Account' }];
    case 'PENDING':
      return [
        { value: 'ACTIVE', label: 'Approve & Activate' },
        { value: 'REJECTED', label: 'Reject' }
      ];
    case 'REJECTED':
      return [{ value: 'ACTIVE', label: 'Approve & Activate' }];
    default:
      return [];
  }
}