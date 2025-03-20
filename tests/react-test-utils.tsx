/**
 * React Testing Utilities
 * 
 * This file provides utilities for testing React components and hooks
 * with proper context providers and mock implementations.
 */
import React, { ReactElement } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/hooks/use-auth';
import { Toaster } from '@/components/ui/toaster';
import { BrowserRouter, Route } from 'wouter';

// Mock the Firebase auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({})),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn((auth, callback) => {
    // By default, simulate signed out
    callback(null);
    return jest.fn(); // Return unsubscribe function
  }),
}));

// Mock axios for API calls
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: {} })),
  post: jest.fn(() => Promise.resolve({ data: {} })),
  put: jest.fn(() => Promise.resolve({ data: {} })),
  delete: jest.fn(() => Promise.resolve({ data: {} })),
}));

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

// Custom render function with all necessary providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routePath?: string;
  queryClient?: QueryClient;
  authUser?: {
    uid: string;
    email: string;
    role?: 'consumer' | 'producer' | 'partner';
    [key: string]: any;
  };
}

/**
 * Custom render function that wraps components with all necessary providers
 */
function customRender(
  ui: ReactElement,
  options: CustomRenderOptions = {}
): RenderResult {
  const {
    route = '/',
    routePath = '*',
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

  // Wrap component with all required providers
  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Route path={routePath}>{children}</Route>
            <Toaster />
          </BrowserRouter>
        </AuthProvider>
      </QueryClientProvider>
    );
  }

  // Set the initial route
  window.history.pushState({}, 'Test page', route);
  
  return render(ui, { wrapper: AllTheProviders, ...renderOptions });
}

/**
 * Custom render for testing a component with only the auth provider
 * Use this when you don't need the router or query client
 */
function renderWithAuth(
  ui: ReactElement,
  authUser: {
    uid: string;
    email: string;
    role?: 'consumer' | 'producer' | 'partner';
    [key: string]: any;
  } | null = null
): RenderResult {
  // If auth user is provided, mock the auth state
  if (authUser) {
    const { getAuth, onAuthStateChanged } = require('firebase/auth');
    (onAuthStateChanged as jest.Mock).mockImplementation((auth, callback) => {
      callback(authUser);
      return jest.fn(); // Return unsubscribe function
    });
  }

  function AuthWrapper({ children }: { children: React.ReactNode }) {
    return <AuthProvider>{children}</AuthProvider>;
  }

  return render(ui, { wrapper: AuthWrapper });
}

/**
 * Factory function to create mock user objects for testing
 */
function createMockUser(role: 'consumer' | 'producer' | 'partner' = 'consumer', overrides = {}) {
  const baseUser = {
    uid: `test-user-${Date.now()}`,
    email: `test-${role}@example.com`,
    displayName: `Test ${role.charAt(0).toUpperCase() + role.slice(1)}`,
    role,
    emailVerified: true,
    getIdToken: jest.fn().mockResolvedValue('mock-id-token'),
    getIdTokenResult: jest.fn().mockResolvedValue({
      claims: { role },
      token: 'mock-id-token',
      authTime: new Date().toISOString(),
      issuedAtTime: new Date().toISOString(),
      expirationTime: new Date(Date.now() + 3600000).toISOString(),
      signInProvider: 'password'
    })
  };

  return { ...baseUser, ...overrides };
}

// Export all utilities
export {
  customRender,
  renderWithAuth,
  createTestQueryClient,
  createMockUser
};

// Re-export everything from testing-library
export * from '@testing-library/react';