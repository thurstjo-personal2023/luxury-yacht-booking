/**
 * PrivateRoute Component
 * 
 * Enhanced PrivateRoute with improved auth service integration
 * This component wraps routes that require authentication and specific roles.
 * It redirects to the login page if the user is not authenticated.
 */

import React, { ReactNode, useEffect, useState } from 'react';
import { Redirect } from 'wouter';
import { Loader2 } from 'lucide-react';
import { useAuthService } from '@/services/auth';
import { getDashboardUrlForRole } from '@/lib/auth-permissions';

// Different types of protected routes
export type RouteType = 'user' | 'admin' | 'producer' | 'partner' | 'consumer';

interface PrivateRouteProps {
  children: ReactNode;
  routeType?: RouteType;
}

/**
 * PrivateRoute Component
 * Restricts access to routes based on authentication state and user role
 * Uses the centralized AuthService directly for improved reliability
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  routeType = 'user' 
}) => {
  const { user, isLoading, isAuthenticated, profileData, refreshUserData } = useAuthService();
  const [tokenValidated, setTokenValidated] = useState(false);
  
  // Validate token and refresh user data when component mounts or auth state changes
  useEffect(() => {
    let isMounted = true;
    
    const validateAndRefresh = async () => {
      // Always reset token validation when auth state changes
      if (isMounted) setTokenValidated(false);
      
      if (!isAuthenticated || !user) {
        if (isMounted) setTokenValidated(true);
        return;
      }
      
      try {
        // Force a refresh of user data
        await refreshUserData();
        if (isMounted) setTokenValidated(true);
      } catch (error) {
        console.error('PrivateRoute: Error refreshing user data:', error);
        if (isMounted) setTokenValidated(true);
      }
    };
    
    // Execute immediately
    validateAndRefresh();
    
    // Cleanup function to prevent state updates on unmounted component
    return () => {
      isMounted = false;
    };
  // Only depend on isAuthenticated and user to prevent unnecessary re-renders
  // refreshUserData is excluded because it changes on every render
  }, [isAuthenticated, user]);
  
  // Show loading state with improved UI
  if (isLoading || !tokenValidated) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }
  
  // Check if user is authenticated at all
  if (!isAuthenticated || !user) {
    console.log('PrivateRoute: Redirecting to login - not authenticated');
    return <Redirect to="/login" />;
  }
  
  // Get user role from profile data
  const userRole = profileData?.role?.toLowerCase();
  
  // Handle route type checks
  if (routeType !== 'user') {
    // If no role data is available, we can't make role-based decisions
    if (!userRole) {
      console.error('PrivateRoute: No user role data available');
      return <Redirect to="/login" />;
    }
    
    // Admin routes check
    if (routeType === 'admin' && userRole !== 'admin') {
      console.log('PrivateRoute: Redirecting to admin login - not an authenticated admin');
      return <Redirect to="/admin/login" />;
    }
    
    // Producer route check
    if (routeType === 'producer' && userRole !== 'producer' && userRole !== 'admin') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role producer`);
      return <Redirect to={getDashboardUrlForRole(userRole)} />;
    }
    
    // Partner route check
    if (routeType === 'partner' && userRole !== 'partner' && userRole !== 'admin') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role partner`);
      return <Redirect to={getDashboardUrlForRole(userRole)} />;
    }
    
    // Consumer route check
    if (routeType === 'consumer' && userRole !== 'consumer' && userRole !== 'admin') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role consumer`);
      return <Redirect to={getDashboardUrlForRole(userRole)} />;
    }
  }
  
  // If all checks pass, render the children
  return <>{children}</>;
};

export default PrivateRoute;