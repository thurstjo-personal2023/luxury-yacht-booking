import { ReactNode } from 'react';
import { AdminAuthProvider as AdminAuthContextProvider } from '@/hooks/use-admin-auth';

interface AdminAuthProviderProps {
  children: ReactNode;
  sessionTimeout?: number; // in seconds
}

export function AdminAuthProvider({ 
  children, 
  sessionTimeout = 15 * 60 // 15 minutes default
}: AdminAuthProviderProps) {
  return (
    <AdminAuthContextProvider sessionTimeout={sessionTimeout}>
      {children}
    </AdminAuthContextProvider>
  );
}