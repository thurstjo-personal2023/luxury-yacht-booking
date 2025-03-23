import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthService } from '@/services/auth';

interface ProtectedRouteProps {
  children: ReactNode;
  fallbackPath?: string;
}

/**
 * Loading spinner component for auth loading states
 */
const AuthLoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

/**
 * Authentication-based route protection component
 * Only allows access to authenticated users regardless of role
 */
export const ProtectedRoute = ({ 
  children, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) => {
  const { user, isLoading, isAuthenticated, refreshUserData } = useAuthService();
  const [, setLocation] = useLocation();
  const [tokenChecked, setTokenChecked] = useState(false);

  // Validate token when authenticated
  useEffect(() => {
    const validateTokenAndAccess = async () => {
      if (!isAuthenticated || !user) {
        // Not authenticated, will redirect in the next effect
        setTokenChecked(true);
        return;
      }
      
      try {
        // Request token refresh to ensure we have valid token
        await refreshUserData();
        setTokenChecked(true);
      } catch (error) {
        console.error('ProtectedRoute: Token validation error:', error);
        // Token validation failed, mark as checked but will redirect
        setTokenChecked(true);
      }
    };
    
    validateTokenAndAccess();
  }, [isAuthenticated, user, refreshUserData]);

  // Handle redirects when authentication state is determined
  useEffect(() => {
    if (!isLoading && tokenChecked && !isAuthenticated) {
      console.log('ProtectedRoute: User not authenticated, redirecting to', fallbackPath);
      setLocation(fallbackPath);
    }
  }, [isAuthenticated, isLoading, tokenChecked, fallbackPath, setLocation]);

  // Show loading state while checking authentication
  if (isLoading || !tokenChecked) {
    return <AuthLoadingSpinner />;
  }

  // Show the children only if authenticated
  return isAuthenticated ? <>{children}</> : null;
};