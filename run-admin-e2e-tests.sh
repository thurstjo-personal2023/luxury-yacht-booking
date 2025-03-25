#!/bin/bash

# Run the administrator role end-to-end tests
# This script initializes Firebase emulators and runs the end-to-end tests

# Set environment variables for testing
export FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
export FIRESTORE_EMULATOR_HOST=localhost:8080

# Set test project ID
export FIREBASE_PROJECT_ID=etoile-yachts-test

# Kill any existing emulators
pkill -f "firebase emulators" || true

# Start Firebase emulators in the background
echo "Starting Firebase emulators..."
firebase emulators:start --only auth,firestore --project $FIREBASE_PROJECT_ID &

# Wait for emulators to start
echo "Waiting for emulators to start..."
sleep 10

# Run the tests
echo "Running administrator role end-to-end tests..."
jest admin-role-e2e.test.ts --config=jest.integration.config.js --forceExit

# Capture the test result
TEST_RESULT=$?

# Kill the emulators
echo "Stopping Firebase emulators..."
pkill -f "firebase emulators" || true

# Return the test result
exit $TEST_RESULT