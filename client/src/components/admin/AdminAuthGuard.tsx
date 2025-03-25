import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { Spinner } from '@/components/ui/spinner';
import { toast } from '@/hooks/use-toast';
import { authService } from '@/services/auth/auth-service';

interface AdminAuthGuardProps {
  children: React.ReactNode;
}

/**
 * AdminAuthGuard component
 * 
 * This component is responsible for:
 * 1. Verifying admin authentication
 * 2. Refreshing auth tokens when needed
 * 3. Redirecting to login if authentication is invalid
 * 4. Managing session timeouts
 * 
 * Place this component at the top level of admin routes
 */
export function AdminAuthGuard({ children }: AdminAuthGuardProps) {
  const { adminUser, isLoading, verifyAdminSession, refreshSession } = useAdminAuth();
  const [, setLocation] = useLocation();
  const [verifying, setVerifying] = useState(true);

  // Check and refresh authentication on mount
  useEffect(() => {
    const checkAuthentication = async () => {
      try {
        console.log('AdminAuthGuard: Verifying admin authentication...');
        
        // Verify the current admin session
        const isValid = await verifyAdminSession();
        
        // If session is not valid, redirect to login
        if (!isValid) {
          console.log('AdminAuthGuard: Invalid admin session, redirecting to login');
          toast({
            title: 'Authentication Required',
            description: 'Please sign in to access the admin area',
          });
          setLocation('/admin-login');
          return;
        }
        
        // If valid, refresh the session and token
        console.log('AdminAuthGuard: Admin session valid, refreshing token');
        
        // Force token refresh through authService
        await authService.refreshToken(true);
        
        // Also trigger session refresh to update timestamps
        await refreshSession();
        
        console.log('AdminAuthGuard: Authentication verified and refreshed');
      } catch (error) {
        console.error('AdminAuthGuard: Authentication error:', error);
        
        // On error, redirect to login
        toast({
          title: 'Authentication Error',
          description: 'Please sign in again to continue',
          variant: 'destructive',
        });
        setLocation('/admin-login');
      } finally {
        setVerifying(false);
      }
    };
    
    // Skip verification during initial loading
    if (!isLoading) {
      checkAuthentication();
    }
  }, [isLoading, verifyAdminSession, refreshSession, setLocation]);

  // Set up periodic token refresh (every 10 minutes)
  useEffect(() => {
    if (!adminUser) return;
    
    console.log('AdminAuthGuard: Setting up periodic token refresh');
    
    // Refresh token every 10 minutes (600000ms)
    const intervalId = setInterval(async () => {
      try {
        console.log('AdminAuthGuard: Performing periodic token refresh');
        await authService.refreshToken(true);
        console.log('AdminAuthGuard: Periodic token refresh successful');
      } catch (error) {
        console.error('AdminAuthGuard: Periodic token refresh failed:', error);
      }
    }, 600000);
    
    return () => {
      console.log('AdminAuthGuard: Clearing periodic token refresh');
      clearInterval(intervalId);
    };
  }, [adminUser]);

  // Set up activity tracking for session timeout
  useEffect(() => {
    if (!adminUser) return;
    
    console.log('AdminAuthGuard: Setting up user activity tracking');
    
    // Update last activity timestamp on user interactions
    const updateActivity = () => {
      localStorage.setItem('adminLastActivity', Date.now().toString());
    };
    
    // Listen for user activity events
    window.addEventListener('click', updateActivity);
    window.addEventListener('keypress', updateActivity);
    window.addEventListener('scroll', updateActivity);
    window.addEventListener('mousemove', updateActivity);
    
    // Set initial activity timestamp
    updateActivity();
    
    return () => {
      // Clean up event listeners
      window.removeEventListener('click', updateActivity);
      window.removeEventListener('keypress', updateActivity);
      window.removeEventListener('scroll', updateActivity);
      window.removeEventListener('mousemove', updateActivity);
    };
  }, [adminUser]);

  // Show loading spinner during authentication checks
  if (isLoading || verifying) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Spinner size="lg" />
        <span className="ml-2">Verifying admin access...</span>
      </div>
    );
  }

  // Only render children if we have a valid admin user
  return adminUser ? <>{children}</> : null;
}

export default AdminAuthGuard;