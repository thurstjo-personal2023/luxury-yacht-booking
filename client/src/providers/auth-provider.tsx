/**
 * Authentication Provider
 * 
 * This component provides authentication state to the application
 * using the new AuthService. It follows clean architecture principles
 * by isolating authentication logic in the service layer.
 */
import { createContext, useContext, ReactNode } from 'react';
import { useAuthService, AuthServiceHookResult } from '@/services/auth';

// Create context with default values
const AuthContext = createContext<AuthServiceHookResult | null>(null);

/**
 * Auth Provider Props
 */
interface AuthProviderProps {
  children: ReactNode;
}

/**
 * Auth Provider Component
 * 
 * Provides authentication state to children components
 */
export function AuthProvider({ children }: AuthProviderProps) {
  // Use the auth service hook to manage authentication state
  const authService = useAuthService();
  
  return (
    <AuthContext.Provider value={authService}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Use Auth Hook
 * 
 * Custom hook to use the authentication context
 */
export function useAuth(): AuthServiceHookResult {
  const context = useContext(AuthContext);
  
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  
  return context;
}