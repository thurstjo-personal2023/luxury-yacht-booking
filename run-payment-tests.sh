#!/bin/bash

# Run payment tests with CJS configuration

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

echo -e "${BLUE}Running payment tests with CommonJS configuration...${NC}"

npx jest --config jest.payment-tests.config.cjs

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Payment tests passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Some payment tests failed.${NC}"
  exit 1
fi