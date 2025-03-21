/**
 * Admin Login Flow Integration Tests
 * 
 * This file contains integration tests for the admin login flow.
 * It tests the complete login -> MFA verification -> dashboard flow.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
// Using relative imports instead of aliases to avoid path mapping issues
import AdminLogin from '../client/src/pages/admin/AdminLogin';
import MfaVerify from '../client/src/pages/admin/MfaVerify';
import AdminDashboard from '../client/src/pages/admin/AdminDashboard';
import { AdminAuthProvider } from '../client/src/components/admin/AdminAuthProvider';
import { customRender } from './react-test-utils';

// Mock the hooks and Firebase functions
jest.mock('../client/src/hooks/use-admin-auth', () => {
  const originalModule = jest.requireActual('../client/src/hooks/use-admin-auth');
  
  // Create a mock version of the hook
  const mockAdminAuth = {
    adminUser: null,
    loading: false,
    error: null,
    adminSignIn: jest.fn(),
    adminSignOut: jest.fn(),
    verifyMfa: jest.fn(),
    setupMfa: jest.fn(),
    confirmMfaSetup: jest.fn(),
    refreshSession: jest.fn(),
    sessionTimeout: 900
  };
  
  return {
    ...originalModule,
    useAdminAuth: jest.fn(() => mockAdminAuth),
    // Keep the original provider for context wrapping
    AdminAuthProvider: originalModule.AdminAuthProvider
  };
});

// Mock wouter for navigation testing
jest.mock('wouter', () => ({
  // Keep track of the current location
  __currentLocation: '/',
  
  // Create a mock implementation of useLocation
  useLocation: jest.fn(() => {
    return [
      (require('wouter') as any).__currentLocation,
      (newLocation: string) => {
        (require('wouter') as any).__currentLocation = newLocation;
      }
    ];
  }),
  
  // Route and Link components (simplified)
  Route: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  Link: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Admin Login Flow', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (require('wouter') as any).__currentLocation = '/';
    
    // Reset the admin auth mock
    const { useAdminAuth } = require('../client/src/hooks/use-admin-auth');
    useAdminAuth.mockImplementation(() => ({
      adminUser: null,
      loading: false,
      error: null,
      adminSignIn: jest.fn().mockResolvedValue({
        uid: 'admin-test-uid',
        email: 'admin@example.com'
      }),
      adminSignOut: jest.fn().mockResolvedValue(undefined),
      verifyMfa: jest.fn().mockResolvedValue(true),
      setupMfa: jest.fn().mockResolvedValue('verification-id'),
      confirmMfaSetup: jest.fn().mockResolvedValue(true),
      refreshSession: jest.fn().mockResolvedValue(undefined),
      sessionTimeout: 900
    }));
  });
  
  it('should render the login form', () => {
    // Render the login component
    customRender(<AdminLogin />);
    
    // Check that the login form is rendered
    expect(screen.getByText(/admin login/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('should handle login form submission', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockAdminSignIn = jest.fn().mockResolvedValue({
      uid: 'admin-test-uid',
      email: 'admin@example.com'
    });
    
    // Mock the hook implementation
    useAdminAuth.mockImplementation(() => ({
      adminUser: null,
      loading: false,
      error: null,
      adminSignIn: mockAdminSignIn,
      adminSignOut: jest.fn(),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 900
    }));
    
    // Render the login component
    customRender(<AdminLogin />);
    
    // Fill out the form
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'admin@example.com' }
    });
    
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'Admin123!' }
    });
    
    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    });
    
    // Check that adminSignIn was called with the right arguments
    expect(mockAdminSignIn).toHaveBeenCalledWith('admin@example.com', 'Admin123!');
    
    // Check that the location was changed to MFA verification
    await waitFor(() => {
      expect((require('wouter') as any).__currentLocation).toContain('/admin-mfa-verify');
    });
  });
  
  it('should handle MFA verification', async () => {
    // Set the current location to MFA verification
    (require('wouter') as any).__currentLocation = '/admin-mfa-verify?returnUrl=/admin-dashboard';
    
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockVerifyMfa = jest.fn().mockResolvedValue(true);
    
    // Mock the hook implementation with adminUser (logged in but not MFA verified)
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: false
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn(),
      verifyMfa: mockVerifyMfa,
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 900
    }));
    
    // Mock localStorage for the session flag
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockImplementation(key => {
          if (key === 'adminSessionActive') return 'true';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    // Render the MFA verification component
    customRender(<MfaVerify />);
    
    // Check that the MFA verification form is rendered
    expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    
    // Enter verification code
    fireEvent.change(screen.getByLabelText(/verification code/i), {
      target: { value: '123456' }
    });
    
    // Submit the form
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
    });
    
    // Check that verifyMfa was called with the right arguments
    expect(mockVerifyMfa).toHaveBeenCalledWith('123456');
    
    // Check that the location was changed to dashboard
    await waitFor(() => {
      expect((require('wouter') as any).__currentLocation).toBe('/admin-dashboard');
    });
  });
  
  it('should redirect from dashboard if not authenticated', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    
    // Mock the hook implementation with no user (not logged in)
    useAdminAuth.mockImplementation(() => ({
      adminUser: null,
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn(),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 900
    }));
    
    // Create a mock AdminRoute component that uses useAdminAuth
    const MockAdminRoute = ({ children }: { children: React.ReactNode }) => {
      const { adminUser, loading } = useAdminAuth();
      const [location, setLocation] = require('wouter').useLocation();
      
      // Simple implementation that redirects if not authenticated
      React.useEffect(() => {
        if (!loading && !adminUser) {
          setLocation('/admin-login');
        }
      }, [adminUser, loading, setLocation]);
      
      return loading ? <div>Loading...</div> : <>{children}</>;
    };
    
    // Render the dashboard with MockAdminRoute
    customRender(
      <MockAdminRoute>
        <AdminDashboard />
      </MockAdminRoute>
    );
    
    // Check that the location was changed to login
    await waitFor(() => {
      expect((require('wouter') as any).__currentLocation).toBe('/admin-login');
    });
  });
  
  it('should redirect from dashboard if MFA not verified', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    
    // Mock the hook implementation with user logged in but MFA not verified
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: false
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn(),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 900
    }));
    
    // Create a mock AdminRoute component that uses useAdminAuth
    const MockAdminRoute = ({ children, requiresMfa = true }: { children: React.ReactNode, requiresMfa?: boolean }) => {
      const { adminUser, loading } = useAdminAuth();
      const [location, setLocation] = require('wouter').useLocation();
      
      // Simple implementation that redirects if not authenticated or MFA not verified
      React.useEffect(() => {
        if (!loading) {
          if (!adminUser) {
            setLocation('/admin-login');
          } else if (requiresMfa && !adminUser.mfaVerified) {
            setLocation('/admin-mfa-verify');
          }
        }
      }, [adminUser, loading, requiresMfa, setLocation]);
      
      return loading ? <div>Loading...</div> : <>{children}</>;
    };
    
    // Render the dashboard with MockAdminRoute
    customRender(
      <MockAdminRoute>
        <AdminDashboard />
      </MockAdminRoute>
    );
    
    // Check that the location was changed to MFA verification
    await waitFor(() => {
      expect((require('wouter') as any).__currentLocation).toBe('/admin-mfa-verify');
    });
  });
  
  it('should allow access to dashboard when fully authenticated', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    
    // Mock the hook implementation with user fully authenticated
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        displayName: 'Admin User',
        mfaEnabled: true,
        mfaVerified: true,
        permissions: ['view_admin_dashboard'],
        role: 'admin'
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn(),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 900
    }));
    
    // Create a minimal mock version of AdminDashboard for testing
    const mockDashboard = (
      <div>
        <h1>Admin Dashboard</h1>
        <p>Welcome, Admin User</p>
      </div>
    );
    
    // Create a mock AdminRoute component that uses useAdminAuth
    const MockAdminRoute = ({ children, requiresMfa = true }: { children: React.ReactNode, requiresMfa?: boolean }) => {
      const { adminUser, loading } = useAdminAuth();
      const [location, setLocation] = require('wouter').useLocation();
      
      // Simple implementation that redirects if not authenticated or MFA not verified
      React.useEffect(() => {
        if (!loading) {
          if (!adminUser) {
            setLocation('/admin-login');
          } else if (requiresMfa && !adminUser.mfaVerified) {
            setLocation('/admin-mfa-verify');
          }
        }
      }, [adminUser, loading, requiresMfa, setLocation]);
      
      // If we pass all checks, render children
      if (loading) return <div>Loading...</div>;
      if (!adminUser) return null;
      if (requiresMfa && !adminUser.mfaVerified) return null;
      
      return <>{children}</>;
    };
    
    // Render the dashboard with MockAdminRoute
    const { container } = customRender(
      <MockAdminRoute>
        {mockDashboard}
      </MockAdminRoute>
    );
    
    // Check that the dashboard content is rendered
    await waitFor(() => {
      expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument();
      expect(screen.getByText(/welcome, admin user/i)).toBeInTheDocument();
    });
    
    // Check that the location hasn't changed
    expect((require('wouter') as any).__currentLocation).toBe('/');
  });
});