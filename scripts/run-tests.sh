#!/bin/bash

# Run Tests Shell Script
# This script runs all test suites and generates comprehensive reports

set -e
echo "🧪 Running Etoile Yachts Test Suite 🧪"
echo "======================================"

# Setup environment
export NODE_ENV=test
export JEST_JUNIT_OUTPUT_DIR="./test-reports/junit"
export JEST_JUNIT_OUTPUT_NAME="jest-junit.xml"

# Create test reports directory
mkdir -p ./test-reports/junit
mkdir -p ./test-reports/coverage

# Run Jest tests
echo "📋 Running Jest Unit Tests"
npx jest --runInBand --detectOpenHandles --forceExit --coverage --reporters=default --reporters=jest-junit

# Store exit code
JEST_EXIT_CODE=$?

# Run Cypress tests if Jest passes
if [ $JEST_EXIT_CODE -eq 0 ]; then
  echo "📋 Running Cypress E2E Tests"
  npx cypress run --e2e
  CYPRESS_EXIT_CODE=$?
else
  echo "❌ Jest tests failed - skipping Cypress tests"
  CYPRESS_EXIT_CODE=1
fi

# Generate test report
echo "📊 Generating Test Report"
node scripts/generate-test-report.js

# Display results
if [ $JEST_EXIT_CODE -eq 0 ] && [ $CYPRESS_EXIT_CODE -eq 0 ]; then
  echo "✅ All tests passed!"
  exit 0
else
  echo "❌ Tests failed!"
  exit 1
fi