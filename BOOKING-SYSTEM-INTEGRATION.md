# Booking System Integration Guide

This document provides instructions for integrating the new Clean Architecture-based booking system with the existing application.

## Overview

The booking system has been refactored using Clean Architecture principles, which separates the codebase into distinct layers:

1. **Domain Layer**: Core business entities, value objects, and business rules
2. **Application Layer**: Use cases that orchestrate domain entities
3. **Adapter Layer**: Implementations of repository interfaces
4. **Infrastructure Layer**: External frameworks and database integration

## Integration Steps

### 1. Integrate with Express Server

Add the following code to `server/index.ts` to integrate the clean architecture API routes:

```typescript
import { integrateCleanArchitectureApi } from '../infrastructure/api/integration';

// After setting up the Express app and middleware:

// Integrate Clean Architecture API
const { firestore } = integrateCleanArchitectureApi(app);
```

### 2. Run Data Migration

After integrating the API, you can migrate existing bookings to the new structure by making an authenticated request to:

```
POST /api/migration/bookings
```

This endpoint is only accessible to administrators.

## Testing the Integration

### 1. Test API Endpoints

After integration, you can test that the new booking endpoints work as expected:

- `GET /api/bookings` - List bookings with search criteria
- `GET /api/bookings/:id` - Get a specific booking
- `POST /api/bookings` - Create a new booking
- `POST /api/bookings/:id/confirm` - Confirm a booking
- `POST /api/bookings/:id/cancel` - Cancel a booking
- `POST /api/bookings/check-availability` - Check yacht or package availability

### 2. Verification Queries

You can verify that new bookings are being created and managed properly using these Firestore queries:

```typescript
// List all bookings
const bookings = await getDocs(collection(firestore, 'bookings'));
console.log('Total bookings:', bookings.size);

// Check for migrated bookings
const migratedBookings = await getDocs(
  query(
    collection(firestore, 'bookings'),
    where('metadata._migrated', '==', true)
  )
);
console.log('Migrated bookings:', migratedBookings.size);
```

## Rollback Plan

If issues are encountered during integration, you can temporarily revert to the original implementation by:

1. Commenting out the integration code in `server/index.ts`
2. Restarting the server

## Known Issues and Limitations

- Some TypeScript errors may exist in the current implementation due to interface mismatches that need to be resolved
- The migration process only handles basic booking data; more complex scenarios may require manual intervention
- Performance testing with large datasets has not been conducted yet

## Future Improvements

- Add more comprehensive input validation using Zod schemas
- Implement batch processing for large datasets
- Add event publishing for domain events to enable features like notifications
- Create a dashboard UI specific to the new booking architecture