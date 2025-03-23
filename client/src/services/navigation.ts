/**
 * Navigation Service
 * 
 * This service provides a consistent way to handle navigation throughout the application,
 * ensuring that all redirections follow the same patterns and respect clean architecture.
 */

import { UserRoleType } from '@shared/user-schema';

// Navigation result interface
export interface NavigationResult {
  success: boolean;
  message?: string;
  error?: Error;
}

/**
 * Redirects to the appropriate dashboard based on user role
 * 
 * @param role User role
 * @returns Promise resolving to navigation result
 */
export async function redirectToDashboard(role: UserRoleType | null | undefined): Promise<NavigationResult> {
  try {
    if (!role) {
      console.warn('Navigation service: No role provided for dashboard redirect');
      return navigateToLogin('No role available');
    }
    
    const dashboardUrl = getDashboardUrlForRole(role);
    console.log(`Navigation service: Redirecting to ${dashboardUrl} for role ${role}`);
    
    // Use window.location for critical redirects after authentication
    // This ensures a fresh page load and consistent state
    window.location.href = dashboardUrl;
    
    return {
      success: true,
      message: `Redirected to ${dashboardUrl}`
    };
  } catch (error) {
    console.error('Navigation service: Error redirecting to dashboard', error);
    return {
      success: false,
      message: 'Failed to redirect to dashboard',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Redirects to the login page with an optional reason
 * 
 * @param reason Reason for redirecting to login
 * @returns Navigation result
 */
export function navigateToLogin(reason?: string): NavigationResult {
  try {
    const url = reason ? `/login?reason=${encodeURIComponent(reason)}` : '/login';
    console.log(`Navigation service: Redirecting to login${reason ? ' with reason: ' + reason : ''}`);
    
    // Use window.location for consistent behavior
    window.location.href = url;
    
    return {
      success: true,
      message: `Redirected to login${reason ? ' with reason: ' + reason : ''}`
    };
  } catch (error) {
    console.error('Navigation service: Error redirecting to login', error);
    return {
      success: false,
      message: 'Failed to redirect to login',
      error: error instanceof Error ? error : new Error(String(error))
    };
  }
}

/**
 * Gets the dashboard URL for a specific role
 * 
 * @param role User role
 * @returns Dashboard URL
 */
export function getDashboardUrlForRole(role: string): string {
  // Normalize role to lowercase for consistency
  const normalizedRole = role.toLowerCase();
  
  switch (normalizedRole) {
    case 'consumer':
      return '/dashboard/consumer';
    case 'producer':
      return '/dashboard/producer';
    case 'partner':
      return '/dashboard/partner';
    case 'admin':
    case 'administrator':
      return '/admin-dashboard';
    default:
      // Default to consumer dashboard if role is unknown
      console.warn(`Navigation service: Unknown role "${role}", defaulting to consumer dashboard`);
      return '/dashboard/consumer';
  }
}

/**
 * Handles authentication failures consistently
 * 
 * @param error Error that occurred
 * @returns Navigation result
 */
export function handleAuthFailure(error: Error): NavigationResult {
  console.error('Navigation service: Authentication failure', error);
  
  // Redirect to login with error information
  return navigateToLogin(`Authentication failed: ${error.message}`);
}