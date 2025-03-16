import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { checkPermission } from '@/lib/role-verification';

interface PermissionGuardProps {
  children: ReactNode;
  permissionRequired: string;
  fallback?: ReactNode;
}

/**
 * Permission Guard component
 * Only renders children if user has the required permission
 */
export const PermissionGuard = ({ 
  children, 
  permissionRequired,
  fallback = null
}: PermissionGuardProps) => {
  const { user, userRole } = useAuth();
  
  // No user means no permissions
  if (!user) {
    return <>{fallback}</>;
  }
  
  // Check if the user has the required permission based on their role
  const hasPermission = checkPermission(userRole, permissionRequired);
  
  // Show the children only if user has permission
  return hasPermission ? <>{children}</> : <>{fallback}</>;
};