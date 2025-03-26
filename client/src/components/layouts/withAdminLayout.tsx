import React from 'react';
import AdminLayout from './AdminLayout';
import { AdminAuthGuard } from '../admin/AdminAuthGuard';

/**
 * Higher-Order Component (HOC) that wraps a page component with the AdminLayout
 * and AdminAuthGuard components to provide layout and authentication.
 * 
 * @param PageComponent The page component to wrap with AdminLayout
 * @returns A new component that includes AdminAuthGuard and AdminLayout
 */
export default function withAdminLayout<P extends object>(PageComponent: React.ComponentType<P>) {
  const WithAdminLayout: React.FC<P> = (props) => {
    return (
      <AdminAuthGuard>
        <AdminLayout>
          <PageComponent {...props} />
        </AdminLayout>
      </AdminAuthGuard>
    );
  };

  // Set display name for better debugging
  const displayName = PageComponent.displayName || PageComponent.name || 'Component';
  WithAdminLayout.displayName = `withAdminLayout(${displayName})`;

  return WithAdminLayout;
}