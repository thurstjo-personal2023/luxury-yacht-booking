#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Banner
echo -e "${BLUE}====================================================${NC}"
echo -e "${BLUE}   Etoile Yachts Platform Test Suite Runner          ${NC}"
echo -e "${BLUE}====================================================${NC}"

# Function to check if firebase emulators are running
check_emulators() {
  echo -e "${YELLOW}Checking if Firebase emulators are running...${NC}"
  curl -s http://localhost:4000 > /dev/null
  if [ $? -ne 0 ]; then
    echo -e "${RED}Firebase emulators are not running.${NC}"
    echo -e "${YELLOW}Please start the emulators with 'firebase emulators:start' in another terminal.${NC}"
    return 1
  else
    echo -e "${GREEN}Firebase emulators are running!${NC}"
    return 0
  fi
}

# Function to run a test category
run_tests() {
  local test_type=$1
  local test_path=$2
  local config_file=$3

  echo -e "${BLUE}====================================================${NC}"
  echo -e "${YELLOW}Running $test_type tests...${NC}"
  echo -e "${BLUE}====================================================${NC}"
  
  if [ ! -z "$config_file" ]; then
    npx jest --config=$config_file $test_path
  else
    npx jest $test_path
  fi

  if [ $? -eq 0 ]; then
    echo -e "${GREEN}$test_type tests completed successfully!${NC}"
    return 0
  else
    echo -e "${RED}$test_type tests failed!${NC}"
    return 1
  fi
}

# Function to print help
print_help() {
  echo -e "${YELLOW}Usage:${NC}"
  echo -e "  ./run-tests.sh [options]"
  echo -e ""
  echo -e "${YELLOW}Options:${NC}"
  echo -e "  --unit        Run unit tests only"
  echo -e "  --integration Run integration tests only"
  echo -e "  --e2e         Run end-to-end tests only"
  echo -e "  --all         Run all tests (default)"
  echo -e "  --help        Show this help message"
  echo -e ""
  echo -e "${YELLOW}Examples:${NC}"
  echo -e "  ./run-tests.sh --unit"
  echo -e "  ./run-tests.sh --integration"
  echo -e "  ./run-tests.sh --all"
}

# Default values
RUN_UNIT=false
RUN_INTEGRATION=false
RUN_E2E=false

# Parse arguments
if [ $# -eq 0 ]; then
  RUN_UNIT=true
  RUN_INTEGRATION=true
  RUN_E2E=true
else
  for arg in "$@"; do
    case $arg in
      --unit)
        RUN_UNIT=true
        ;;
      --integration)
        RUN_INTEGRATION=true
        ;;
      --e2e)
        RUN_E2E=true
        ;;
      --all)
        RUN_UNIT=true
        RUN_INTEGRATION=true
        RUN_E2E=true
        ;;
      --help)
        print_help
        exit 0
        ;;
      *)
        echo -e "${RED}Unknown option: $arg${NC}"
        print_help
        exit 1
        ;;
    esac
  done
fi

# Check if firebase emulators are running if we need to run integration or e2e tests
if [ "$RUN_INTEGRATION" = true ] || [ "$RUN_E2E" = true ]; then
  check_emulators
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Would you like to run unit tests only? (y/n)${NC}"
    read -r response
    if [ "$response" != "y" ]; then
      echo -e "${RED}Tests aborted.${NC}"
      exit 1
    else
      RUN_INTEGRATION=false
      RUN_E2E=false
      RUN_UNIT=true
    fi
  fi
fi

# Run tests
EXIT_CODE=0

# Run unit tests
if [ "$RUN_UNIT" = true ]; then
  run_tests "Unit" "tests/unit" "jest.config.js"
  if [ $? -ne 0 ]; then
    EXIT_CODE=1
  fi
fi

# Run integration tests
if [ "$RUN_INTEGRATION" = true ]; then
  run_tests "Integration" "tests/integration" "jest.integration.config.js"
  if [ $? -ne 0 ]; then
    EXIT_CODE=1
  fi
fi

# Run e2e tests
if [ "$RUN_E2E" = true ]; then
  run_tests "End-to-End" "tests/e2e" "jest.integration.config.js"
  if [ $? -ne 0 ]; then
    EXIT_CODE=1
  fi
fi

# Print summary
echo -e "${BLUE}====================================================${NC}"
if [ $EXIT_CODE -eq 0 ]; then
  echo -e "${GREEN}All tests completed successfully!${NC}"
else
  echo -e "${RED}Some tests failed. Please check the output above for details.${NC}"
fi
echo -e "${BLUE}====================================================${NC}"

exit $EXIT_CODE