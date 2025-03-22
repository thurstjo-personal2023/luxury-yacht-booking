#!/bin/bash

# Check if emulators are running
echo "Checking if Firebase emulators are running..."
RUNNING=false

# Try to connect to the Auth emulator
curl -s http://localhost:9099 > /dev/null
if [ $? -eq 0 ]; then
  RUNNING=true
else
  echo -e "\033[0;31mFirebase emulators are not running.\033[0m"
  echo "Please start the emulators with './start-emulators.sh' in another terminal."
  exit 1
fi

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Run Jest with the integration config
echo "Running integration tests with emulators..."
npx jest --config jest.integration.config.js --testMatch='**/tests/integration/**/*.test.ts'

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "\033[0;32mIntegration tests passed successfully!\033[0m"
  exit 0
else
  echo -e "\033[0;31mSome integration tests failed.\033[0m"
  exit 1
fi