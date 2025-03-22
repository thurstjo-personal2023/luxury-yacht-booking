#!/bin/bash

# Run simplified tests without requiring Firebase Emulators
# This script runs tests that don't require emulator connection

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Set up environment for testing
export NODE_ENV=test

# Run tests with Jest
run_tests() {
  local config=$1
  local name=$2
  
  echo -e "\n${BLUE}Running $name tests...${NC}"
  
  # Run tests 
  npx jest --config $config
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $name tests passed!${NC}"
    return 0
  else
    echo -e "${RED}✗ $name tests failed!${NC}"
    return 1
  fi
}

# Main function
main() {
  echo -e "${BLUE}===== RUNNING SIMPLIFIED TESTS =====${NC}"
  
  # Run domain model tests
  run_tests "jest.simple.config.cjs" "Domain Model"
  DOMAIN_STATUS=$?
  
  # Run payment tests
  run_tests "jest.payment-tests.config.cjs" "Payment"
  PAYMENT_STATUS=$?
  
  # Run media tests 
  run_tests "jest.media-tests.config.cjs" "Media"
  MEDIA_STATUS=$?
  
  # Print summary
  echo -e "\n${BLUE}===== TEST SUMMARY =====${NC}"
  
  if [ $DOMAIN_STATUS -eq 0 ] && [ $PAYMENT_STATUS -eq 0 ] && [ $MEDIA_STATUS -eq 0 ]; then
    echo -e "${GREEN}All tests completed successfully!${NC}"
    exit 0
  else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
  fi
}

# Run the main function
main