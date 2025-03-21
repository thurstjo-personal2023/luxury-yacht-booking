#!/bin/bash

# Run Admin Authentication Tests
# This script runs all admin-related tests for authentication and MFA functionality

echo "Running Admin Authentication Tests..."
echo "===================================="

# Run tests with Jest
npx jest --config=jest.config.js

# Check results
if [ $? -eq 0 ]
then
  echo "All tests passed successfully!"
else
  echo "Some tests failed. Please review the results above."
fi