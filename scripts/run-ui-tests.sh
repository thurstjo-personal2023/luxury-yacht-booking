#!/bin/bash

# Run UI Tests Shell Script
# This script runs Cypress UI tests and generates reports

set -e
echo "🧪 Running Etoile Yachts UI Test Suite 🧪"
echo "========================================="

# Setup environment
export NODE_ENV=test

# Create test reports directory
mkdir -p ./test-reports/cypress

# Start the application in the background
echo "🚀 Starting application server"
npm run dev &
SERVER_PID=$!

# Wait for server to start
echo "⏳ Waiting for server to start..."
npx wait-on http://localhost:5000 -t 30000

# Run Cypress UI tests
echo "📋 Running Cypress UI Tests"
npx cypress open

# Kill the server
kill $SERVER_PID

echo "✅ UI testing completed!"