#!/bin/bash

# Run Admin Authentication Tests
# This script runs all admin-related tests for authentication and MFA functionality

echo "Running Admin Authentication Tests..."
echo "===================================="

# Run tests with Jest using TypeScript config
npx jest --config=jest.config.ts --projects=admin-ui

# Check results
if [ $? -eq 0 ]
then
  echo "All tests passed successfully!"
else
  echo "Some tests failed. Please review the results above."
fi