import { ReactNode, useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuthService } from '@/services/auth/use-auth-service';
import { UserRoleType } from '@shared/user-schema';
import { verifyUserRole, getDashboardUrlForRole, isValidUserRole } from '@/lib/role-verification';
import { useToast } from '@/hooks/use-toast';

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
 * Now supports async role verification for better reliability
 */
export const RoleRoute = ({ 
  children, 
  roles, 
  fallbackPath = '/login' 
}: RoleRouteProps) => {
  const { user, loading, profileData } = useAuthService();
  const userRole = profileData?.harmonizedUser?.role;
  const [, setLocation] = useLocation();
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    let isMounted = true;
    
    const verifyAndAuthorize = async () => {
      // Flag that we're doing verification
      setIsVerifying(true);
      
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
        if (isMounted) setIsVerifying(false);
        return;
      }
      
      // No user means not authenticated at all
      if (!user) {
        console.log(`🔒 RoleRoute: No user found, redirecting to ${fallbackPath}`);
        if (isMounted) {
          setIsAuthorized(false);
          setIsVerifying(false);
          setLocation(fallbackPath);
        }
        return;
      }

      // First do a quick validation with synchronous method for better UX
      if (!userRole || !isValidUserRole(userRole)) {
        console.log(`⚠️ RoleRoute: Potentially invalid role "${userRole}", doing deeper verification...`);
        
        try {
          // Use the enhanced async verification for deeper checks
          const verificationResult = await verifyUserRole(userRole);
          
          if (!isMounted) return;
          
          console.log('📋 Role verification result:', verificationResult);
          
          if (!verificationResult.hasRole) {
            // Role verification failed completely
            console.log(`❌ RoleRoute: Role verification failed for "${userRole}"`);
            
            if (verificationResult.actualRole) {
              // We have an actual role from the server that differs from the claimed role
              console.log(`🔄 RoleRoute: Using server-provided role "${verificationResult.actualRole}" instead`);
              
              // Notify user of role mismatch
              toast({
                title: "Role Mismatch Detected",
                description: `Your role has been updated to ${verificationResult.actualRole}. You'll be redirected to the appropriate page.`,
                duration: 5000,
              });
              
              // Check if the actual role is allowed for this route
              const hasAuthorizedRole = roles.includes(verificationResult.actualRole);
              
              if (hasAuthorizedRole) {
                // Actual role is allowed, so authorize access
                if (isMounted) {
                  setIsAuthorized(true);
                  setIsVerifying(false);
                }
                return;
              } else {
                // Actual role is not allowed, redirect to appropriate dashboard
                const dashboardUrl = getDashboardUrlForRole(verificationResult.actualRole);
                console.log(`🔄 RoleRoute: Redirecting to ${dashboardUrl} based on server role`);
                if (isMounted) {
                  setIsAuthorized(false);
                  setIsVerifying(false);
                  setLocation(dashboardUrl);
                }
                return;
              }
            }
            
            // No valid role at all, redirect to login
            console.log(`❌ RoleRoute: No valid role found, redirecting to ${fallbackPath}`);
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              setLocation(fallbackPath);
            }
            return;
          }
        } catch (error) {
          console.error('Error during role verification:', error);
          // On error, fall back to basic role check
          if (!isValidUserRole(userRole)) {
            console.log(`❌ RoleRoute: Invalid role "${userRole}" and verification failed, redirecting to login`);
            if (isMounted) {
              setIsAuthorized(false);
              setIsVerifying(false);
              setLocation(fallbackPath);
            }
            return;
          }
        }
      }
      
      // At this point, we have a valid userRole
      // Check if it's allowed for this route
      const hasAuthorizedRole = roles.includes(userRole as UserRoleType);
      console.log(`${hasAuthorizedRole ? '✅' : '❌'} RoleRoute: User role "${userRole}" ${hasAuthorizedRole ? 'is' : 'is not'} allowed for this route`);
      
      if (isMounted) {
        setIsAuthorized(hasAuthorizedRole);
        setIsVerifying(false);
      
        // Handle redirection if not authorized
        if (!hasAuthorizedRole) {
          // Use our centralized utility to get the correct dashboard URL
          const dashboardUrl = getDashboardUrlForRole(userRole);
          console.log(`🔄 RoleRoute: Redirecting user with role "${userRole}" to ${dashboardUrl}`);
          setLocation(dashboardUrl);
        }
      }
    };

    // Start the verification process
    verifyAndAuthorize();
    
    // Cleanup function to prevent state updates if component unmounts during verification
    return () => {
      isMounted = false;
    };
  }, [user, loading, userRole, roles, fallbackPath, setLocation, toast]);

  // Show loading state while we check authorization
  if (loading || isVerifying || isAuthorized === null) {
    return <AuthLoadingSpinner />;
  }

  // Show the children only if authorized
  return isAuthorized ? <>{children}</> : null;
};