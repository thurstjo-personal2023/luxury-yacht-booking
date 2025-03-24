#!/bin/bash

# Run Super Admin Creation Script
# This script creates the initial Super Admin account

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================================${NC}"
echo -e "${BLUE}🔐 Etoile Yachts Super Admin Account Creation${NC}"
echo -e "${BLUE}==================================================================${NC}"

echo -e "${YELLOW}Creating initial Super Admin account...${NC}"

# Run the script
node scripts/create-super-admin.js

# Check the result
if [ $? -eq 0 ]; then
  echo -e "${GREEN}==================================================================${NC}"
  echo -e "${GREEN}✅ Super Admin account created successfully!${NC}"
  echo -e "${GREEN}==================================================================${NC}"
  exit 0
else
  echo -e "${RED}==================================================================${NC}"
  echo -e "${RED}❌ Failed to create Super Admin account. Please check the output above for details.${NC}"
  echo -e "${RED}==================================================================${NC}"
  exit 1
fi