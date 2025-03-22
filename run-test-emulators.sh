#!/bin/bash

# Start Firebase emulators for testing with minimal configuration
# This script starts only the essential Firebase emulators for tests

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}=== Starting Essential Firebase Emulators for Testing ===${NC}"

# Check if firebase CLI is installed
if ! command -v firebase &> /dev/null; then
  echo -e "${RED}Firebase CLI not found. Please install it with 'npm install -g firebase-tools'${NC}"
  exit 1
fi

# Set environment variables for testing
export NODE_ENV=test
export $(grep -v '^#' .env.test | xargs)

# Start emulators with only the essential ones (auth, firestore, storage)
echo -e "${YELLOW}Starting minimal Firebase emulators set...${NC}"
echo -e "${BLUE}This will block the terminal. Open another terminal to run tests.${NC}"
echo -e "${BLUE}Press Ctrl+C to stop the emulators when done testing.${NC}"
echo

# Start only essential emulators with specific options
firebase emulators:start \
  --only auth,firestore,storage \
  --project etoile-yachts-test \
  --no-functions \
  --no-pubsub \
  --no-extensions \
  --no-database