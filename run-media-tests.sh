#!/bin/bash

# Run Media Validation Tests
echo "Running Media Validation Tests..."
npx jest --config jest.media-validation.config.cjs --forceExit

# Exit with the status of the last command
exit $?