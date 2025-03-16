import { ReactNode } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { checkPermission, checkMultiplePermissions, checkAnyPermission } from '@/lib/role-verification';

interface PermissionGuardProps {
  children: ReactNode;
  permission?: string;
  permissions?: string[];
  requireAll?: boolean;
  fallback?: ReactNode;
}

/**
 * Permission-based component guard
 * Only renders children if user has required permission(s)
 * Does not redirect; simply shows or hides content based on permissions
 */
export const PermissionGuard = ({
  children,
  permission, // Single permission to check
  permissions = [], // Multiple permissions to check
  requireAll = true, // Whether to require all permissions or just one
  fallback = null // What to render if permission check fails
}: PermissionGuardProps) => {
  const { userRole } = useAuth();
  
  // Single permission check
  if (permission) {
    return checkPermission(userRole, permission) ? <>{children}</> : <>{fallback}</>;
  }
  
  // Multiple permissions check (either all or any)
  if (permissions.length > 0) {
    const hasPermissions = requireAll
      ? checkMultiplePermissions(userRole, permissions)
      : checkAnyPermission(userRole, permissions);
    
    return hasPermissions ? <>{children}</> : <>{fallback}</>;
  }
  
  // If no permissions specified, render children (fail open)
  return <>{children}</>;
};