#!/bin/bash

# UI Test Workflow Runner
# This script runs UI tests separately from the main test suite

# Set error handling
set -e

# Print beginning of UI test run
echo "======================================================"
echo "Starting UI test run at $(date)"
echo "======================================================"

# Ensure Firebase emulators are stopped (if running)
echo "Ensuring Firebase emulators are stopped..."
npx kill-port 9099 9199 9299 4000 8080 5001 8085 9000 || true

# Start Firebase emulators in background
echo "Starting Firebase emulators..."
npx firebase emulators:start --only auth,firestore,storage,functions --project test --import=./tests/fixtures --no-ui &
EMULATORS_PID=$!

# Start the application in the background
echo "Starting application..."
npm run dev &
APP_PID=$!

# Give emulators and app time to start
echo "Waiting for emulators and application to start..."
sleep 15

# Create test results directory if it doesn't exist
mkdir -p test-results/cypress-ui

# Run Cypress E2E tests with record option to Dashboard
echo "Running Cypress UI tests..."
npx cypress run --e2e --spec "cypress/e2e/ui-tests/**/*.cy.ts" \
  --reporter junit \
  --reporter-options "mochaFile=test-results/cypress-ui/ui-[hash].xml"

# Store exit code
UI_TESTS_EXIT_CODE=$?
echo "UI tests completed with exit code: $UI_TESTS_EXIT_CODE"

# Stop the application and emulators
echo "Stopping application and emulators..."
kill $APP_PID || true
kill $EMULATORS_PID || true
npx kill-port 9099 9199 9299 4000 8080 5001 8085 9000 || true

# Print summary
echo "======================================================"
echo "UI test run completed at $(date)"
echo "UI tests: $([ $UI_TESTS_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "======================================================"

# Check if tests failed
if [ $UI_TESTS_EXIT_CODE -ne 0 ]; then
  echo "UI tests failed. Check the reports for details."
  exit 1
fi

echo "All UI tests passed successfully!"
exit 0