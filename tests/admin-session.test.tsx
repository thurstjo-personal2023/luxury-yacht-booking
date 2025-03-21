/**
 * Admin Session Management Tests
 * 
 * This file contains tests for the admin session management functionality,
 * including session timeout and refresh mechanics.
 */
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { renderHookWithProviders } from './hook-test-utils';
import { useAdminAuth } from '@/hooks/use-admin-auth';
import { SessionTimer } from '@/components/admin/SessionTimer';

// Mock the admin auth hook
jest.mock('@/hooks/use-admin-auth', () => {
  const originalModule = jest.requireActual('@/hooks/use-admin-auth');
  
  // Create a mock version of the hook
  const mockAdminAuth = {
    adminUser: {
      uid: 'admin-test-uid',
      email: 'admin@example.com',
      mfaEnabled: true,
      mfaVerified: true
    },
    loading: false,
    error: null,
    adminSignIn: jest.fn(),
    adminSignOut: jest.fn(),
    verifyMfa: jest.fn(),
    setupMfa: jest.fn(),
    confirmMfaSetup: jest.fn(),
    refreshSession: jest.fn(),
    sessionTimeout: 900 // 15 minutes
  };
  
  return {
    ...originalModule,
    useAdminAuth: jest.fn(() => mockAdminAuth)
  };
});

// Mock timer functions
jest.useFakeTimers();

describe('Admin Session Management', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Reset the admin auth mock
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: true
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn().mockResolvedValue(undefined),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn().mockResolvedValue(undefined),
      sessionTimeout: 900 // 15 minutes
    }));
  });
  
  it('should refresh session on user activity', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockRefreshSession = jest.fn().mockResolvedValue(undefined);
    
    // Update mock to include refreshSession
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: true
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: jest.fn(),
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: mockRefreshSession,
      sessionTimeout: 900 // 15 minutes
    }));
    
    // Create a simple test component with SessionTimer
    const TestComponent = () => {
      return (
        <div>
          <SessionTimer />
          <button data-testid="test-button">Click Me</button>
        </div>
      );
    };
    
    // Render the test component
    render(<TestComponent />);
    
    // Fire some user activity events
    await act(async () => {
      fireEvent.mouseMove(document);
      fireEvent.click(screen.getByTestId('test-button'));
      fireEvent.keyDown(document.body, { key: 'a' });
    });
    
    // Fast-forward 5 minutes (timeout is 15 minutes, so session should be refreshed)
    await act(async () => {
      jest.advanceTimersByTime(5 * 60 * 1000);
    });
    
    // Verify that refreshSession was called
    expect(mockRefreshSession).toHaveBeenCalled();
  });
  
  it('should sign out user after session timeout', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockAdminSignOut = jest.fn().mockResolvedValue(undefined);
    
    // Update mock to include signOut
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: true
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: mockAdminSignOut,
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn().mockResolvedValue(undefined),
      sessionTimeout: 10 // 10 seconds for faster testing
    }));
    
    // Create a simple test component with SessionTimer
    const TestComponent = () => {
      return (
        <div>
          <SessionTimer />
          <p>Admin Dashboard</p>
        </div>
      );
    };
    
    // Render the test component
    render(<TestComponent />);
    
    // Fast-forward just past the timeout period (10 seconds + 1)
    await act(async () => {
      jest.advanceTimersByTime(11 * 1000);
    });
    
    // Verify that signOut was called
    expect(mockAdminSignOut).toHaveBeenCalled();
  });
  
  it('should not time out if user is active', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockAdminSignOut = jest.fn().mockResolvedValue(undefined);
    const mockRefreshSession = jest.fn().mockResolvedValue(undefined);
    
    // Update mock with signOut and refreshSession
    useAdminAuth.mockImplementation(() => ({
      adminUser: {
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        mfaEnabled: true,
        mfaVerified: true
      },
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: mockAdminSignOut,
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: mockRefreshSession,
      sessionTimeout: 30 // 30 seconds for faster testing
    }));
    
    // Create a simple test component with SessionTimer
    const TestComponent = () => {
      return (
        <div>
          <SessionTimer />
          <button data-testid="test-button">Click Me</button>
        </div>
      );
    };
    
    // Render the test component
    render(<TestComponent />);
    
    // Advance 20 seconds
    await act(async () => {
      jest.advanceTimersByTime(20 * 1000);
    });
    
    // Simulate user activity
    await act(async () => {
      fireEvent.click(screen.getByTestId('test-button'));
    });
    
    // Advance another 20 seconds (total 40 seconds, but with activity at 20s mark)
    await act(async () => {
      jest.advanceTimersByTime(20 * 1000);
    });
    
    // Verify that signOut was NOT called (since timer was reset at 20s mark)
    expect(mockAdminSignOut).not.toHaveBeenCalled();
    
    // Verify that refreshSession WAS called (due to activity)
    expect(mockRefreshSession).toHaveBeenCalled();
  });
  
  it('should not start timer if no admin user', async () => {
    // Get the mock hook
    const { useAdminAuth } = require('@/hooks/use-admin-auth');
    const mockAdminSignOut = jest.fn().mockResolvedValue(undefined);
    
    // Update mock with no admin user
    useAdminAuth.mockImplementation(() => ({
      adminUser: null,
      loading: false,
      error: null,
      adminSignIn: jest.fn(),
      adminSignOut: mockAdminSignOut,
      verifyMfa: jest.fn(),
      setupMfa: jest.fn(),
      confirmMfaSetup: jest.fn(),
      refreshSession: jest.fn(),
      sessionTimeout: 10 // 10 seconds for faster testing
    }));
    
    // Create a simple test component with SessionTimer
    const TestComponent = () => {
      return (
        <div>
          <SessionTimer />
          <p>Login Page</p>
        </div>
      );
    };
    
    // Render the test component
    render(<TestComponent />);
    
    // Advance past timeout
    await act(async () => {
      jest.advanceTimersByTime(20 * 1000);
    });
    
    // Verify that signOut was NOT called (since no active admin user)
    expect(mockAdminSignOut).not.toHaveBeenCalled();
  });
});