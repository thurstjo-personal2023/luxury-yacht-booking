/**
 * PrivateRoute Component
 * 
 * This component wraps routes that require authentication.
 * It redirects to the login page if the user is not authenticated.
 */

import React, { ReactNode } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '../../providers/auth-provider';

// Different types of protected routes
export type RouteType = 'user' | 'admin' | 'producer' | 'partner';

interface PrivateRouteProps {
  children: ReactNode;
  routeType?: RouteType;
}

/**
 * PrivateRoute Component
 * Restricts access to routes based on authentication state and user role
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  routeType = 'user' 
}) => {
  const { isLoading, isAuthenticated, isAdminAuthenticated, user } = useAuth();
  
  // Show loading state
  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }
  
  // Admin routes check
  if (routeType === 'admin') {
    if (!isAdminAuthenticated) {
      console.log('PrivateRoute: Redirecting to admin login - not an authenticated admin');
      return <Redirect to="/admin/login" />;
    }
    return <>{children}</>;
  }
  
  // Regular user routes check
  if (!isAuthenticated) {
    console.log('PrivateRoute: Redirecting to login - not authenticated');
    return <Redirect to="/login" />;
  }
  
  // Role-specific routes
  if (routeType === 'producer' && user?.role !== 'producer') {
    console.log('PrivateRoute: Redirecting to dashboard - not a producer');
    return <Redirect to="/dashboard" />;
  }
  
  if (routeType === 'partner' && user?.role !== 'partner') {
    console.log('PrivateRoute: Redirecting to dashboard - not a partner');
    return <Redirect to="/dashboard" />;
  }
  
  // If all checks pass, render the children
  return <>{children}</>;
};

export default PrivateRoute;