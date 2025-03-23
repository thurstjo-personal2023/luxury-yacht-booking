/**
 * Auth Service Hook
 * 
 * This hook provides a way to use the AuthService in React components.
 * It follows the clean architecture principles by maintaining a separation
 * between the UI and the service layer.
 */

import { useState, useEffect, useCallback } from 'react';
import { User as FirebaseUser } from 'firebase/auth';
import { authService, UserProfileData, AuthResult } from './auth-service';
import { toast } from '@/hooks/use-toast';

export interface AuthServiceHookResult {
  // Authentication state
  isAuthenticated: boolean;
  isLoading: boolean;
  user: FirebaseUser | null;
  
  // User profile data
  profileData: UserProfileData;
  
  // Authentication methods
  login: (email: string, password: string) => Promise<FirebaseUser>;
  register: (email: string, password: string, name: string, role: string) => Promise<FirebaseUser>;
  logout: () => Promise<void>;
  refreshUserData: () => Promise<void>;
  
  // Error state
  error: string | null;
  clearError: () => void;
}

/**
 * Hook to use the AuthService
 */
export function useAuthService(): AuthServiceHookResult {
  // Authentication state
  const [user, setUser] = useState<FirebaseUser | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // User profile data
  const [profileData, setProfileData] = useState<UserProfileData>({
    harmonizedUser: null,
    touristProfile: null,
    serviceProviderProfile: null
  });
  
  // Setup auth state listener
  useEffect(() => {
    console.log('useAuthService: Setting up auth state listener');
    
    // Handle initial auth state
    setIsLoading(true);
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    
    if (currentUser) {
      // Fetch profile data for current user
      authService.fetchUserProfile(currentUser.uid)
        .then(data => {
          setProfileData(data);
          setIsLoading(false);
        })
        .catch(err => {
          console.error('useAuthService: Error fetching initial profile data:', err);
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
    
    // Set up auth state change listener
    const unsubscribeAuthState = authService.onAuthStateChanged((newUser) => {
      console.log('useAuthService: Auth state changed:', newUser ? 'User signed in' : 'User signed out');
      setUser(newUser);
      
      if (newUser) {
        // Fetch profile data when user signs in
        authService.fetchUserProfile(newUser.uid)
          .then(data => {
            setProfileData(data);
          })
          .catch(err => {
            console.error('useAuthService: Error fetching profile data on auth change:', err);
          });
      } else {
        // Clear profile data when user signs out
        setProfileData({
          harmonizedUser: null,
          touristProfile: null,
          serviceProviderProfile: null
        });
      }
    });
    
    // Set up token change listener to refresh profile data when claims change
    const unsubscribeTokenChange = authService.onIdTokenChanged((tokenUser) => {
      if (tokenUser) {
        // Only refresh profile if user is already set (avoid duplicate fetches during login)
        if (user && user.uid === tokenUser.uid) {
          authService.fetchUserProfile(tokenUser.uid)
            .then(data => {
              setProfileData(data);
            })
            .catch(err => {
              console.error('useAuthService: Error fetching profile data on token change:', err);
            });
        }
      }
    });
    
    // Cleanup
    return () => {
      unsubscribeAuthState();
      unsubscribeTokenChange();
    };
  }, [user]);
  
  /**
   * Clear current error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  /**
   * Login with email and password
   */
  const login = useCallback(async (email: string, password: string): Promise<FirebaseUser> => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await authService.signIn(email, password);
      
      // Show success toast
      toast({
        title: 'Logged in successfully',
        description: 'Welcome back!',
        duration: 3000,
      });
      
      return result.user;
    } catch (error: any) {
      console.error('useAuthService: Login error:', error);
      
      // Set error message
      const errorMessage = error.friendlyMessage || 'Failed to log in. Please check your credentials and try again.';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: 'Login failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  /**
   * Register new user
   */
  const register = useCallback(async (
    email: string, 
    password: string, 
    name: string, 
    role: string
  ): Promise<FirebaseUser> => {
    setIsLoading(true);
    clearError();
    
    try {
      const result = await authService.register(email, password, name, role);
      
      // Show success toast
      toast({
        title: 'Registration successful',
        description: 'Your account has been created.',
        duration: 3000,
      });
      
      return result.user;
    } catch (error: any) {
      console.error('useAuthService: Registration error:', error);
      
      // Set error message
      const errorMessage = error.friendlyMessage || 'Failed to register. Please try again.';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: 'Registration failed',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  /**
   * Logout current user
   */
  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    clearError();
    
    try {
      await authService.signOut();
      
      // Show success toast
      toast({
        title: 'Logged out successfully',
        description: 'You have been signed out.',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('useAuthService: Logout error:', error);
      
      // Set error message
      const errorMessage = error.message || 'Failed to sign out. Please try again.';
      setError(errorMessage);
      
      // Show error toast
      toast({
        title: 'Error signing out',
        description: errorMessage,
        variant: 'destructive',
        duration: 5000,
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [clearError]);
  
  /**
   * Refresh user profile data
   */
  const refreshUserData = useCallback(async (): Promise<void> => {
    if (!user) {
      console.warn('useAuthService: Cannot refresh data - no authenticated user');
      return;
    }
    
    try {
      const data = await authService.fetchUserProfile(user.uid);
      setProfileData(data);
    } catch (error: any) {
      console.error('useAuthService: Error refreshing user data:', error);
      
      // Show error toast
      toast({
        title: 'Error refreshing profile',
        description: 'Failed to refresh your profile data. Please try again.',
        variant: 'destructive',
        duration: 5000,
      });
      
      throw error;
    }
  }, [user]);
  
  return {
    isAuthenticated: !!user,
    isLoading,
    user,
    profileData,
    login,
    register,
    logout,
    refreshUserData,
    error,
    clearError
  };
}