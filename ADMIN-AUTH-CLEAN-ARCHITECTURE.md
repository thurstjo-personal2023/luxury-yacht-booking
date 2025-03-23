# Clean Architecture Authentication System

This document provides an overview of the Clean Architecture Authentication System implemented for the Etoile Yachts platform.

## Architecture Overview

The authentication system follows Clean Architecture principles to achieve:

1. Separation of concerns
2. Independence of frameworks and UI
3. Testability and maintainability
4. Role-specific authentication flows

## Directory Structure

```
├── core/
│   ├── domain/
│   │   └── auth/
│   │       ├── user.ts               # User and Administrator entities
│   │       ├── auth-token.ts         # Token value object
│   │       └── auth-exceptions.ts    # Domain-specific exceptions
│   └── application/
│       ├── auth/
│       │   ├── auth-service.interface.ts   # Auth service interfaces
│       │   ├── auth-use-cases.ts           # Regular user auth use cases
│       │   └── admin-auth-use-cases.ts     # Admin-specific auth use cases
│       ├── repositories/
│       │   ├── user-repository.interface.ts    # User repository interface
│       │   └── admin-repository.interface.ts   # Admin repository interface
│       └── services/
│           └── navigation-service.interface.ts  # Navigation service interface
├── infrastructure/
│   └── adapter/
│       ├── firebase-auth-service.ts        # Firebase auth implementation
│       ├── firebase-admin-auth-service.ts  # Firebase admin auth implementation
│       ├── firestore-user-repository.ts    # Firestore user repository
│       ├── firestore-admin-repository.ts   # Firestore admin repository
│       └── wouter-navigation-service.ts    # Navigation service implementation
└── client/
    ├── src/
    │   ├── providers/
    │   │   └── auth-provider.tsx     # Context provider for auth state
    │   ├── components/
    │   │   └── routing/
    │   │       └── PrivateRoute.tsx  # Route protection component
    │   ├── hooks/
    │   │   └── use-auth.ts           # Hook for accessing auth in components
    │   └── App.refactored.tsx        # Example refactored app component
```

## Layers Explanation

### Domain Layer (core/domain)

Contains the business entities and rules of the authentication system:

- `User` and `Administrator` entities define the core data structures
- `AuthToken` value object represents authentication tokens
- Domain-specific exceptions for error handling

### Application Layer (core/application)

Contains the application-specific business rules:

- Interface definitions for services and repositories
- Use cases that orchestrate the domain entities
- Separate interfaces for regular users and administrators

### Interface Adapters (infrastructure/adapter)

Adapts the interfaces defined in the application layer to external frameworks:

- Firebase implementations of authentication services
- Firestore implementations of repositories
- Navigation service implementation using wouter

### Infrastructure Layer (client/src)

Contains the frameworks and UI components:

- React components for auth providers and routes
- Hooks for accessing authentication state
- Route protection mechanism

## Authentication Flows

### Regular User Authentication:

1. User enters credentials in Login/Register component
2. Component calls `signIn`/`signUp` methods from auth hook
3. Auth hook delegates to authentication provider
4. Provider uses the Firebase auth service implementation
5. Service handles authentication and stores the result
6. UI updates based on authentication state

### Administrator Authentication:

1. Admin enters credentials in Admin Login component
2. Component calls `adminSignIn` method from auth hook
3. Auth hook delegates to authentication provider
4. Provider uses the Firebase admin auth service implementation
5. Service verifies the user is an admin and handles MFA if required
6. UI updates based on admin authentication state

## Benefits of This Architecture

1. **Separation of Concerns**: Authentication logic is separate from UI components
2. **Testability**: Each layer can be tested independently
3. **Maintainability**: Changes to one layer don't affect others
4. **Role Separation**: Clear separation between regular users and administrators
5. **Dependency Inversion**: High-level modules don't depend on low-level modules
6. **Domain-Driven Design**: Focus on business rules and use cases

## Implementation Notes

### Authentication Service

- Handles authentication operations for users or administrators
- Manages login state, tokens, and sessions
- Communicates with Firebase Auth

### Repository Classes

- Handle data persistence for user profiles and admin accounts
- Manage the transition between different role collections
- Implement MFA-related functionality for admins

### Component Structure

- `AuthProvider`: Context provider that manages auth state
- `PrivateRoute`: Route wrapper that enforces authentication and role checks
- `useAuth`: Hook that provides an interface for components to access auth state

## Usage Example

```tsx
// In a component that needs authentication
import { useAuth } from '../hooks/use-auth';

function LoginPage() {
  const { signIn, isAuthenticated, user } = useAuth();
  
  const handleLogin = async (email, password) => {
    try {
      await signIn(email, password);
      // Success, user will be redirected
    } catch (error) {
      // Handle error
    }
  };
  
  return (
    // Login form UI
  );
}
```

## Middleware and Route Protection

```tsx
// In App.tsx or routing configuration
<Route path="/dashboard/producer">
  <PrivateRoute routeType="producer">
    <ProducerDashboard />
  </PrivateRoute>
</Route>
```

The `PrivateRoute` component ensures that:

1. User is authenticated
2. User has the appropriate role
3. Redirects to login if not authenticated
4. Redirects to dashboard if authenticated but wrong role