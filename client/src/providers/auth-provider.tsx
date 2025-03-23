/**
 * Auth Provider Component
 * 
 * This component provides authentication context to the application.
 * It uses the authentication services from the core layer to manage
 * authentication state across the entire application.
 */

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Administrator } from '../../../core/domain/auth/user';
import { IAuthenticationService, IAdminAuthenticationService } from '../../../core/application/auth/auth-service.interface';
import { INavigationService } from '../../../core/application/services/navigation-service.interface';
import { useLocation } from 'wouter';

// Create contexts for regular users and administrators
type AuthContextType = {
  user: User | null;
  admin: Administrator | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdminAuthenticated: boolean;
  signIn: (email: string, password: string) => Promise<User>;
  signUp: (email: string, password: string) => Promise<User>;
  signOut: () => Promise<void>;
  adminSignIn: (email: string, password: string) => Promise<Administrator>;
  adminSignOut: () => Promise<void>;
  verifyMfa: (code: string) => Promise<boolean>;
  setupMfa: () => Promise<{ qrCodeUrl: string, secret: string }>;
  refreshToken: (forceRefresh?: boolean) => Promise<string | null>;
};

// Create the context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  admin: null,
  isLoading: true,
  isAuthenticated: false,
  isAdminAuthenticated: false,
  signIn: async () => { throw new Error('signIn not implemented'); },
  signUp: async () => { throw new Error('signUp not implemented'); },
  signOut: async () => { throw new Error('signOut not implemented'); },
  adminSignIn: async () => { throw new Error('adminSignIn not implemented'); },
  adminSignOut: async () => { throw new Error('adminSignOut not implemented'); },
  verifyMfa: async () => { throw new Error('verifyMfa not implemented'); },
  setupMfa: async () => { throw new Error('setupMfa not implemented'); },
  refreshToken: async () => { throw new Error('refreshToken not implemented'); }
});

// Auth Provider Props
interface AuthProviderProps {
  children: ReactNode;
  authService: IAuthenticationService;
  adminAuthService: IAdminAuthenticationService;
  navigationService: INavigationService;
}

/**
 * Auth Provider Component
 * Manages authentication state for both regular users and administrators
 */
export const AuthProvider: React.FC<AuthProviderProps> = ({ 
  children, 
  authService, 
  adminAuthService,
  navigationService
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [admin, setAdmin] = useState<Administrator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, navigate] = useLocation();
  
  // Set the navigation callback in the navigation service
  useEffect(() => {
    navigationService.setNavigateCallback(navigate);
  }, [navigate, navigationService]);
  
  // Set up auth state listeners
  useEffect(() => {
    console.log('Setting up auth state listeners');
    
    // Regular user auth state listener
    const userUnsubscribe = authService.onAuthStateChanged((newUser) => {
      console.log('Auth state changed:', newUser ? `User ${newUser.uid}` : 'User signed out');
      setUser(newUser);
      setIsLoading(false);
    });
    
    // Admin auth state listener
    const adminUnsubscribe = adminAuthService.onAdminAuthStateChanged((newAdmin) => {
      console.log('Admin auth state changed:', newAdmin ? `Admin ${newAdmin.uid}` : 'Admin signed out');
      setAdmin(newAdmin);
      setIsLoading(false);
    });
    
    // Cleanup function
    return () => {
      userUnsubscribe();
      adminUnsubscribe();
    };
  }, [authService, adminAuthService]);
  
  // Authentication methods
  const signIn = async (email: string, password: string): Promise<User> => {
    console.log('Auth Provider: Signing in user', email);
    return authService.signIn(email, password);
  };
  
  const signUp = async (email: string, password: string): Promise<User> => {
    console.log('Auth Provider: Creating new user', email);
    return authService.signUp(email, password);
  };
  
  const signOut = async (): Promise<void> => {
    console.log('Auth Provider: Signing out user');
    
    // Handle the case where both a user and admin are signed in
    if (user) {
      await authService.signOut();
    }
    
    if (admin) {
      await adminAuthService.adminSignOut();
    }
  };
  
  const adminSignIn = async (email: string, password: string): Promise<Administrator> => {
    console.log('Auth Provider: Signing in admin', email);
    return adminAuthService.adminSignIn(email, password);
  };
  
  const adminSignOut = async (): Promise<void> => {
    console.log('Auth Provider: Signing out admin');
    return adminAuthService.adminSignOut();
  };
  
  const verifyMfa = async (code: string): Promise<boolean> => {
    console.log('Auth Provider: Verifying MFA code');
    return adminAuthService.verifyMfa(code);
  };
  
  const setupMfa = async (): Promise<{ qrCodeUrl: string, secret: string }> => {
    console.log('Auth Provider: Setting up MFA');
    return adminAuthService.setupMfa();
  };
  
  const refreshToken = async (forceRefresh: boolean = false): Promise<string | null> => {
    console.log('Auth Provider: Refreshing token', forceRefresh ? '(forced)' : '');
    
    // Try to refresh admin token first
    if (admin) {
      const adminToken = await adminAuthService.refreshAdminToken(forceRefresh);
      return adminToken ? adminToken.token : null;
    }
    
    // Then try regular user token
    if (user) {
      const userToken = await authService.refreshToken(forceRefresh);
      return userToken ? userToken.token : null;
    }
    
    return null;
  };
  
  // Determine authentication status
  const isAuthenticated = !!user;
  const isAdminAuthenticated = !!admin && admin.adminStatus === 'approved';
  
  // Provide auth context to the application
  return (
    <AuthContext.Provider value={{
      user,
      admin,
      isLoading,
      isAuthenticated,
      isAdminAuthenticated,
      signIn,
      signUp,
      signOut,
      adminSignIn,
      adminSignOut,
      verifyMfa,
      setupMfa,
      refreshToken
    }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Custom hook to use the auth context
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};