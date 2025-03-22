# Booking System Integration Guide

This document provides a comprehensive guide for integrating the clean architecture booking system with the existing Etoile Yachts platform.

## Overview

The booking system has been refactored following clean architecture principles to improve maintainability, testability, and scalability. The implementation follows these layers:

1. **Domain Layer**: Core business entities and rules
2. **Application Layer**: Use cases that orchestrate domain entities 
3. **Adapter Layer**: Implementations of interfaces defined in the domain/application layers
4. **Infrastructure Layer**: External frameworks and tools

## Integration Steps

### 1. Add Domain Entities to Your Application

The domain layer contains the core business entities and rules. Integrate these files into your application:

- `core/domain/booking/booking.ts`: The Booking entity
- `core/domain/booking/booking-status.ts`: Enumeration of booking states
- `core/domain/yacht/yacht.ts`: The Yacht entity
- `core/domain/booking/payment-details.ts`: Payment information value object

### 2. Implement Repository Interfaces

The application layer defines repository interfaces that must be implemented:

- `core/application/ports/repositories/booking-repository.ts`
- `core/application/ports/repositories/yacht-repository.ts`

### 3. Add Use Cases

Integrate the following use cases from the application layer:

- `core/application/use-cases/booking/create-booking-use-case.ts`
- `core/application/use-cases/booking/cancel-booking-use-case.ts`
- `core/application/use-cases/booking/get-booking-use-case.ts`
- `core/application/use-cases/booking/list-bookings-use-case.ts`
- `core/application/use-cases/booking/confirm-booking-use-case.ts`

### 4. Implement Repository Adapters

The adapter layer contains concrete implementations of the repository interfaces:

- `adapters/repositories/firestore/firestore-booking-repository.ts`
- `adapters/repositories/firestore/firestore-yacht-repository.ts`

### 5. Set Up Controllers and Routes

The infrastructure layer includes controllers and Express routes:

- `infrastructure/api/controllers/booking-controller.ts`
- `infrastructure/api/routes/booking-routes.ts`

### 6. Register Routes with Express

Add the following code to your Express app setup:

```typescript
import { registerBookingRoutes } from './infrastructure/api/routes/booking-routes';

// In your main Express setup file:
const app = express();

// Register booking routes
registerBookingRoutes(app);
```

## Payment Integration

The payment system is designed to work alongside the booking system:

1. Implement the payment service interface: `core/domain/services/payment-service.ts`
2. Add the Stripe payment adapter: `adapters/payment/stripe-payment-service.ts`
3. Create a factory for payment services: `adapters/payment/payment-service-factory.ts`
4. Register payment routes: `infrastructure/api/routes/payment-routes.ts`

## Client-Side Integration

For the frontend:

1. Add the payment client service: `client/src/lib/payment-service.ts`
2. Implement the payment hook: `client/src/hooks/use-payment.ts`
3. Create payment components: `client/src/components/payment/payment-card.tsx`

## Example Usage

### Creating a Booking (Backend)

```typescript
// Dependency injection
const bookingRepository = new FirestoreBookingRepository();
const yachtRepository = new FirestoreYachtRepository();
const createBookingUseCase = new CreateBookingUseCase(bookingRepository, yachtRepository);

// Using the use case
const newBooking = await createBookingUseCase.execute({
  yachtId: 'yacht-123',
  userId: 'user-456',
  startDate: '2025-04-01',
  endDate: '2025-04-03',
  guestCount: 4,
  specialRequests: 'Please prepare champagne.'
});
```

### Processing a Payment (Frontend)

```typescript
// In a React component
const { createPaymentIntent, processPayment } = usePayment();

// When user initiates payment
const paymentIntent = await createPaymentIntent({
  amount: booking.totalPrice,
  currency: 'AED',
  metadata: { bookingId: booking.id }
});

// Later, when payment form is submitted
const result = await processPayment({
  paymentIntentId: paymentIntent.id,
  paymentMethodId: paymentMethodId
});

if (result.status === 'succeeded') {
  // Handle successful payment
}
```

## Database Migrations

When integrating with an existing database, you may need to migrate data to match the new schema:

1. Use the scripts in `infrastructure/migrations/` to transform existing data
2. Run migration scripts in a controlled environment
3. Validate data integrity after migration

## Testing

A comprehensive test suite is available:

1. Unit tests for domain entities and use cases
2. Integration tests for repositories
3. E2E tests for API endpoints

Run tests with: `npm run test`

## Troubleshooting

Common issues and their solutions:

1. **Missing Dependencies**: Ensure all required packages are installed
2. **Type Errors**: Check that your implementations match the interface definitions
3. **Repository Errors**: Validate Firestore collection references

For more help, refer to the detailed documentation in each module.

## Future Enhancements

Planned improvements:

1. Add notification service integration for booking confirmations
2. Implement booking analytics dashboards
3. Add support for recurring bookings
4. Enhance payment processing with more providers