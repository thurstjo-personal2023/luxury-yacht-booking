/**
 * Hook Testing Utilities
 * 
 * This file provides utilities specifically for testing React hooks
 * with proper context and environment simulation.
 */
import { renderHook, RenderHookOptions, RenderHookResult } from '@testing-library/react-hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode } from 'react';
import { AuthProvider } from '@/hooks/use-auth';
import { createMockUser } from './react-test-utils';

// Create a fresh QueryClient for each test
function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        cacheTime: 0,
        staleTime: 0,
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

interface CustomRenderHookOptions<TProps> extends RenderHookOptions<TProps> {
  queryClient?: QueryClient;
  authUser?: {
    uid: string;
    email: string;
    role?: 'consumer' | 'producer' | 'partner';
    [key: string]: any;
  };
}

/**
 * Custom renderHook function that wraps hooks with all necessary providers
 */
function renderHookWithProviders<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: CustomRenderHookOptions<TProps> = {}
): RenderHookResult<TProps, TResult> {
  const {
    queryClient = createTestQueryClient(),
    authUser = null,
    ...renderOptions
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

  return renderHook(hook, { wrapper, ...renderOptions });
}

/**
 * Render a hook with only the Auth provider
 */
function renderHookWithAuth<TProps, TResult>(
  hook: (props: TProps) => TResult,
  authUser: {
    uid: string;
    email: string;
    role?: 'consumer' | 'producer' | 'partner';
    [key: string]: any;
  } | null = null,
  options: RenderHookOptions<TProps> = {}
): RenderHookResult<TProps, TResult> {
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

  return renderHook(hook, { wrapper, ...options });
}

/**
 * Render a hook with only the Query client provider
 */
function renderHookWithQuery<TProps, TResult>(
  hook: (props: TProps) => TResult,
  options: RenderHookOptions<TProps> & { queryClient?: QueryClient } = {}
): RenderHookResult<TProps, TResult> {
  const { queryClient = createTestQueryClient(), ...renderOptions } = options;

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return renderHook(hook, { wrapper, ...renderOptions });
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

// Re-export testing hooks
export * from '@testing-library/react-hooks';