/**
 * Auth Hook
 * 
 * This hook provides access to the authentication functionality.
 * It's now a direct wrapper around the useAuthService hook from our new clean architecture.
 * This maintains API compatibility for components that haven't been updated yet.
 */

import { useAuthService } from '@/services/auth';

/**
 * Hook for accessing auth functionality
 * 
 * This hook provides access to all authentication-related functionality:
 * - Current user state
 * - Authentication status
 * - Sign in/out methods
 * - Token refreshing
 */
export const useAuth = () => {
  return useAuthService();
};

export default useAuth;