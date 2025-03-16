import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { UserRoleType } from '@/shared/user-schema';

interface RoleRouteProps {
  children: ReactNode;
  roles: UserRoleType[];
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
 * Role-based route protection component
 * Only allows access to users with specified roles
 */
export const RoleRoute = ({ 
  children, 
  roles, 
  fallbackPath = '/login' 
}: RoleRouteProps) => {
  const { user, loading, userRole } = useAuth();
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    // If we're not loading and either there's no user or the user's role doesn't match, redirect
    if (!loading) {
      if (!user) {
        setLocation(fallbackPath);
        setIsAuthorized(false);
        return;
      }

      // Check if user's role is in the allowed roles list
      const hasAuthorizedRole = roles.includes(userRole as UserRoleType);
      setIsAuthorized(hasAuthorizedRole);
      
      if (!hasAuthorizedRole) {
        // Redirect to appropriate dashboard based on role or to login if no role
        if (userRole === 'consumer') {
          setLocation('/dashboard/consumer');
        } else if (userRole === 'producer') {
          setLocation('/dashboard/producer');
        } else if (userRole === 'partner') {
          setLocation('/dashboard/partner');
        } else {
          setLocation(fallbackPath);
        }
      }
    }
  }, [user, loading, userRole, roles, fallbackPath, setLocation]);

  // Show loading state while we check authorization
  if (loading || isAuthorized === null) {
    return <AuthLoadingSpinner />;
  }

  // Show the children only if authorized
  return isAuthorized ? <>{children}</> : null;
};