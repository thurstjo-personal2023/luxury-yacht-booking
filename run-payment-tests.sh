#!/bin/bash

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Check if payment test configuration exists
if [ ! -f "jest.payment.config.cjs" ]; then
  echo "Creating payment test configuration file..."
  node create-payment-test-files.js
fi

# Run Jest with the payment test config
echo "Running payment integration tests..."
npx jest --config jest.payment.config.cjs

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "\033[0;32mPayment tests passed successfully!\033[0m"
  exit 0
else
  echo -e "\033[0;31mSome payment tests failed.\033[0m"
  exit 1
fi