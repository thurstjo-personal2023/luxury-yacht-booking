# Payment Integration for Etoile Yachts

This document explains how the payment system is integrated into the Etoile Yachts platform following clean architecture principles.

## Architecture Overview

The payment system follows a clean architecture approach with distinct layers:

1. **Domain Layer**: Contains entities and interfaces that define the payment-related concepts.
2. **Application Layer**: Contains use cases that orchestrate payment operations.
3. **Adapter Layer**: Contains implementations that connect to external services (Stripe).
4. **Infrastructure Layer**: Contains API controllers and routes for handling HTTP requests.
5. **Client Layer**: Contains React components and hooks for the frontend experience.

## Key Components

### Domain Layer

- `PaymentStatus` enum: Represents different payment statuses
- `PaymentDetails` class: Value object containing payment information
- `PaymentIntent` & `PaymentResult` interfaces: Domain entities for payment processing
- `IPaymentService` interface: Defines the contract for payment services

### Adapter Layer

- `StripePaymentService`: Concrete implementation of the payment service using Stripe
- `PaymentServiceFactory`: Factory for creating payment service instances

### Infrastructure Layer

- `PaymentController`: Handles HTTP requests for payment operations
- Express routes for creating, retrieving, and canceling payment intents

### Client Layer

- `PaymentService` client: Communicates with the backend payment API
- `usePayment` hook: Provides React components with payment functionality
- `PaymentCard` component: UI component for collecting and processing payments

## Payment Flow

1. **Creation**: The client creates a payment intent for a booking
   ```typescript
   const { createPaymentIntent } = usePayment();
   const paymentIntent = await createPaymentIntent({
     amount: booking.totalPrice,
     currency: 'AED',
     metadata: { bookingId: booking.id }
   });
   ```

2. **Processing**: The user enters card details and submits the payment form
   ```jsx
   <PaymentCard
     amount={booking.totalPrice}
     bookingId={booking.id}
     onPaymentSuccess={handlePaymentSuccess}
   />
   ```

3. **Confirmation**: The payment is confirmed with Stripe
   - Card details are securely processed by Stripe.js
   - The backend is notified of successful payments through webhooks

4. **Completion**: The booking is marked as paid
   - The booking system updates the booking status based on the payment result

## Configuration Requirements

To use the payment system, the following environment variables must be set:

- `STRIPE_SECRET_KEY`: Server-side API key for Stripe
- `STRIPE_WEBHOOK_SECRET`: Secret for verifying Stripe webhooks
- `VITE_STRIPE_PUBLIC_KEY`: Client-side publishable key for Stripe

## Testing

For testing purposes, Stripe provides test card numbers:

- **Card success**: `4242 4242 4242 4242`
- **Card requires authentication**: `4000 0025 0000 3155`
- **Card declined**: `4000 0000 0000 0002`

## Security Considerations

- Card details are never stored on our servers
- All communication with Stripe uses HTTPS
- Webhook signatures are verified to prevent tampering
- Payment intents are bound to specific bookings through metadata

## Extending the System

To add support for additional payment methods:

1. Update the `PaymentDetails` class to include new payment method types
2. Extend the `StripePaymentService` to handle the new payment methods
3. Update the frontend components to display and collect information for the new methods