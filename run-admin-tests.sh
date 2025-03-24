#!/bin/bash

# Admin Tests Runner Script
# This script runs the tests for the Administrator Registration and MFA functionality

# Set up colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Running Administrator Registration & MFA Tests${NC}"
echo "=================================="

# Check if Firebase emulators are running
echo "Checking if Firebase emulators are running..."
curl -s http://localhost:9099 > /dev/null
EMULATOR_STATUS=$?

if [ $EMULATOR_STATUS -ne 0 ]; then
  echo -e "${RED}Firebase emulators are not running. Please start them first with:${NC}"
  echo "firebase emulators:start"
  exit 1
fi

echo -e "${GREEN}Firebase emulators detected.${NC}"

# Run unit tests
echo -e "\n${YELLOW}Running unit tests for Admin Registration & MFA${NC}"
echo "----------------------------------"
npx jest tests/unit/admin-registration-validation.test.ts tests/unit/admin-mfa.test.ts --no-cache --detectOpenHandles --testTimeout=60000

# Check if Cypress is installed
if [ -d "node_modules/cypress" ]; then
  # Run E2E tests if we have Cypress
  echo -e "\n${YELLOW}Running E2E tests for Admin Registration & MFA${NC}"
  echo "----------------------------------"
  npx cypress run --spec "cypress/e2e/admin-registration.cy.ts" --headless
else
  echo -e "\n${YELLOW}Skipping E2E tests (Cypress not installed)${NC}"
  echo "To run E2E tests, install Cypress with: npm install cypress --save-dev"
fi

echo -e "\n${GREEN}Administrator test suite execution complete${NC}"