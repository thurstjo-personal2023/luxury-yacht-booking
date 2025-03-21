#!/bin/bash

# Run Admin Authentication Tests
# This script runs all admin-related tests for authentication and MFA functionality

echo "Running Admin Authentication Tests..."
echo "===================================="

# Run tests with Jest using TypeScript config
# Setting Node options to support ES modules
export NODE_OPTIONS="--experimental-vm-modules --no-warnings"

# Run with verbose output for debugging module issues
npx jest --config=jest.config.ts --testMatch="<rootDir>/tests/simple-admin-test.ts" --verbose --detectOpenHandles

# Check results
if [ $? -eq 0 ]
then
  echo "All tests passed successfully!"
else
  echo "Some tests failed. Please review the results above."
fi