#!/bin/bash

# Run all tests using the CommonJS configuration

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

# Track overall success
OVERALL_SUCCESS=true

# Function to run tests with a specific configuration
run_test_group() {
  local config=$1
  local name=$2
  local timeout=${3:-60}  # Default timeout of 60 seconds

  echo -e "\n${BLUE}Running $name tests...${NC}"
  
  # Run with a timeout to prevent hanging tests
  timeout $timeout npx jest --config $config

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $name tests passed!${NC}"
    return 0
  elif [ $? -eq 124 ]; then
    echo -e "${RED}✗ $name tests timed out after ${timeout}s!${NC}"
    OVERALL_SUCCESS=false
    return 1
  else
    echo -e "${RED}✗ $name tests failed!${NC}"
    OVERALL_SUCCESS=false
    return 1
  fi
}

# Main test execution
echo -e "${BLUE}===== RUNNING ALL TESTS =====${NC}"

# 1. Run the simple test (for basic validation)
run_test_group "jest.simple.config.cjs" "Simple" 10

# 2. Run the payment domain tests (without Firebase)
run_test_group "jest.payment-tests.config.cjs" "Payment domain" 10

# 3. Run unit tests for specific domain objects
run_test_group "jest.payment.simplified.config.cjs" "Payment simplified" 10

# 4. Run media domain tests (without Firebase)
run_test_group "jest.media-tests.config.cjs" "Media domain" 10

# Print overall results
echo -e "\n${BLUE}===== TEST SUMMARY =====${NC}"
if [ "$OVERALL_SUCCESS" = true ]; then
  echo -e "${GREEN}All test groups completed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Some test groups failed or timed out.${NC}"
  echo -e "${YELLOW}Suggestions:${NC}"
  echo -e "1. Check if Firebase emulators are running for tests that require them"
  echo -e "2. Review individual test logs for specific failures"
  echo -e "3. Try running tests individually with longer timeouts if needed"
  exit 1
fi