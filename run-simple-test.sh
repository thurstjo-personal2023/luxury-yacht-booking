#!/bin/bash

# Run a simple test to diagnose issues

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}Running simple test without dependencies...${NC}"

npx jest --config jest.simple.config.js

# Check exit code
if [ $? -eq 0 ]; then
  echo -e "${GREEN}Simple test passed successfully!${NC}"
  exit 0
else
  echo -e "${RED}Simple test failed.${NC}"
  exit 1
fi