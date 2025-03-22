#!/bin/bash

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Run Jest with the payment unit test config
echo "Running payment module unit tests..."
npx jest --config jest.payment-unit.config.cjs

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "\033[0;32mPayment unit tests passed successfully!\033[0m"
  exit 0
else
  echo -e "\033[0;31mSome payment unit tests failed.\033[0m"
  exit 1
fi