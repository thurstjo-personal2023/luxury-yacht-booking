/**
 * Hook Testing Utilities
 * 
 * This file provides utilities specifically for testing React hooks
 * with proper context and environment simulation.
 * Updated for compatibility with React 18.
 */
import { renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { createMockUser } from './react-test-utils';

// Mock Auth Provider
const AuthProvider = ({ children }: { children: ReactNode }) => {
  return <>{children}</>;
};

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0, // In React Query v5, cacheTime was renamed to gcTime
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

/**
 * Custom renderHook function that wraps hooks with all necessary providers
 */
function renderHookWithProviders<Result, Props>(
  callback: (props: Props) => Result,
  options: {
    initialProps?: Props;
    queryClient?: QueryClient;
    authUser?: {
      uid: string;
      email: string;
      role?: 'consumer' | 'producer' | 'partner';
      [key: string]: any;
    } | null;
  } = {}
) {
  const {
    initialProps,
    queryClient = createTestQueryClient(),
    authUser = null,
  } = options;

  // If auth user is provided, mock the auth state
  if (authUser) {
    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(authUser);
      return jest.fn(); // Return unsubscribe function
    });
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {children}
      </AuthProvider>
    </QueryClientProvider>
  );

  return renderHook(callback, { wrapper, initialProps });
}

/**
 * Render a hook with only the Auth provider
 */
function renderHookWithAuth<Result, Props>(
  callback: (props: Props) => Result,
  options: {
    initialProps?: Props;
    authUser?: {
      uid: string;
      email: string;
      role?: 'consumer' | 'producer' | 'partner';
      [key: string]: any;
    } | null;
  } = {}
) {
  const { initialProps, authUser = null } = options;
  
  // If auth user is provided, mock the auth state
  if (authUser) {
    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(authUser);
      return jest.fn(); // Return unsubscribe function
    });
  }

  const wrapper = ({ children }: { children: ReactNode }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  return renderHook(callback, { wrapper, initialProps });
}

/**
 * Render a hook with only the Query client provider
 */
function renderHookWithQuery<Result, Props>(
  callback: (props: Props) => Result,
  options: {
    initialProps?: Props;
    queryClient?: QueryClient;
  } = {}
) {
  const { initialProps, queryClient = createTestQueryClient() } = options;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(callback, { wrapper, initialProps });
}

// Mock hook for forms
const mockUseForm = () => {
  return {
    register: jest.fn(),
    handleSubmit: jest.fn(cb => data => cb(data)),
    formState: {
      isSubmitting: false,
      errors: {},
    },
    reset: jest.fn(),
    setValue: jest.fn(),
    watch: jest.fn(),
    control: {},
    getValues: jest.fn(),
  };
};

// Export everything
export {
  renderHookWithProviders,
  renderHookWithAuth,
  renderHookWithQuery,
  createTestQueryClient,
  mockUseForm,
  createMockUser,
};

// Re-export everything from testing-library for hooks
export * from '@testing-library/react';