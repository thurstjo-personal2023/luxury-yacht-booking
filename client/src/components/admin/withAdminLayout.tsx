import React from 'react';
import AdminLayout from '@/components/layouts/AdminLayout';

/**
 * withAdminLayout Higher-Order Component
 * 
 * This HOC wraps any component with the standard AdminLayout component
 * for consistent admin interface presentation.
 * 
 * Usage:
 * ```
 * export default withAdminLayout(YourAdminComponent);
 * ```
 */
export const withAdminLayout = <P extends object>(Component: React.ComponentType<P>) => {
  const WithAdminLayout: React.FC<P> = (props) => (
    <AdminLayout>
      <Component {...props} />
    </AdminLayout>
  );

  // Set display name for better debugging
  const displayName = Component.displayName || Component.name || 'Component';
  WithAdminLayout.displayName = `withAdminLayout(${displayName})`;

  return WithAdminLayout;
};

export default withAdminLayout;