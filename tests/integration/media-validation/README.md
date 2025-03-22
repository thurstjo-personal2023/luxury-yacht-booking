# Media Validation Integration Tests

This directory contains integration tests for the Media Validation system. These tests verify that the media validation components correctly interact with Firebase emulators.

## Overview

The tests cover the following aspects of the media validation system:

1. **Repository Integration Tests**: Verifying that the Firebase repository adapter correctly interacts with Firestore for storing and retrieving documents, validation results, and reports.

2. **Service Integration Tests**: Testing the application service layer's ability to orchestrate validation and repair operations across multiple documents and collections.

3. **Worker Integration Tests**: Ensuring the background worker correctly processes validation and repair messages from the queue and updates Firestore accordingly.

## Test Setup

The integration tests rely on Firebase emulators for Auth, Firestore, Storage, and Pub/Sub. 

### Prerequisites

- Firebase CLI: The tests require Firebase emulators to be installed and accessible via `npx firebase`
- Node.js and npm: Required for running the tests and emulators

### Running the Tests

1. **Start the emulators**:
   ```
   node tests/integration/media-validation/setup-media-validation-emulators.js
   ```

2. **Run the integration tests**:
   ```
   npm run test:integration -- --testPathPattern="media-validation"
   ```

## Mock Implementations

To ensure reliable and predictable testing without external dependencies, the tests use several mock implementations:

- **URL Validation Mock**: Instead of making real HTTP requests to validate URLs, the tests use pattern-based validation to determine if a URL should be considered valid for a particular media type.

- **Queue Mock**: A mock implementation of the media validation queue interface is used to test the worker's message processing without requiring an actual Google Cloud Pub/Sub connection.

## Test Data

The tests create temporary collections and documents in the emulator during execution and clean them up afterward. No real production data is used or affected.

## Notes for Developers

- When adding new functionality to the media validation system, be sure to add or update the corresponding integration tests in this directory.

- The mock repository implementation in `firebase-repository-mock.ts` can be extended to support new URL patterns or validation scenarios as needed.

- If tests are failing due to emulator issues, try manually restarting the emulators using the setup script.