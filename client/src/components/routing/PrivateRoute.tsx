/**
 * PrivateRoute Component
 * 
 * Enhanced PrivateRoute with improved auth context integration
 * This component wraps routes that require authentication and specific roles.
 * It redirects to the login page if the user is not authenticated.
 */

import React, { ReactNode, useEffect } from 'react';
import { Redirect } from 'wouter';
import { useAuth } from '@/lib/auth-context';
import { Loader2 } from 'lucide-react';

// Different types of protected routes
export type RouteType = 'user' | 'admin' | 'producer' | 'partner' | 'consumer';

interface PrivateRouteProps {
  children: ReactNode;
  routeType?: RouteType;
}

/**
 * PrivateRoute Component
 * Restricts access to routes based on authentication state and user role
 * Uses enhanced auth context with improved token handling
 */
export const PrivateRoute: React.FC<PrivateRouteProps> = ({ 
  children, 
  routeType = 'user' 
}) => {
  const { loading, user, harmonizedUser } = useAuth();
  
  // Effect to refresh user data when component mounts
  useEffect(() => {
    if (user && !harmonizedUser) {
      console.log('PrivateRoute: User authenticated but profile not loaded, refreshing data...');
      // The auth context will automatically load profile data when user changes
    }
  }, [user, harmonizedUser]);
  
  // Show loading state with improved UI
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Loading your profile...</p>
      </div>
    );
  }
  
  // Check if user is authenticated at all
  if (!user) {
    console.log('PrivateRoute: Redirecting to login - not authenticated');
    return <Redirect to="/login" />;
  }
  
  // Admin routes check - we'd need to implement admin checks in the future
  // For now this is just a placeholder
  if (routeType === 'admin') {
    // Check for admin role in token claims
    const isAdmin = user.getIdTokenResult()
      .then(token => token.claims.role === 'admin')
      .catch(() => false);
      
    if (!isAdmin) {
      console.log('PrivateRoute: Redirecting to admin login - not an authenticated admin');
      return <Redirect to="/admin/login" />;
    }
  }
  
  // Role-specific routes for regular users
  // Only check these if we actually have the harmonized user data
  if (harmonizedUser) {
    const userRole = harmonizedUser.role?.toLowerCase();
    
    // Producer route check
    if (routeType === 'producer' && userRole !== 'producer') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role producer`);
      return <Redirect to="/dashboard/consumer" />;
    }
    
    // Partner route check
    if (routeType === 'partner' && userRole !== 'partner') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role partner`);
      return <Redirect to="/dashboard/consumer" />;
    }
    
    // Consumer route check
    if (routeType === 'consumer' && userRole !== 'consumer') {
      console.log(`PrivateRoute: User role ${userRole} doesn't match required role consumer`);
      // Redirect to the appropriate dashboard
      return <Redirect to={`/dashboard/${userRole}`} />;
    }
  }
  
  // If all checks pass or we're still loading harmonized data, render the children
  return <>{children}</>;
};

export default PrivateRoute;