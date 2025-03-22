#!/bin/bash

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Run Jest with the simple config that doesn't require emulators
echo "Running unit tests that don't require emulators..."
npx jest --config jest.simple.config.cjs --testPathIgnorePatterns='integration|e2e'

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "\033[0;32mUnit tests passed successfully!\033[0m"
  exit 0
else
  echo -e "\033[0;31mSome unit tests failed.\033[0m"
  exit 1
fi