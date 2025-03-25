import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { authService } from '@/services/auth/auth-service';

// Loading spinner component
export function AdminLoadingSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
    </div>
  );
}

interface AdminRouteProps {
  children: ReactNode;
  requiresMfa?: boolean;
  requiredRole?: 'ADMIN' | 'SUPER_ADMIN' | 'MODERATOR' | 'admin' | 'super_admin';
}

export function AdminRoute({ 
  children, 
  requiresMfa = true,
  requiredRole
}: AdminRouteProps) {
  const [routeLoading, setRouteLoading] = useState(true);
  const { adminUser, isLoading, verifyAdminSession } = useAdminAuth();
  const [location, setLocation] = useLocation();
  const [sessionValid, setSessionValid] = useState<boolean | null>(null);

  // Check token freshness and refresh if needed
  useEffect(() => {
    const checkTokenFreshness = async () => {
      // If there's no token in localStorage but adminSessionActive is set, clear it 
      // as it's likely stale
      const hasToken = !!localStorage.getItem('authToken');
      const hasAdminSession = !!localStorage.getItem('adminSessionActive');
      
      if (!hasToken && hasAdminSession) {
        console.log('AdminRoute: Clearing stale admin session');
        localStorage.removeItem('adminSessionActive');
        localStorage.removeItem('adminLastActivity');
      }
      
      // If admin user exists, ensure token is fresh
      if (adminUser) {
        try {
          // This will refresh the token if needed
          await authService.refreshToken(true);
          console.log('AdminRoute: Token refreshed successfully');
          
          // Verify that the admin session is still valid
          const isValid = await verifyAdminSession();
          setSessionValid(isValid);
          
          if (!isValid) {
            console.log('AdminRoute: Admin session verification failed');
            // Will be handled in the next useEffect
          }
        } catch (error) {
          console.error('AdminRoute: Token refresh failed:', error);
          setSessionValid(false);
        }
      }
    };
    
    if (!isLoading) {
      checkTokenFreshness();
    }
  }, [adminUser, isLoading, verifyAdminSession]);

  // Handle routing based on auth state
  useEffect(() => {
    // Wait for admin auth to initialize
    if (isLoading || sessionValid === null) {
      return;
    }
    
    // Check if user is authenticated as admin
    if (!adminUser || sessionValid === false) {
      // Redirect to admin login, preserving the intended destination
      const currentPath = encodeURIComponent(location);
      console.log(`AdminRoute: Redirecting to login, return URL: ${currentPath}`);
      setLocation(`/admin-login?returnUrl=${currentPath}`);
      return;
    }
    
    // Check MFA if required
    if (requiresMfa && !adminUser.mfaVerified) {
      // If MFA is not yet verified, redirect to MFA verification
      const currentPath = encodeURIComponent(location);
      console.log(`AdminRoute: Redirecting to MFA verification, return URL: ${currentPath}`);
      setLocation(`/admin-mfa-verify?returnUrl=${currentPath}`);
      return;
    }
    
    // Check required role if specified
    if (requiredRole) {
      // Normalize roles for comparison (handle both uppercase and lowercase)
      const normalizedUserRole = adminUser.role.toUpperCase();
      const normalizedRequiredRole = requiredRole.toUpperCase();
      
      // Only redirect if not sufficient permissions
      if (normalizedUserRole !== normalizedRequiredRole) {
        // Super Admin override - they can access any page
        if (!(normalizedUserRole === 'SUPER_ADMIN')) {
          console.log(`AdminRoute: Insufficient permissions. Required: ${requiredRole}, User has: ${adminUser.role}`);
          // Redirect to unauthorized page or dashboard
          setLocation('/admin/unauthorized');
          return;
        }
      }
    }
    
    // Authentication, MFA, and role checks passed
    console.log('AdminRoute: All checks passed, rendering protected content');
    setRouteLoading(false);
    
    // Update the last activity timestamp for session timeout tracking
    localStorage.setItem('adminLastActivity', Date.now().toString());
    
  }, [adminUser, isLoading, sessionValid, setLocation, location, requiresMfa, requiredRole]);

  // Show loading spinner while checking authentication
  if (isLoading || routeLoading || sessionValid === null) {
    return <AdminLoadingSpinner />;
  }

  // Render the protected content
  return <>{children}</>;
}