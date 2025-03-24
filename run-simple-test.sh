#!/bin/bash

# Simple Admin Test Runner
# This script runs the simplified admin tests without requiring Firebase emulators

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}🔐 Etoile Yachts Admin Simplified Test Runner${NC}"
echo -e "${BLUE}==================================================================${NC}"

echo -e "${YELLOW}Running simplified tests without Firebase emulator dependencies...${NC}"

# Run the simplified tests with the simple config
NODE_ENV=test npx jest --config=jest.simple.config.cjs

# Check the result
if [ $? -eq 0 ]; then
  echo -e "${GREEN}==================================================================${NC}"
  echo -e "${GREEN}✅ All simplified tests passed successfully!${NC}"
  echo -e "${GREEN}==================================================================${NC}"
  exit 0
else
  echo -e "${RED}==================================================================${NC}"
  echo -e "${RED}❌ Some simplified tests failed. Please check the output above for details.${NC}"
  echo -e "${RED}==================================================================${NC}"
  exit 1
fi