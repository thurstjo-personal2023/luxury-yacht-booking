#!/bin/bash

# Run tests using Firebase Emulators
# This script sets up and runs tests with Firebase Emulators

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

# Set up environment for testing
export NODE_ENV=test
export FIRESTORE_EMULATOR_HOST="localhost:8080"
export FIREBASE_AUTH_EMULATOR_HOST="localhost:9099"
export FIREBASE_STORAGE_EMULATOR_HOST="localhost:9199"

# Set the Google Application Credentials
export GOOGLE_APPLICATION_CREDENTIALS="./etoile-yachts-9322f3c69d91.json"
echo -e "${GREEN}Using Google Cloud service account for authentication: $(cat $GOOGLE_APPLICATION_CREDENTIALS | grep client_email | sed 's/.*: "\(.*\)".*/\1/')${NC}"

# Check if emulators are running
check_emulators() {
  echo -e "${BLUE}Checking if Firebase emulators are running...${NC}"
  
  # Check Firestore emulator
  curl -s http://localhost:8080 > /dev/null
  firestore_status=$?
  
  # Check Auth emulator
  curl -s http://localhost:9099 > /dev/null
  auth_status=$?
  
  if [ $firestore_status -eq 0 ] && [ $auth_status -eq 0 ]; then
    echo -e "${GREEN}Firebase emulators are running!${NC}"
    return 0
  else
    echo -e "${RED}Firebase emulators are not running. Please start the emulators:${NC}"
    echo -e "  ${YELLOW}firebase emulators:start${NC}"
    return 1
  fi
}

# Start the emulators if needed
start_emulators() {
  echo -e "${BLUE}Starting Firebase emulators...${NC}"
  
  # Start emulators in the background
  firebase emulators:start --config=firebase.test.json &
  
  # Save the PID of the emulator process
  EMULATOR_PID=$!
  
  # Wait for emulators to start
  echo -e "${YELLOW}Waiting for emulators to start...${NC}"
  sleep 10
  
  # Check if emulators are running
  check_emulators
  if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to start emulators. Exiting.${NC}"
    exit 1
  fi
}

# Stop the emulators when done
stop_emulators() {
  if [ ! -z "$EMULATOR_PID" ]; then
    echo -e "${BLUE}Stopping Firebase emulators...${NC}"
    kill $EMULATOR_PID
  fi
}

# Run tests with Jest
run_tests() {
  local config=$1
  local name=$2
  local timeout=${3:-60}
  
  echo -e "\n${BLUE}Running $name tests with emulators...${NC}"
  
  # Run tests with a timeout
  timeout $timeout npx jest --config $config
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ $name tests passed!${NC}"
    return 0
  elif [ $? -eq 124 ]; then
    echo -e "${RED}✗ $name tests timed out after ${timeout}s!${NC}"
    return 1
  else
    echo -e "${RED}✗ $name tests failed!${NC}"
    return 1
  fi
}

# Main function
main() {
  echo -e "${BLUE}===== RUNNING INTEGRATION TESTS WITH FIREBASE EMULATORS =====${NC}"
  
  # Check if emulators are already running
  check_emulators
  if [ $? -ne 0 ]; then
    # Start emulators if not running
    start_emulators
    # Set flag to stop emulators when done
    STOP_EMULATORS=true
  fi
  
  # Run integration tests
  run_tests "jest.integration.config.js" "Integration" 120
  INTEGRATION_STATUS=$?
  
  # Run security rule tests
  run_tests "jest.rules.config.cjs" "Security Rules" 60
  RULES_STATUS=$?
  
  # Stop emulators if we started them
  if [ "$STOP_EMULATORS" = true ]; then
    stop_emulators
  fi
  
  # Print summary
  echo -e "\n${BLUE}===== TEST SUMMARY =====${NC}"
  
  if [ $INTEGRATION_STATUS -eq 0 ] && [ $RULES_STATUS -eq 0 ]; then
    echo -e "${GREEN}All emulator tests completed successfully!${NC}"
    exit 0
  else
    echo -e "${RED}Some emulator tests failed.${NC}"
    exit 1
  fi
}

# Run the main function
main