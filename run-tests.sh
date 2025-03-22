#!/bin/bash

# Main test script for Etoile Yachts Platform
# This script runs all types of tests in sequence

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}=== Etoile Yachts Testing Suite ===${NC}"
echo -e "${BLUE}Running all test types in sequence...${NC}"
echo 

# Set up Google Cloud credentials for Firebase
export GOOGLE_APPLICATION_CREDENTIALS="./etoile-yachts-9322f3c69d91.json"
echo -e "${GREEN}Using Google Cloud service account for authentication: $(cat $GOOGLE_APPLICATION_CREDENTIALS | grep client_email | sed 's/.*: "\(.*\)".*/\1/')${NC}"
echo

# Run unit tests first (these don't need emulators)
echo -e "${YELLOW}Step 1: Running unit tests${NC}"
./run-unit-tests.sh
UNIT_RESULT=$?

# Check if unit tests passed
if [ $UNIT_RESULT -ne 0 ]; then
  echo -e "${RED}Unit tests failed. Fixing these issues is recommended before running other test types.${NC}"
  echo -e "${YELLOW}Do you want to continue with integration tests? (y/N)${NC}"
  read -r CONTINUE
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo -e "${BLUE}Testing stopped. Please fix unit test failures.${NC}"
    exit 1
  fi
fi

# Run integration tests
echo -e "\n${YELLOW}Step 2: Running integration tests${NC}"
./run-integration-tests.sh
INTEGRATION_RESULT=$?

# Check if integration tests passed
if [ $INTEGRATION_RESULT -ne 0 ]; then
  echo -e "${RED}Integration tests failed. Fixing these issues is recommended before running E2E tests.${NC}"
  echo -e "${YELLOW}Do you want to continue with E2E tests? (y/N)${NC}"
  read -r CONTINUE
  if [ "$CONTINUE" != "y" ] && [ "$CONTINUE" != "Y" ]; then
    echo -e "${BLUE}Testing stopped. Please fix integration test failures.${NC}"
    exit 1
  fi
fi

# Run E2E tests
echo -e "\n${YELLOW}Step 3: Running end-to-end tests${NC}"
./run-e2e-tests.sh
E2E_RESULT=$?

# Show summary
echo -e "\n${BLUE}=== Test Results Summary ===${NC}"
if [ $UNIT_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Unit Tests: PASSED${NC}"
else
  echo -e "${RED}✗ Unit Tests: FAILED${NC}"
fi

if [ $INTEGRATION_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ Integration Tests: PASSED${NC}"
else
  echo -e "${RED}✗ Integration Tests: FAILED${NC}"
fi

if [ $E2E_RESULT -eq 0 ]; then
  echo -e "${GREEN}✓ End-to-End Tests: PASSED${NC}"
else
  echo -e "${RED}✗ End-to-End Tests: FAILED${NC}"
fi

# Overall result
if [ $UNIT_RESULT -eq 0 ] && [ $INTEGRATION_RESULT -eq 0 ] && [ $E2E_RESULT -eq 0 ]; then
  echo -e "\n${GREEN}All tests passed successfully!${NC}"
  exit 0
else
  echo -e "\n${RED}Some tests failed. Please check the logs for details.${NC}"
  exit 1
fi