#!/bin/bash

# Combined Test Runner for Etoile Yachts
# This script runs all available test types without requiring Firebase Emulators

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Set up environment for testing
export NODE_ENV=test

# Track overall success
OVERALL_SUCCESS=true

# Run a single test group
run_test_group() {
  local config=$1
  local name=$2
  local timeout=${3:-30}
  
  echo -e "\n${BLUE}===== Running ${name} Tests =====${NC}"
  
  # Run tests with the specified configuration
  npx jest --config $config --detectOpenHandles
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ ${name} tests passed!${NC}"
    return 0
  else
    echo -e "${RED}✗ ${name} tests failed!${NC}"
    OVERALL_SUCCESS=false
    return 1
  fi
}

# Main function
main() {
  echo -e "${BLUE}===== ETOILE YACHTS TESTING FRAMEWORK =====${NC}"
  echo -e "${YELLOW}Running tests without Firebase Emulators${NC}"
  
  # 1. Run basic simple tests
  run_test_group "jest.simple.config.cjs" "Simple"
  
  # 2. Run payment domain tests
  run_test_group "jest.payment-tests.config.cjs" "Payment Domain"
  
  # 3. Run media domain tests
  run_test_group "jest.media-tests.config.cjs" "Media Domain"
  
  # 4. Run simplified validation tests
  run_test_group "jest.payment.simplified.config.cjs" "Payment Simplified"
  
  # Print summary
  echo -e "\n${BLUE}===== TEST SUMMARY =====${NC}"
  
  if [ "$OVERALL_SUCCESS" = true ]; then
    echo -e "${GREEN}All test groups completed successfully!${NC}"
    echo -e "${YELLOW}Note: Integration tests with Firebase Emulators were not run${NC}"
    echo -e "${YELLOW}To run integration tests, use: ./run-emulator-tests.sh${NC}"
    exit 0
  else
    echo -e "${RED}Some test groups failed.${NC}"
    echo -e "${YELLOW}Review the output above for details on failures.${NC}"
    exit 1
  fi
}

# Run the main function
main