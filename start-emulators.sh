#!/bin/bash

# Start Firebase emulators for testing
# This script starts the Firebase emulators using the test configuration

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}=== Starting Firebase Emulators for Testing ===${NC}"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Firebase CLI not found. Please install it with 'npm install -g firebase-tools'${NC}"
  exit 1
fi

# Set environment variables for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Start emulators
echo -e "${YELLOW}Starting Firebase emulators...${NC}"
echo -e "${BLUE}This will block the terminal. Open another terminal to run tests.${NC}"
echo -e "${BLUE}Press Ctrl+C to stop the emulators when done testing.${NC}"
echo

# Use test configuration if available
if [ -f "firebase.test.json" ]; then
  firebase emulators:start --config firebase.test.json --project etoile-yachts
else
  firebase emulators:start --project etoile-yachts
fi