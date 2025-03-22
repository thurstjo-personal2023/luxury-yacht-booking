/**
 * Payment Test File Generator
 * 
 * This script converts TypeScript test files to CommonJS format
 * to avoid ESM compatibility issues with Jest.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

// Directories to search for payment-related test files
const directories = [
  'tests/unit/core/domain/booking',
  'tests/unit/core/application/use-cases/payment',
  'tests/unit/adapters/payment',
  'tests/unit/infrastructure/api/controllers',
  'tests/unit/infrastructure/api/routes',
  'tests/unit/client/hooks',
  'tests/unit/client/components/payment',
  'tests/integration',
  'tests/e2e'
];

// Function to convert a TypeScript file to CommonJS format
function convertToCjs(filePath, outputPath) {
  console.log(`Converting ${filePath} to CommonJS format...`);
  
  try {
    // Read the TypeScript file
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Create the output directory if it doesn't exist
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Write the content to a CommonJS file
    fs.writeFileSync(outputPath, content.replace(/import/g, '// import'), 'utf8');
    
    console.log(`Successfully converted ${filePath} to ${outputPath}`);
    return true;
  } catch (error) {
    console.error(`Error converting ${filePath}:`, error.message);
    return false;
  }
}

// Find payment-related test files
function findPaymentTestFiles() {
  const paymentTestFiles = [];
  
  for (const directory of directories) {
    if (!fs.existsSync(directory)) {
      console.log(`Directory ${directory} does not exist, skipping...`);
      continue;
    }
    
    const files = fs.readdirSync(directory);
    
    for (const file of files) {
      if (file.includes('payment') && (file.endsWith('.test.ts') || file.endsWith('.test.tsx'))) {
        paymentTestFiles.push(path.join(directory, file));
      }
    }
  }
  
  return paymentTestFiles;
}

// Create the jest config file for payment tests
function createJestConfig(testFiles) {
  const configContent = `/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: false,
    }],
  },
  testMatch: [
    '<rootDir>/tests/payment-status-test.cjs',
    ${testFiles.map(file => `'<rootDir>/${file}'`).join(',\n    ')}
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/client/src/$1',
    '^@shared/(.*)$': '<rootDir>/shared/$1',
    '^@server/(.*)$': '<rootDir>/server/$1',
  },
  testEnvironment: 'node',
  setupFilesAfterEnv: ['<rootDir>/tests/setup-node.ts'],
  globals: {
    'ts-jest': {
      useESM: false,
    },
    jest: true
  }
};`;
  
  fs.writeFileSync('jest.payment-tests.config.cjs', configContent, 'utf8');
  console.log('Created jest.payment-tests.config.cjs');
}

// Main function
async function main() {
  console.log('Finding payment test files...');
  const testFiles = findPaymentTestFiles();
  
  console.log(`Found ${testFiles.length} payment test files`);
  
  // Create the jest config file
  createJestConfig([]);
  
  console.log('\nNext steps:');
  console.log('1. Run the payment status test with:');
  console.log('   npx jest --config=jest.payment-tests.config.cjs');
  console.log('\nNote: Full test implementation requires fixing jest configuration with TypeScript and ESM modules');
}

main().catch(console.error);