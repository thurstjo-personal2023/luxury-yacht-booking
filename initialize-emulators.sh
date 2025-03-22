#!/bin/bash

# Initialize Firebase Emulators for Testing
# This script creates necessary directories and configuration files for the emulators

# Color codes for output
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[0;33m"
BLUE="\033[0;34m"
NC="\033[0m" # No Color

echo -e "${BLUE}=== Initializing Firebase Emulators for Testing ===${NC}"

# Set up Google Cloud credentials for Firebase
export GOOGLE_APPLICATION_CREDENTIALS="./etoile-yachts-9322f3c69d91.json"
echo -e "${GREEN}Using Google Cloud service account for authentication: $(cat $GOOGLE_APPLICATION_CREDENTIALS | grep client_email | sed 's/.*: "\(.*\)".*/\1/')${NC}"

# Verify storage.rules file exists
if [ ! -f "storage.rules" ]; then
  echo -e "${RED}storage.rules file not found. Creating it...${NC}"
  cat > storage.rules << EOL
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      // Allow read access to anyone
      allow read: if true;
      
      // Allow write access to authenticated users
      allow write: if request.auth != null;
    }
  }
}
EOL
  echo -e "${GREEN}Created storage.rules file${NC}"
fi

# Verify functions folder exists
if [ ! -d "functions" ]; then
  echo -e "${YELLOW}Functions folder not found. Creating it...${NC}"
  mkdir -p functions
  
  # Create basic index.js file
  cat > functions/index.js << EOL
/**
 * Firebase Cloud Functions
 * 
 * This file contains Cloud Functions for the Etoile Yachts platform.
 * It should be replaced with the TypeScript implementation once the emulators are working.
 */

const functions = require('firebase-functions');

// Example function - This is a placeholder
exports.helloWorld = functions.https.onRequest((request, response) => {
  response.json({ message: "Hello from Etoile Yachts Cloud Functions!" });
});

// Media validation pubsub listener - This is a placeholder
exports.processMediaValidation = functions.pubsub
  .topic('media-validation')
  .onPublish((message) => {
    console.log("Media validation request received:", message.json);
    return Promise.resolve();
  });
EOL

  # Create basic package.json file
  cat > functions/package.json << EOL
{
  "name": "functions",
  "description": "Firebase Cloud Functions for Etoile Yachts",
  "scripts": {
    "serve": "firebase emulators:start --only functions",
    "shell": "firebase functions:shell",
    "start": "npm run shell",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "engines": {
    "node": "18"
  },
  "main": "index.js",
  "dependencies": {
    "firebase-admin": "^11.8.0",
    "firebase-functions": "^4.3.1"
  },
  "private": true
}
EOL
  echo -e "${GREEN}Created functions folder with basic implementation${NC}"
fi

# Verify firebase.json configuration
if grep -q "\"storage\":" firebase.json; then
  echo -e "${GREEN}firebase.json already contains storage configuration${NC}"
else
  echo -e "${YELLOW}Adding storage configuration to firebase.json${NC}"
  # Use temporary file for sed replacement
  sed -i 's/\"firestore\": {/\"firestore\": {/; s/  },/  },\n  \"storage\": {\n    \"rules\": \"storage.rules\"\n  },/' firebase.json
  echo -e "${GREEN}Updated firebase.json with storage configuration${NC}"
fi

# Update firebase.test.json as well
if grep -q "\"storage\":" firebase.test.json; then
  echo -e "${GREEN}firebase.test.json already contains storage configuration${NC}"
else
  echo -e "${YELLOW}Adding storage configuration to firebase.test.json${NC}"
  # Use temporary file for sed replacement
  sed -i 's/\"firestore\": {/\"firestore\": {/; s/  },/  },\n  \"storage\": {\n    \"rules\": \"storage.rules\"\n  },/' firebase.test.json
  echo -e "${GREEN}Updated firebase.test.json with storage configuration${NC}"
fi

echo -e "${GREEN}Firebase emulator initialization complete!${NC}"
echo -e "${YELLOW}You can now run the emulators with './start-emulators.sh'${NC}"

# Make sure the script is executable
chmod +x start-emulators.sh
echo -e "${BLUE}Made start-emulators.sh executable${NC}"