/**
 * Integration Tests Runner Script
 * 
 * This script runs the end-to-end and integration tests for the Etoile Yachts platform.
 * Usage: node run-integration-tests.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Test suites to run
const TEST_SUITES = {
  e2e: {
    payment: 'tests/e2e/payment/payment-flow.test.ts',
    booking: 'tests/e2e/booking/booking-flow.test.ts'
  },
  integration: {
    crossModule: 'tests/integration/cross-module/booking-payment-integration.test.ts',
    payment: 'tests/integration/payment/firestore-payment-repository.test.ts',
    booking: 'tests/integration/booking/firestore-booking-repository.test.ts'
  }
};

// Color codes for terminal output
const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

/**
 * Run tests with Jest
 * @param {string} testPath - Path to the test file/directory
 * @param {string} label - Label for the test run
 * @returns {boolean} - Whether the tests passed
 */
function runTests(testPath, label) {
  console.log(`\n${COLORS.bright}${COLORS.blue}Running ${label} tests...${COLORS.reset}`);
  console.log(`${COLORS.cyan}${testPath}${COLORS.reset}\n`);
  
  try {
    execSync(`npx jest ${testPath} --config=jest.integration.config.js --verbose`, { stdio: 'inherit' });
    console.log(`\n${COLORS.green}✓ ${label} tests passed${COLORS.reset}`);
    return true;
  } catch (error) {
    console.log(`\n${COLORS.red}✗ ${label} tests failed${COLORS.reset}`);
    return false;
  }
}

/**
 * Verify that emulators are running
 * @returns {boolean} - Whether the emulators are running
 */
function checkEmulators() {
  console.log(`\n${COLORS.bright}${COLORS.yellow}Checking Firebase emulators...${COLORS.reset}`);
  
  try {
    // Check if emulator processes are running
    const processes = execSync('ps aux | grep firebase-emulators').toString();
    
    if (!processes.includes('firebase emulators:start')) {
      console.log(`${COLORS.red}Firebase emulators are not running. Please start them with:${COLORS.reset}`);
      console.log(`${COLORS.cyan}firebase emulators:start${COLORS.reset}`);
      return false;
    }
    
    console.log(`${COLORS.green}✓ Firebase emulators are running${COLORS.reset}`);
    return true;
  } catch (error) {
    console.log(`${COLORS.red}Failed to check emulator status: ${error.message}${COLORS.reset}`);
    console.log(`${COLORS.cyan}Please make sure Firebase emulators are running with:${COLORS.reset}`);
    console.log(`${COLORS.cyan}firebase emulators:start${COLORS.reset}`);
    return false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log(`${COLORS.bright}${COLORS.magenta}====================================${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}  Etoile Yachts Integration Tests  ${COLORS.reset}`);
  console.log(`${COLORS.bright}${COLORS.magenta}====================================${COLORS.reset}`);
  
  // Check if emulators are running
  if (!checkEmulators()) {
    process.exit(1);
  }
  
  const results = {
    passed: 0,
    failed: 0,
    total: 0
  };
  
  // Run E2E tests
  console.log(`\n${COLORS.bright}${COLORS.magenta}Running End-to-End Test Suites${COLORS.reset}`);
  
  for (const [name, testPath] of Object.entries(TEST_SUITES.e2e)) {
    results.total++;
    if (runTests(testPath, `E2E ${name}`)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  // Run Integration tests
  console.log(`\n${COLORS.bright}${COLORS.magenta}Running Integration Test Suites${COLORS.reset}`);
  
  for (const [name, testPath] of Object.entries(TEST_SUITES.integration)) {
    results.total++;
    if (runTests(testPath, `Integration ${name}`)) {
      results.passed++;
    } else {
      results.failed++;
    }
  }
  
  // Print summary
  console.log(`\n${COLORS.bright}${COLORS.magenta}=== Test Summary ===${COLORS.reset}`);
  console.log(`${COLORS.bright}Total test suites: ${results.total}${COLORS.reset}`);
  console.log(`${COLORS.green}Passed: ${results.passed}${COLORS.reset}`);
  console.log(`${COLORS.red}Failed: ${results.failed}${COLORS.reset}`);
  
  if (results.failed > 0) {
    console.log(`\n${COLORS.yellow}Some tests failed. Please check the output above for details.${COLORS.reset}`);
    process.exit(1);
  } else {
    console.log(`\n${COLORS.green}All tests passed successfully!${COLORS.reset}`);
  }
}

main().catch(error => {
  console.error(`${COLORS.red}Error running tests: ${error.message}${COLORS.reset}`);
  process.exit(1);
});