#!/bin/bash

# Run a single test file to diagnose issues

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Set up environment for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Set up Google Cloud credentials for Firebase
export GOOGLE_APPLICATION_CREDENTIALS="./etoile-yachts-9322f3c69d91.json"
echo -e "${GREEN}Using Google Cloud service account for authentication: $(cat $GOOGLE_APPLICATION_CREDENTIALS | grep client_email | sed 's/.*: "\(.*\)".*/\1/')${NC}"

# Run a single test file
TEST_FILE="tests/unit/core/domain/payment/payment-status.test.ts"
echo -e "${BLUE}Running single test file: ${TEST_FILE}${NC}"

npx jest --config jest.payment-unit.config.cjs ${TEST_FILE} --verbose

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Test passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Test failed.${NC}"
  exit 1
fi