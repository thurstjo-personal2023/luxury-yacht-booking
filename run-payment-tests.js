/**
 * Payment Tests Runner Script
 * 
 * This script runs payment-related tests using Jest with the correct configuration.
 * It's designed to work with the project's ESM setup.
 */

import { execSync } from 'child_process';

try {
  console.log('Running payment system tests...');
  console.log('Using CommonJS configuration to avoid ESM compatibility issues');
  
  // Run Jest with the payment configuration
  execSync('NODE_OPTIONS=--experimental-vm-modules npx jest --config=jest.payment.config.cjs', {
    stdio: 'inherit'
  });
  
  console.log('Payment tests completed successfully!');
} catch (error) {
  console.error('Error running payment tests:', error.message);
  process.exit(1);
}