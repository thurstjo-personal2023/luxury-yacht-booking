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
  
  // Validate token and refresh user data when component mounts
  useEffect(() => {
    const validateAndRefresh = async () => {
      if (!isAuthenticated || !user) {
        setTokenValidated(true);
        return;
      }
      
      try {
        // Force a refresh of user data
        await refreshUserData();
        setTokenValidated(true);
      } catch (error) {
        console.error('PrivateRoute: Error refreshing user data:', error);
        setTokenValidated(true);
      }
    };
    
    validateAndRefresh();
  }, [isAuthenticated, user, refreshUserData]);
  
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
  
  // Admin routes check
  if (routeType === 'admin') {
    // Get admin status from user claims
    const checkAdminRole = async () => {
      try {
        const tokenResult = await user.getIdTokenResult();
        return tokenResult.claims.role === 'admin';
      } catch (error) {
        console.error('Error checking admin role:', error);
        return false;
      }
    };
    
    // If not admin, redirect to admin login
    if (!checkAdminRole()) {
      console.log('PrivateRoute: Redirecting to admin login - not an authenticated admin');
      return <Redirect to="/admin/login" />;
    }
  }
  
  // Role-specific routes for regular users
  // Only check these if we have the profile data
  if (profileData) {
    const userRole = profileData.role?.toLowerCase();
    
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
  
  // If all checks pass, render the children
  return <>{children}</>;
};

export default PrivateRoute;