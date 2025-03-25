import React from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';
import AdminAuthGuard from '@/components/admin/AdminAuthGuard';

/**
 * withAdminLayout Higher-Order Component
 * 
 * This HOC wraps any component with:
 * 1. AdminAuthGuard - Ensures valid admin authentication with token refresh
 * 2. AdminLayout - Provides consistent admin interface presentation
 * 
 * Usage:
 * ```
 * export default withAdminLayout(YourAdminComponent);
 * ```
 */
export const withAdminLayout = <P extends object>(Component: React.ComponentType<P>) => {
  const WithAdminLayout: React.FC<P> = (props) => (
    <AdminAuthGuard>
      <AdminLayout>
        <Component {...props} />
      </AdminLayout>
    </AdminAuthGuard>
  );

  // Set display name for better debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithAdminLayout.displayName = `withAdminLayout(${displayName})`;

  return WithAdminLayout;
};

export default withAdminLayout;