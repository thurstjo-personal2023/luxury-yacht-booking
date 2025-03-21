# Media Validation System

This document outlines the media validation system implemented using Clean Architecture principles for the Etoile Yachts platform.

## Overview

The media validation system is designed to validate and repair media URLs in the Firestore database. It follows clean architecture principles to ensure the system is maintainable, testable, and scalable.

## Architecture

The system is organized into the following layers:

### Domain Layer

The domain layer contains the core business logic and entities:

- **Media Entity**: Represents media objects (images, videos, etc.)
- **MediaType**: Enum of media types (image, video, audio, document)
- **ValidationResult**: Value object representing the result of validating a URL
- **DocumentValidationResult**: Value object representing the result of validating all media URLs in a document
- **MediaValidator**: Domain service for validating media URLs

### Application Layer

The application layer contains use cases and orchestrates the business logic:

- **MediaValidationService**: Orchestrates validation operations across multiple documents
- **MediaValidationWorker**: Processes media validation tasks from a queue
- **MediaValidationFactory**: Factory for creating media validation components

### Adapters Layer

The adapters layer contains interfaces and implementations for external services:

- **IMediaRepository**: Interface for media repository operations
- **FirebaseMediaRepository**: Firebase implementation of the media repository
- **IMediaValidationQueue**: Interface for the media validation queue
- **DocumentValidationResult**: Interface for document validation results

### Infrastructure Layer

The infrastructure layer contains concrete implementations of external services:

- **PubSubMediaValidationQueue**: Google Cloud Pub/Sub implementation of the media validation queue

## Key Components

### MediaValidator

The `MediaValidator` is a domain service that validates media URLs. It checks:

- If the URL is valid and accessible
- If the URL matches the expected media type
- If the URL is not a blob URL (unless allowed)
- If the URL is not a relative URL (unless allowed)

### MediaValidationService

The `MediaValidationService` orchestrates the validation of media URLs across documents in a collection. It:

- Retrieves documents from a collection
- Extracts media URLs from documents
- Validates each URL
- Generates validation reports
- Provides repair functionality for invalid URLs

### MediaValidationWorker

The `MediaValidationWorker` processes media validation tasks from a queue. It:

- Dequeues validation tasks
- Processes documents in batches
- Tracks validation results
- Reports progress

### PubSubMediaValidationQueue

The `PubSubMediaValidationQueue` provides a Pub/Sub implementation of the media validation queue. It:

- Enqueues validation tasks
- Dequeues validation tasks
- Provides queue management operations

## Usage Example

```typescript
// Create the factory
const factory = new MediaValidationFactory(db, {
  // Configure the validator
  validatorOptions: {
    expectedType: MediaType.IMAGE,
    allowRelativeUrls: false
  },
  
  // Configure the repository
  repositoryConfig: {
    collectionsToExclude: ['mail', 'logs'],
    validationTimeoutMs: 10000
  }
});

// Create the validation service
const validationService = factory.createService();

// Run validation for a collection
const reportId = await validationService.validateCollection('unified_yacht_experiences');

// Get the validation report
const report = await validationService.getValidationReport(reportId);

// Repair invalid URLs
const repairResult = await validationService.repairInvalidUrls(reportId);
```

## Benefits of Clean Architecture

The clean architecture approach provides several benefits:

1. **Separation of Concerns**: Each layer has a specific responsibility, making the code easier to understand and maintain.
2. **Testability**: Business logic is isolated from external dependencies, making it easier to test.
3. **Flexibility**: The system can be extended or modified without affecting other components.
4. **Independence**: The business logic is independent of frameworks and external services.

## Integration with Firebase

The system integrates with Firebase through the `FirebaseMediaRepository` adapter, which:

- Retrieves documents from Firestore
- Extracts media URLs from documents
- Updates documents in Firestore
- Stores validation results in Firestore

## Scheduled Validation

The system supports scheduled validation through the `MediaValidationWorker` and `PubSubMediaValidationQueue`:

1. The worker schedules validation tasks for collections
2. The tasks are enqueued in Pub/Sub
3. Worker processes dequeue and process tasks
4. Validation results are stored in Firestore

## Future Enhancements

Potential enhancements to the system include:

1. **Cloud Functions Integration**: Implement a Cloud Function to process validation tasks
2. **Admin UI**: Develop an admin UI for managing validations and viewing reports
3. **Webhook Support**: Add support for webhooks to notify external systems of validation results
4. **Custom Repair Strategies**: Implement custom repair strategies for different types of media
5. **Preventive Validation**: Add client-side validation to prevent invalid media from being uploaded

## Conclusion

The media validation system provides a robust solution for validating and repairing media URLs in the Etoile Yachts platform. By following clean architecture principles, the system is maintainable, testable, and scalable.