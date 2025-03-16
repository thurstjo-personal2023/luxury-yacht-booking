import { ReactNode, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

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
 * Protected route component
 * Only allows access to authenticated users
 */
export const ProtectedRoute = ({ 
  children, 
  fallbackPath = '/login' 
}: ProtectedRouteProps) => {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If we're not loading and there's no user, redirect to login
    if (!loading && !user) {
      setLocation(fallbackPath);
    }
  }, [user, loading, fallbackPath, setLocation]);

  // Show loading state while we check authentication
  if (loading) {
    return <AuthLoadingSpinner />;
  }

  // Show the children only if authenticated
  return user ? <>{children}</> : null;
};