import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';

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
}

export function AdminRoute({ children, requiresMfa = true }: AdminRouteProps) {
  const [isLoading, setIsLoading] = useState(true);
  const { adminUser, loading } = useAdminAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    // Wait for admin auth to initialize
    if (loading) {
      return;
    }
    
    // Check if user is authenticated as admin
    if (!adminUser) {
      // Redirect to admin login, preserving the intended destination
      setLocation(`/admin-login?returnUrl=${encodeURIComponent(location)}`);
      return;
    }
    
    // Check MFA if required
    if (requiresMfa && !adminUser.mfaVerified) {
      // If MFA is not yet verified, redirect to MFA verification
      setLocation(`/admin-mfa-verify?returnUrl=${encodeURIComponent(location)}`);
      return;
    }
    
    // Authentication and MFA checks passed
    setIsLoading(false);
  }, [adminUser, loading, setLocation, location, requiresMfa]);

  // Show loading spinner while checking authentication
  if (loading || isLoading) {
    return <AdminLoadingSpinner />;
  }

  // Render the protected content
  return <>{children}</>;
}