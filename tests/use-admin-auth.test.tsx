/**
 * Admin Authentication Hook Tests
 * 
 * This file contains tests for the useAdminAuth hook.
 */
import React from 'react';
import { renderHookWithProviders } from './hook-test-utils';
// Using a relative import instead of the alias to avoid path mapping issues
import { useAdminAuth } from '../client/src/hooks/use-admin-auth';
import { act, waitFor } from '@testing-library/react';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

// Mock Firebase modules
jest.mock('firebase/auth');
jest.mock('firebase/firestore');

// Mock fetch for API calls
global.fetch = jest.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve("")
  })
);

describe('useAdminAuth Hook', () => {
  // Mock implementation setup
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn().mockImplementation(key => null),
        setItem: jest.fn(),
        removeItem: jest.fn()
      },
      writable: true
    });
    
    // Mock basic auth functions
    (getAuth as jest.Mock).mockReturnValue({ currentUser: null });
    (signInWithEmailAndPassword as jest.Mock).mockResolvedValue({
      user: { 
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        getIdToken: jest.fn().mockResolvedValue('mock-token')
      }
    });
    (signOut as jest.Mock).mockResolvedValue(undefined);
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      // Default behavior: no user (signed out)
      callback(null);
      return jest.fn(); // Return unsubscribe function
    });
    
    // Mock Firestore functions
    (doc as jest.Mock).mockReturnValue({});
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        role: 'admin',
        mfaEnabled: true,
        permissions: ['view_admin_dashboard']
      })
    });
    (updateDoc as jest.Mock).mockResolvedValue(undefined);
  });
  
  it('should initialize with null admin user and loading state', () => {
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Verify initial state
    expect(result.current.adminUser).toBeNull();
    expect(result.current.loading).toBeTruthy();
    expect(result.current.error).toBeNull();
  });
  
  it('should handle admin sign in successfully', async () => {
    // Mock successful admin user lookup
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => true,
      data: () => ({
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        role: 'admin',
        mfaEnabled: true,
        permissions: ['view_admin_dashboard']
      })
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call adminSignIn
    await act(async () => {
      await result.current.adminSignIn('admin@example.com', 'password');
    });
    
    // Verify signInWithEmailAndPassword was called with correct args
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(), 
      'admin@example.com', 
      'password'
    );
    
    // Verify localStorage was set
    expect(window.localStorage.setItem).toHaveBeenCalledWith('adminSessionActive', 'true');
    
    // Verify fetch was called for login audit
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/login-audit', expect.anything());
  });
  
  it('should handle sign in failure for non-admin users', async () => {
    // Mock non-admin user (document doesn't exist)
    (getDoc as jest.Mock).mockResolvedValue({
      exists: () => false
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call adminSignIn and expect it to throw
    await expect(
      act(async () => {
        await result.current.adminSignIn('regular@example.com', 'password');
      })
    ).rejects.toThrow();
    
    // Verify signOut was called
    expect(signOut).toHaveBeenCalled();
    
    // Verify localStorage was removed
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('adminSessionActive');
  });
  
  it('should handle sign out', async () => {
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call adminSignOut
    await act(async () => {
      await result.current.adminSignOut();
    });
    
    // Verify signOut was called
    expect(signOut).toHaveBeenCalled();
    
    // Verify localStorage was removed
    expect(window.localStorage.removeItem).toHaveBeenCalledWith('adminSessionActive');
  });
  
  it('should handle MFA verification', async () => {
    // Mock authenticated user
    (getAuth as jest.Mock).mockReturnValue({ 
      currentUser: { 
        uid: 'admin-test-uid' 
      } 
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call verifyMfa with correct code
    await act(async () => {
      const verified = await result.current.verifyMfa('123456');
      expect(verified).toBeTruthy();
    });
    
    // Verify Firestore was updated
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mfaVerified: true
      })
    );
    
    // Call verifyMfa with incorrect code
    await expect(
      act(async () => {
        await result.current.verifyMfa('000000');
      })
    ).rejects.toThrow();
  });
  
  it('should handle MFA setup', async () => {
    // Mock authenticated user
    (getAuth as jest.Mock).mockReturnValue({ 
      currentUser: { 
        uid: 'admin-test-uid' 
      } 
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call setupMfa
    await act(async () => {
      const verificationId = await result.current.setupMfa('+15551234567');
      expect(verificationId).toBe('verification-id-123456');
    });
    
    // Verify Firestore was updated
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        phone: '+15551234567'
      })
    );
  });
  
  it('should handle MFA confirmation', async () => {
    // Mock authenticated user
    (getAuth as jest.Mock).mockReturnValue({ 
      currentUser: { 
        uid: 'admin-test-uid' 
      } 
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Call confirmMfaSetup with correct code
    await act(async () => {
      const confirmed = await result.current.confirmMfaSetup('123456');
      expect(confirmed).toBeTruthy();
    });
    
    // Verify Firestore was updated
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        mfaEnabled: true,
        mfaVerified: true
      })
    );
    
    // Call confirmMfaSetup with incorrect code
    await expect(
      act(async () => {
        await result.current.confirmMfaSetup('000000');
      })
    ).rejects.toThrow();
  });
  
  it('should handle session refresh', async () => {
    // Mock authenticated user
    (getAuth as jest.Mock).mockReturnValue({ 
      currentUser: { 
        uid: 'admin-test-uid',
        getIdToken: jest.fn().mockResolvedValue('mock-token')
      } 
    });
    
    // Setup admin user in hook state
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback({
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        getIdToken: jest.fn().mockResolvedValue('mock-token')
      });
      return jest.fn(); // Return unsubscribe function
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Wait for admin user to be set
    await waitFor(() => {
      expect(result.current.adminUser).not.toBeNull();
    });
    
    // Call refreshSession
    await act(async () => {
      await result.current.refreshSession();
    });
    
    // Verify Firestore was updated
    expect(updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        lastActivityAt: expect.any(Date)
      })
    );
    
    // Verify API was called
    expect(global.fetch).toHaveBeenCalledWith('/api/admin/activity', expect.anything());
  });
  
  it('should handle auth state changes', async () => {
    // Simulate auth state change to logged in
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      // Simulate signed in state
      callback({
        uid: 'admin-test-uid',
        email: 'admin@example.com',
        displayName: 'Admin User'
      });
      return jest.fn(); // Return unsubscribe function
    });
    
    // Render the hook
    const { result } = renderHookWithProviders(() => useAdminAuth());
    
    // Wait for admin user to be set
    await waitFor(() => {
      expect(result.current.adminUser).not.toBeNull();
    });
    
    // Verify admin user properties
    expect(result.current.adminUser?.email).toBe('admin@example.com');
    
    // Simulate auth state change to logged out
    act(() => {
      const authStateCallback = (onAuthStateChanged as jest.Mock).mock.calls[0][1];
      authStateCallback(null);
    });
    
    // Verify admin user is null
    expect(result.current.adminUser).toBeNull();
  });
});