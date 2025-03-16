import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { UserRoleType } from '@shared/user-schema';
import { verifyUserRole, getDashboardUrlForRole } from '@/lib/role-verification';

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
 * 
 * Enhanced with improved role validation and consistent redirection logic
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
    // Enhanced debugging to trace the authorization flow
    console.log('🔍 RoleRoute evaluating access with:', { 
      loading, 
      userExists: !!user, 
      userRole,
      allowedRoles: roles
    });

    // If still loading, don't make any decisions yet
    if (loading) {
      console.log('⏳ RoleRoute: Still loading, skipping authorization check');
      return;
    }
    
    // No user means not authenticated at all
    if (!user) {
      console.log(`🔒 RoleRoute: No user found, redirecting to ${fallbackPath}`);
      setLocation(fallbackPath);
      setIsAuthorized(false);
      return;
    }

    // Verify the user's role is valid using our centralized verification utility
    if (!userRole || !verifyUserRole(userRole)) {
      console.log(`❌ RoleRoute: Invalid or missing role "${userRole}", redirecting to login`);
      setIsAuthorized(false);
      setLocation(fallbackPath);
      return;
    }
    
    // Now check if the role is allowed for this route
    const hasAuthorizedRole = roles.includes(userRole);
    console.log(`${hasAuthorizedRole ? '✅' : '❌'} RoleRoute: User role "${userRole}" ${hasAuthorizedRole ? 'is' : 'is not'} allowed for this route`);
    setIsAuthorized(hasAuthorizedRole);
    
    // Handle redirection if not authorized
    if (!hasAuthorizedRole) {
      // Use our centralized utility to get the correct dashboard URL
      const dashboardUrl = getDashboardUrlForRole(userRole);
      console.log(`🔄 RoleRoute: Redirecting user with role "${userRole}" to ${dashboardUrl}`);
      setLocation(dashboardUrl);
    }
  }, [user, loading, userRole, roles, fallbackPath, setLocation]);

  // Show loading state while we check authorization
  if (loading || isAuthorized === null) {
    return <AuthLoadingSpinner />;
  }

  // Show the children only if authorized
  return isAuthorized ? <>{children}</> : null;
};