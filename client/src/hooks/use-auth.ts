/**
 * Auth Hook
 * 
 * This hook provides access to the authentication context.
 * It's a convenience wrapper around the useAuth hook from the auth provider.
 */

import { useAuth as useAuthProvider } from '../providers/auth-provider';

/**
 * Hook for accessing auth context
 * 
 * This hook provides access to all authentication-related functionality:
 * - Current user and admin state
 * - Authentication status
 * - Sign in/out methods
 * - MFA verification
 * - Token refreshing
 */
export const useAuth = () => {
  const auth = useAuthProvider();
  return auth;
};

export default useAuth;