#!/bin/bash

# Automated Test Workflow Runner
# This script runs the test suite and generates reports

# Set error handling
set -e

# Print beginning of test run
echo "======================================================"
echo "Starting automated test run at $(date)"
echo "======================================================"

# Ensure Firebase emulators are stopped (if running)
echo "Ensuring Firebase emulators are stopped..."
npx kill-port 9099 9199 9299 4000 8080 5001 8085 9000 || true

# Start Firebase emulators in background
echo "Starting Firebase emulators..."
npx firebase emulators:start --only auth,firestore,storage,functions --project test --import=./tests/fixtures --no-ui &
EMULATORS_PID=$!

# Give emulators time to start
echo "Waiting for emulators to start..."
sleep 10

# Create test results directory if it doesn't exist
mkdir -p test-results/jest
mkdir -p test-results/cypress

# Run Jest tests with JUnit reporter
echo "Running Jest tests..."
CI=true npx jest --runInBand --detectOpenHandles \
  --forceExit --coverage --reporters=default \
  --reporters=jest-junit

# Store Jest exit code
JEST_EXIT_CODE=$?
echo "Jest tests completed with exit code: $JEST_EXIT_CODE"

# Run Cypress tests with JUnit reporter
echo "Running Cypress component tests..."
npx cypress run --component --reporter junit --reporter-options "mochaFile=test-results/cypress/component-[hash].xml"

# Store Cypress component exit code
CYPRESS_COMPONENT_EXIT_CODE=$?
echo "Cypress component tests completed with exit code: $CYPRESS_COMPONENT_EXIT_CODE"

# Run Cypress E2E tests
echo "Running Cypress E2E tests..."
npx cypress run --e2e --reporter junit --reporter-options "mochaFile=test-results/cypress/e2e-[hash].xml"

# Store Cypress E2E exit code
CYPRESS_E2E_EXIT_CODE=$?
echo "Cypress E2E tests completed with exit code: $CYPRESS_E2E_EXIT_CODE"

# Stop Firebase emulators
echo "Stopping Firebase emulators..."
kill $EMULATORS_PID || true
npx kill-port 9099 9199 9299 4000 8080 5001 8085 9000 || true

# Generate final test report
echo "Generating test report..."
node scripts/generate-test-report.js

# Print summary
echo "======================================================"
echo "Test run completed at $(date)"
echo "Jest tests: $([ $JEST_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "Cypress component tests: $([ $CYPRESS_COMPONENT_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "Cypress E2E tests: $([ $CYPRESS_E2E_EXIT_CODE -eq 0 ] && echo 'PASSED' || echo 'FAILED')"
echo "======================================================"

# Check if any test suite failed
if [ $JEST_EXIT_CODE -ne 0 ] || [ $CYPRESS_COMPONENT_EXIT_CODE -ne 0 ] || [ $CYPRESS_E2E_EXIT_CODE -ne 0 ]; then
  echo "One or more test suites failed. Check the reports for details."
  exit 1
fi

echo "All tests passed successfully!"
exit 0