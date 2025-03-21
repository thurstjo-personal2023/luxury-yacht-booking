# Admin Authentication Clean Architecture

This document describes the implementation of the admin authentication system using clean architecture principles.

## Architecture Overview

The system is organized into the following layers:

1. **Domain Layer** - Contains business entities, value objects, and domain services
2. **Application Layer** - Contains use cases and interfaces for repositories
3. **Adapter Layer** - Contains implementations of interfaces defined in the application layer
4. **Infrastructure Layer** - Contains framework-specific code (Express routes, controllers)

## Domain Layer

### Entities

- `AdminUser` - Represents an administrator user with identity, credentials, and permissions
- `AdminCredentials` - Represents authentication credentials for an admin user
- `AdminInvitation` - Represents an invitation to create a new admin account

### Value Objects

- `AdminRole` - Enumerates the possible roles for an admin user (SUPER_ADMIN, ADMIN, MODERATOR)
- `Permission` - Represents a specific permission that can be granted to an admin
- `MfaStatus` - Represents the status of Multi-Factor Authentication for an admin

### Domain Services

- `AdminAuthenticationService` - Contains core authentication logic
- `AdminAuthorizationService` - Contains logic for permission checking
- `AdminInvitationService` - Contains logic for creating and verifying invitations

## Application Layer

### Interfaces

- `IAdminRepository` - Interface for admin user persistence
- `IAdminCredentialsRepository` - Interface for admin credentials persistence
- `IAdminInvitationRepository` - Interface for admin invitation persistence
- `IAuthProvider` - Interface for authentication provider

### Use Cases

- `AuthenticateAdminUseCase` - Authenticates an admin user with email and password
- `VerifyAdminMfaUseCase` - Verifies an admin's Multi-Factor Authentication code
- `CreateAdminInvitationUseCase` - Creates an invitation for a new admin
- `VerifyAdminInvitationUseCase` - Verifies an invitation code
- `RegisterAdminUseCase` - Registers a new admin using an invitation

## Adapter Layer

### Repositories

- `FirebaseAdminRepository` - Implements `IAdminRepository` using Firebase Firestore
- `FirebaseAdminCredentialsRepository` - Implements `IAdminCredentialsRepository` using Firebase Firestore
- `FirebaseAdminInvitationRepository` - Implements `IAdminInvitationRepository` using Firebase Firestore

### Auth Provider

- `FirebaseAuthProvider` - Implements `IAuthProvider` using Firebase Authentication

## Infrastructure Layer

### Controllers

- `AdminAuthController` - Handles HTTP requests and responses for admin authentication
- `AdminAuthControllerFactory` - Creates and configures the admin auth controller

### Routes

Routes are registered by the controller factory to handle:
- Admin login
- MFA verification
- Invitation creation
- Invitation verification
- Admin registration

## Dependency Injection

The system uses the factory pattern for dependency injection:

- `AdminAuthFactory` - Creates and configures all components of the admin auth system
- `AdminAuthControllerFactory` - Sets up the controller and registers routes

## Usage Examples

See the examples directory for usage demonstrations:

- `examples/admin-auth/admin-auth-usage.ts` - Basic usage of use cases
- `examples/admin-auth/admin-routes-integration.ts` - Integration with Express app

## Testing

Unit tests are implemented for each layer:

- Domain layer tests focus on business logic
- Application layer tests mock repositories and providers
- Adapter layer tests use Firebase emulator
- Infrastructure layer tests use supertest

## Benefits of Clean Architecture

1. **Separation of Concerns**: Each layer has a specific responsibility
2. **Testability**: Components can be tested in isolation with mocks
3. **Flexibility**: Implementations can be swapped (e.g., replacing Firebase with another database)
4. **Maintainability**: Changes in one layer don't affect others
5. **Independence from Frameworks**: Core business logic is not tied to Express or Firebase

## Implementation Details

### Authentication Flow

1. User submits login credentials
2. System validates credentials and returns a token
3. If MFA is enabled, user is prompted for MFA code
4. User submits MFA code for verification
5. System validates MFA code and grants access

### Invitation Flow

1. Existing admin creates an invitation for a new admin
2. System generates an invitation code
3. Invitation is sent to the new admin's email
4. New admin verifies invitation code
5. New admin completes registration
6. New admin account may require approval depending on settings