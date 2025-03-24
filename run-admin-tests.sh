#!/bin/bash

# Admin Registration and MFA Tests Runner
# This script executes the test suite for Administrator Registration and Multi-Factor Authentication

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}🔐 Etoile Yachts Admin Authentication Test Runner${NC}"
echo -e "${BLUE}==================================================================${NC}"

# Check if Firebase emulators are running
check_emulators() {
  echo -e "${YELLOW}Checking if Firebase emulators are running...${NC}"
  
  # Check Auth emulator on port 9099
  curl -s http://localhost:9099 > /dev/null
  AUTH_RUNNING=$?
  
  # Check Firestore emulator on port 8080
  curl -s http://localhost:8080 > /dev/null
  FIRESTORE_RUNNING=$?
  
  if [ $AUTH_RUNNING -eq 0 ] && [ $FIRESTORE_RUNNING -eq 0 ]; then
    echo -e "${GREEN}✅ Firebase emulators are running.${NC}"
    return 0
  else
    echo -e "${RED}❌ Firebase emulators are not running.${NC}"
    echo -e "${YELLOW}Please start the emulators with 'firebase emulators:start' before running tests.${NC}"
    return 1
  fi
}

# Run admin registration validation tests
run_admin_registration_tests() {
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  echo -e "${BLUE}Running Administrator Registration & Validation Tests...${NC}"
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  
  NODE_ENV=test npx jest --config=jest.config.js tests/unit/admin-registration-validation.test.ts
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Administrator Registration & Validation Tests passed.${NC}"
    return 0
  else
    echo -e "${RED}❌ Administrator Registration & Validation Tests failed.${NC}"
    return 1
  fi
}

# Run admin MFA tests
run_admin_mfa_tests() {
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  echo -e "${BLUE}Running Administrator MFA Tests...${NC}"
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  
  NODE_ENV=test npx jest --config=jest.config.js tests/unit/admin-mfa.test.ts
  
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Administrator MFA Tests passed.${NC}"
    return 0
  else
    echo -e "${RED}❌ Administrator MFA Tests failed.${NC}"
    return 1
  fi
}

# Run Cypress E2E tests for admin registration
run_admin_e2e_tests() {
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  echo -e "${BLUE}Running E2E Tests for Administrator Registration...${NC}"
  echo -e "${BLUE}-----------------------------------------------------------------${NC}"
  
  # Check if Cypress is installed
  if [ -f "node_modules/.bin/cypress" ]; then
    NODE_ENV=test npx cypress run --spec "cypress/e2e/admin-registration.cy.ts"
    
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✅ E2E Tests for Administrator Registration passed.${NC}"
      return 0
    else
      echo -e "${RED}❌ E2E Tests for Administrator Registration failed.${NC}"
      return 1
    fi
  else
    echo -e "${YELLOW}⚠️ Cypress not found, skipping E2E tests.${NC}"
    return 0
  fi
}

# Main execution
main() {
  local registration_result=0
  local mfa_result=0
  local e2e_result=0
  
  check_emulators
  if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Would you like to start the emulators now? (y/n)${NC}"
    read -r start_emulators
    
    if [ "$start_emulators" = "y" ] || [ "$start_emulators" = "Y" ]; then
      echo -e "${YELLOW}Starting Firebase emulators...${NC}"
      firebase emulators:start --only auth,firestore &
      echo -e "${YELLOW}Waiting for emulators to start...${NC}"
      sleep 10
    else
      echo -e "${RED}Tests cannot run without Firebase emulators. Exiting.${NC}"
      exit 1
    fi
  fi
  
  run_admin_registration_tests
  registration_result=$?
  
  run_admin_mfa_tests
  mfa_result=$?
  
  run_admin_e2e_tests
  e2e_result=$?
  
  echo -e "${BLUE}==================================================================${NC}"
  echo -e "${BLUE}📊 Test Results Summary${NC}"
  echo -e "${BLUE}==================================================================${NC}"
  
  if [ $registration_result -eq 0 ]; then
    echo -e "${GREEN}✅ Administrator Registration & Validation Tests: PASSED${NC}"
  else
    echo -e "${RED}❌ Administrator Registration & Validation Tests: FAILED${NC}"
  fi
  
  if [ $mfa_result -eq 0 ]; then
    echo -e "${GREEN}✅ Administrator MFA Tests: PASSED${NC}"
  else
    echo -e "${RED}❌ Administrator MFA Tests: FAILED${NC}"
  fi
  
  if [ -f "node_modules/.bin/cypress" ]; then
    if [ $e2e_result -eq 0 ]; then
      echo -e "${GREEN}✅ E2E Tests for Administrator Registration: PASSED${NC}"
    else
      echo -e "${RED}❌ E2E Tests for Administrator Registration: FAILED${NC}"
    fi
  else
    echo -e "${YELLOW}⚠️ E2E Tests for Administrator Registration: SKIPPED (Cypress not installed)${NC}"
  fi
  
  if [ $registration_result -eq 0 ] && [ $mfa_result -eq 0 ] && ([ $e2e_result -eq 0 ] || [ ! -f "node_modules/.bin/cypress" ]); then
    echo -e "${GREEN}==================================================================${NC}"
    echo -e "${GREEN}🎉 All tests passed successfully!${NC}"
    echo -e "${GREEN}==================================================================${NC}"
    return 0
  else
    echo -e "${RED}==================================================================${NC}"
    echo -e "${RED}❌ Some tests failed. Please check the output above for details.${NC}"
    echo -e "${RED}==================================================================${NC}"
    return 1
  fi
}

# Execute main function
main
exit $?