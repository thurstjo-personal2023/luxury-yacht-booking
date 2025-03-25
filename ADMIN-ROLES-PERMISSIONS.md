# Administrator Role Management System

This document provides detailed information about the administrator role management system implemented in the Etoile Yachts platform.

## 1. Role Hierarchy

Administrators in the Etoile Yachts platform follow a hierarchical role structure:

1. **SUPER_ADMIN**: Highest level of access with full platform control
2. **ADMIN**: Elevated access with management capabilities
3. **MODERATOR**: Basic administrative access with limited capabilities

The role hierarchy follows a strict permission model where higher roles have all the permissions of lower roles.

```
SUPER_ADMIN > ADMIN > MODERATOR
```

## 2. Role Permissions

### 2.1 SUPER_ADMIN Permissions

Super Administrators have complete control over the platform administration:

- Create and manage all types of administrator accounts
- Modify roles for any administrator
- Delete administrator accounts
- Access all administration features
- Invite new administrators with any role
- Approve or reject administrator registrations
- View and run system-wide validation tools
- Configure system settings
- Access all audit logs and analytics

### 2.2 ADMIN Permissions

Administrators have elevated access but with some restrictions:

- Create and manage MODERATOR accounts
- Cannot create or modify SUPER_ADMIN accounts
- Cannot modify roles of administrators at the same or higher level
- Invite new administrators with MODERATOR role only
- Approve or reject administrator registrations
- View and run system-wide validation tools
- View analytics data and basic system settings
- Access audit logs related to their actions and those of MODERATOR accounts

### 2.3 MODERATOR Permissions

Moderators have basic administrative access:

- Cannot create or manage other administrator accounts
- Cannot invite new administrators
- Cannot approve or reject registrations
- Cannot modify roles or statuses of any administrator
- Can view basic analytics data
- Can view their own profile information
- Can run basic validation tools with user-facing impacts
- Limited access to audit logs (only their own actions)

## 3. Permission Implementation

The role-based permission system is implemented through several key components:

### 3.1 Backend Permission Middleware

The backend API uses middleware functions to validate permissions before processing requests:

```typescript
// Example middleware implementation
const verifyAdminRole = (requiredRole: AdminRole) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const currentUserRole = req.adminUser?.role;
    
    if (!currentUserRole || !hasPermission(currentUserRole, requiredRole)) {
      // Log access attempt
      await logAdminActivity(ActivityType.ACCESS_DENIED, 
        `Attempted to access endpoint requiring ${requiredRole} permission`,
        req.adminUser?.uid);
        
      return res.status(403).json({ 
        error: `Insufficient permissions. ${requiredRole} role required.` 
      });
    }
    
    next();
  };
};
```

### 3.2 Front-end Permission Checks

The frontend implements permission checks in several ways:

#### 3.2.1 Query Enablement

Data queries are conditionally enabled based on permission level:

```typescript
// Example query enablement with permissions
const { data: statsData, isLoading: statsLoading } = useQuery({
  queryKey: ['/api/admin/stats'],
  enabled: !!adminUser && hasPermission(adminUser.role, 'MODERATOR')
});
```

#### 3.2.2 Conditional UI Rendering

UI elements are conditionally rendered based on user role:

```typescript
// Example conditional rendering
{adminUser && hasPermission(adminUser.role, 'ADMIN') && (
  <Button onClick={() => setShowInviteForm(true)}>
    Invite Administrator
  </Button>
)}
```

#### 3.2.3 Permission Guard Component

A reusable `PermissionGuard` component to control access to sections of the UI:

```typescript
// Example usage of PermissionGuard
<PermissionGuard permission="ADMIN" fallback={<AccessDeniedMessage />}>
  <AdminControls />
</PermissionGuard>
```

### 3.3 Permission Utility Function

The central permission check function that enforces the role hierarchy:

```typescript
/**
 * Check if user has permission to perform an action
 * 
 * @param userRole The user's role
 * @param requiredRole The minimum role required for the action
 * @returns Whether the user has permission
 */
export function hasPermission(userRole: string, requiredRole: AdminRole): boolean {
  // Normalize roles for comparison
  const normalizedUserRole = userRole.toUpperCase();
  const normalizedRequiredRole = requiredRole.toUpperCase();
  
  // Role hierarchy: SUPER_ADMIN > ADMIN > MODERATOR
  if (normalizedUserRole === 'SUPER_ADMIN') {
    return true;
  }
  
  if (normalizedUserRole === 'ADMIN') {
    return normalizedRequiredRole !== 'SUPER_ADMIN';
  }
  
  if (normalizedUserRole === 'MODERATOR') {
    return normalizedRequiredRole === 'MODERATOR';
  }
  
  return false;
}
```

## 4. Administrator Lifecycle

### 4.1 Creation Process

New administrators are created through an invitation-based process:

1. Super Admin or Admin sends an invitation with a specified role
2. Invitation contains a secure token and expiration date
3. Invitee clicks the invitation link and registers
4. New administrator account is created in PENDING status
5. Super Admin or Admin must approve the registration
6. Once approved, the administrator account becomes ACTIVE

### 4.2 Administrator Statuses

Administrator accounts can have the following statuses:

- **ACTIVE**: Account is fully functional
- **PENDING**: Registration complete but awaiting approval
- **DISABLED**: Account temporarily deactivated
- **REJECTED**: Registration was rejected

### 4.3 MFA Requirement

All administrator accounts require Multi-Factor Authentication (MFA):

1. MFA must be set up during the first login
2. Available MFA methods:
   - TOTP (Time-based One-Time Password) via authenticator app
   - SMS verification with phone number
3. MFA cannot be bypassed
4. Backup codes are provided for recovery

## 5. Audit Logging

All administrative actions are logged for security and compliance purposes:

- Each action is recorded with timestamp, actor, target, and details
- Failed permission checks are also logged
- Logs include context like IP address and session information
- Actions can be filtered by type, actor, and date range
- Super Admins can access all logs
- Admins can access their own logs and logs of lower-level administrators
- Moderators can only access their own logs

## 6. Best Practices

When developing features that involve administrator permissions:

1. Always use the `hasPermission` utility function for role checks
2. Add permission checks to both frontend and backend components
3. Implement proper fallback UI for users without required permissions
4. Log administrative actions using the `logAdminActivity` function
5. Test feature access with different administrator roles
6. Avoid hardcoding role names; use the defined types and enums

## 7. Testing

A comprehensive test suite verifies the permission system:

1. Unit tests for permission functions and utilities
2. Integration tests for backend middleware and API endpoints
3. End-to-end tests for complete administrative workflows
4. Tests for edge cases like expired sessions and concurrent modifications

---

This document should be kept updated as the permission system evolves. For specific implementation details, refer to the codebase, particularly:

- `admin-utils.tsx`: Core permission utility functions
- `PermissionGuard.tsx`: UI permission control component
- `admin-auth-routes.ts`: Backend authentication and permission middleware
- `UserManagement.tsx`: Example of frontend permission implementation