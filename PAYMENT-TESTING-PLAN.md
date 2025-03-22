# Payment System Testing Plan

This document outlines our comprehensive testing strategy for the payment system in the Etoile Yachts platform. The strategy follows the clean architecture principles and ensures test coverage across all layers of the application.

## 1. Domain Layer Tests

The domain layer tests focus on the core business logic and entities in isolation:

- [x] `PaymentStatus` value object tests
- [x] `PaymentDetails` entity tests
- [x] `BookingPaymentInfo` entity tests
- [ ] `IPaymentService` interface contract tests

### Running Domain Tests

```bash
npm test -- tests/unit/core/domain
```

## 2. Application Layer Tests

Application layer tests validate the use cases that orchestrate the domain logic:

- [x] `CreatePaymentIntentUseCase` tests
- [x] `ProcessPaymentUseCase` tests
- [x] `CancelPaymentUseCase` tests
- [ ] Error handling and validation tests

### Running Application Tests

```bash
npm test -- tests/unit/core/application
```

## 3. Adapter Layer Tests

Adapter layer tests ensure correct implementation of the infrastructure interfaces:

- [x] `StripePaymentService` implementation tests
- [x] `PaymentServiceFactory` tests
- [ ] Repository implementation tests (if needed for payment persistence)

### Running Adapter Tests

```bash
npm test -- tests/unit/adapters
```

## 4. Infrastructure Layer Tests

Infrastructure layer tests verify the external interfaces such as controllers and API routes:

- [x] `PaymentController` tests
- [x] Payment routes tests
- [ ] Middleware and authentication tests for payment endpoints

### Running Infrastructure Tests

```bash
npm test -- tests/unit/infrastructure
```

## 5. Client Layer Tests

Client layer tests validate the frontend components and hooks that interact with the payment system:

- [x] `usePayment` hook tests
- [x] `PaymentCard` component tests
- [ ] Payment page integration tests
- [ ] Form validation and error handling tests

### Running Client Tests

```bash
npm test -- tests/unit/client
```

## 6. Integration Tests

Integration tests verify the interaction between multiple components across layers:

- [x] Stripe payment service integration tests
- [ ] Booking and payment integration tests
- [ ] Webhook handling and event processing tests

### Running Integration Tests

```bash
npm test -- tests/integration
```

## 7. End-to-End Tests

End-to-end tests validate complete user flows from the UI to the backend:

- [x] Complete payment flow E2E tests
- [ ] Payment cancellation flow E2E tests
- [ ] Error handling and edge cases E2E tests

### Running E2E Tests

```bash
npm test -- tests/e2e
```

## 8. Manual Test Cases

These test cases should be performed manually to verify the complete payment experience:

1. **Payment Intent Creation**
   - User selects a yacht and proceeds to checkout
   - System creates a payment intent with the correct amount
   - Payment form displays with correct total

2. **Card Information Entry**
   - User enters valid card information
   - System validates card details in real-time
   - Form displays appropriate validation feedback

3. **Successful Payment Processing**
   - User submits valid payment information
   - System processes payment and displays confirmation
   - Booking is confirmed in the system
   - Confirmation email is sent

4. **Failed Payment Handling**
   - User enters invalid card information
   - System shows appropriate error messages
   - User can retry payment

5. **Payment Cancellation**
   - User initiates payment cancellation
   - System cancels payment intent
   - Booking is marked as cancelled

## 9. Testing Stripe Webhooks

For testing Stripe webhooks locally:

1. Install the Stripe CLI
2. Run webhook forwarding: `stripe listen --forward-to localhost:3000/api/payments/webhook`
3. Trigger test webhook events: `stripe trigger payment_intent.succeeded`

## 10. Test Coverage Goals

- Domain Layer: 90%+ coverage
- Application Layer: 85%+ coverage
- Adapters Layer: 80%+ coverage
- Infrastructure Layer: 75%+ coverage
- Client Components: 70%+ coverage
- Overall project: 75%+ coverage

## 11. Continuous Integration

All tests should be integrated into the CI pipeline to ensure consistent quality:

- Unit and integration tests run on every pull request
- E2E tests run before deployment to staging
- Performance tests run weekly

## 12. Performance Testing

The payment system should be tested for performance under load:

- Response time under 2 seconds for payment processing
- Support for concurrent payment processing
- Graceful degradation under high load

## Future Improvements

- Implement automated security testing for payment flows
- Add fuzz testing for payment inputs
- Create visual regression tests for payment UI components
- Implement contract tests with Stripe API using Pact or similar

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Testing React with Jest](https://reactjs.org/docs/testing.html)
- [Stripe Testing Documentation](https://stripe.com/docs/testing)
- [Clean Architecture Testing Principles](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)