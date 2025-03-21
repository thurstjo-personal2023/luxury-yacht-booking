/**
 * Admin MFA Setup and Verification Tests
 * 
 * This file contains tests for the MFA setup and verification functionality
 * for administrator accounts.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { customRender } from './react-test-utils';
import MfaSetup from '@/pages/admin/MfaSetup';
import MfaVerify from '@/pages/admin/MfaVerify';

// Mock the admin auth hook
jest.mock('@/hooks/use-admin-auth', () => {
  const originalModule = jest.requireActual('@/hooks/use-admin-auth');
  
  // Create a mock version of the hook
  const mockAdminAuth = {
    adminUser: {
      uid: 'admin-test-uid',
      email: 'admin@example.com',
      mfaEnabled: false,
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
  };
  
  return {
    ...originalModule,
    useAdminAuth: jest.fn(() => mockAdminAuth)
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

// Mock toast hook
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn(() => ({
    toast: jest.fn()
  }))
}));

describe('Admin MFA Functionality', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    (require('wouter') as any).__currentLocation = '/';
    
    // Mock localStorage for session flag
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(key => {
          if (key === 'adminSessionActive') return 'true';
          return null;
        }),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
  });
  
  describe('MFA Setup', () => {
    it('should render the MFA setup form', () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      
      // Mock the hook with admin user that needs MFA setup
      useAdminAuth.mockImplementation(() => ({
        adminUser: {
          uid: 'admin-test-uid',
          email: 'admin@example.com',
          mfaEnabled: false,
          mfaVerified: false
        },
        loading: false,
        error: null,
        adminSignIn: jest.fn(),
        adminSignOut: jest.fn(),
        verifyMfa: jest.fn(),
        setupMfa: jest.fn().mockResolvedValue('verification-id'),
        confirmMfaSetup: jest.fn(),
        refreshSession: jest.fn(),
        sessionTimeout: 900
      }));
      
      // Render the MFA setup component
      customRender(<MfaSetup />);
      
      // Check that the MFA setup form is rendered
      expect(screen.getByText(/multi-factor authentication setup/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/phone number/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send verification code/i })).toBeInTheDocument();
    });
    
    it('should handle phone number submission', async () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      const mockSetupMfa = jest.fn().mockResolvedValue('verification-id');
      
      // Mock the hook with setupMfa function
      useAdminAuth.mockImplementation(() => ({
        adminUser: {
          uid: 'admin-test-uid',
          email: 'admin@example.com',
          mfaEnabled: false,
          mfaVerified: false
        },
        loading: false,
        error: null,
        adminSignIn: jest.fn(),
        adminSignOut: jest.fn(),
        verifyMfa: jest.fn(),
        setupMfa: mockSetupMfa,
        confirmMfaSetup: jest.fn(),
        refreshSession: jest.fn(),
        sessionTimeout: 900
      }));
      
      // Render the MFA setup component
      customRender(<MfaSetup />);
      
      // Enter phone number
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+15551234567' }
      });
      
      // Submit the form
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
      });
      
      // Check that setupMfa was called with the correct arguments
      expect(mockSetupMfa).toHaveBeenCalledWith('+15551234567');
      
      // Check that the verification code form is now displayed
      await waitFor(() => {
        expect(screen.getByText(/verification code sent/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
    });
    
    it('should handle verification code submission', async () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      const mockConfirmMfaSetup = jest.fn().mockResolvedValue(true);
      
      // Mock the hook with confirmMfaSetup function
      useAdminAuth.mockImplementation(() => ({
        adminUser: {
          uid: 'admin-test-uid',
          email: 'admin@example.com',
          mfaEnabled: false,
          mfaVerified: false
        },
        loading: false,
        error: null,
        adminSignIn: jest.fn(),
        adminSignOut: jest.fn(),
        verifyMfa: jest.fn(),
        setupMfa: jest.fn().mockResolvedValue('verification-id'),
        confirmMfaSetup: mockConfirmMfaSetup,
        refreshSession: jest.fn(),
        sessionTimeout: 900
      }));
      
      // Render the MFA setup component with verification code form displayed
      customRender(<MfaSetup />);
      
      // Enter phone number and submit to get to verification step
      fireEvent.change(screen.getByLabelText(/phone number/i), {
        target: { value: '+15551234567' }
      });
      
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /send verification code/i }));
      });
      
      // Now enter verification code
      await waitFor(() => {
        expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      });
      
      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: '123456' }
      });
      
      // Submit the verification code form
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
      });
      
      // Check that confirmMfaSetup was called with the correct arguments
      expect(mockConfirmMfaSetup).toHaveBeenCalledWith('123456');
      
      // Check that we're redirected after successful verification
      await waitFor(() => {
        expect((require('wouter') as any).__currentLocation).toContain('/admin-dashboard');
      });
    });
  });
  
  describe('MFA Verification', () => {
    it('should render the MFA verification form', () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      
      // Mock the hook with admin user that has MFA enabled but not verified
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
      
      // Render the MFA verification component
      customRender(<MfaVerify />);
      
      // Check that the MFA verification form is rendered
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /verify code/i })).toBeInTheDocument();
    });
    
    it('should redirect if not authenticated', async () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      
      // Mock the hook with no admin user
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
      
      // Mock localStorage for session flag
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => null), // No active session
          setItem: jest.fn(),
          removeItem: jest.fn()
        },
        writable: true
      });
      
      // Render the MFA verification component
      customRender(<MfaVerify />);
      
      // Check that we're redirected to login
      await waitFor(() => {
        expect((require('wouter') as any).__currentLocation).toBe('/admin-login');
      });
    });
    
    it('should handle verification code submission', async () => {
      // Get the mock hook
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      const mockVerifyMfa = jest.fn().mockResolvedValue(true);
      
      // Mock the hook with verifyMfa function
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
      
      // Set up return URL in query params
      (require('wouter') as any).__currentLocation = '/admin-mfa-verify?returnUrl=/admin-dashboard';
      
      // Render the MFA verification component
      customRender(<MfaVerify />);
      
      // Enter verification code
      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: '123456' }
      });
      
      // Submit the form
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
      });
      
      // Check that verifyMfa was called with the correct arguments
      expect(mockVerifyMfa).toHaveBeenCalledWith('123456');
      
      // Check that we're redirected to the return URL
      await waitFor(() => {
        expect((require('wouter') as any).__currentLocation).toBe('/admin-dashboard');
      });
    });
    
    it('should handle verification failure', async () => {
      // Get the mock hook and toast
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      const mockVerifyMfa = jest.fn().mockRejectedValue(new Error('Invalid verification code'));
      const { useToast } = require('@/hooks/use-toast');
      const mockToast = jest.fn();
      
      // Mock the hook and toast
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
      
      useToast.mockImplementation(() => ({
        toast: mockToast
      }));
      
      // Render the MFA verification component
      customRender(<MfaVerify />);
      
      // Enter verification code
      fireEvent.change(screen.getByLabelText(/verification code/i), {
        target: { value: '000000' }
      });
      
      // Submit the form
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /verify code/i }));
      });
      
      // Check that verifyMfa was called with the incorrect code
      expect(mockVerifyMfa).toHaveBeenCalledWith('000000');
      
      // Check that a toast error was shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Verification Failed',
            variant: 'destructive'
          })
        );
      });
      
      // Check that we're still on the verification page (not redirected)
      expect((require('wouter') as any).__currentLocation).toContain('/admin-mfa-verify');
    });
    
    it('should handle resend code', async () => {
      // Get the mock hook and toast
      const { useAdminAuth } = require('@/hooks/use-admin-auth');
      const { useToast } = require('@/hooks/use-toast');
      const mockToast = jest.fn();
      
      // Mock the hook and toast
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
      
      useToast.mockImplementation(() => ({
        toast: mockToast
      }));
      
      // Render the MFA verification component
      customRender(<MfaVerify />);
      
      // Click the resend code button
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /resend verification code/i }));
      });
      
      // Check that a toast confirmation was shown
      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Verification Code Sent',
          })
        );
      });
    });
  });
});