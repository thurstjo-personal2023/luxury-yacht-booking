/**
 * Test Module Generator
 * 
 * This script converts TypeScript domain models to CommonJS format for testing.
 * It generates both the CJS module and a corresponding test file.
 * 
 * Usage: 
 *   node create-test-modules.js <source-file> <destination-folder>
 * 
 * Example:
 *   node create-test-modules.js core/domain/media/media-type.ts tests/unit/core/domain/media
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DEFAULT_TIMEOUT = 10000;

/**
 * Convert a TypeScript module to CommonJS format
 * 
 * @param {string} sourceFile Path to the TypeScript source file
 * @param {string} outputFolder Folder to output the CommonJS file
 * @returns {Object} Result object with paths to created files
 */
function convertToCjs(sourceFile, outputFolder) {
  // Read the source file
  const source = fs.readFileSync(sourceFile, 'utf8');
  
  // Extract the file name without extension
  const baseName = path.basename(sourceFile, '.ts');
  
  // Define output paths
  const cjsFilePath = path.join(path.dirname(sourceFile), `${baseName}.cjs`);
  const testFilePath = path.join(outputFolder, `${baseName}.simplified.test.cjs`);
  
  // Process the source code
  let cjsContent = processSourceToCommonJS(source, baseName);
  
  // Write the CommonJS module
  fs.writeFileSync(cjsFilePath, cjsContent, 'utf8');
  console.log(`Created CommonJS module: ${cjsFilePath}`);
  
  // Generate a test file
  const testContent = generateTestFile(baseName, cjsFilePath, source);
  fs.writeFileSync(testFilePath, testContent, 'utf8');
  console.log(`Created test file: ${testFilePath}`);
  
  return {
    module: cjsFilePath,
    test: testFilePath
  };
}

/**
 * Process TypeScript source to CommonJS format
 * 
 * @param {string} source TypeScript source code
 * @param {string} baseName Base name of the file
 * @returns {string} CommonJS formatted code
 */
function processSourceToCommonJS(source, baseName) {
  // Start with a CommonJS header
  let result = `/**
 * ${baseName} (CommonJS Version)
 * 
 * This is a CommonJS version of the ${baseName} module for testing.
 */

`;

  // Handle enums
  const enumMatches = source.match(/export enum (\w+) {([^}]*)}/g);
  if (enumMatches) {
    enumMatches.forEach(match => {
      const enumName = match.match(/export enum (\w+)/)[1];
      const enumBody = match.match(/{([^}]*)}/)[1];
      
      // Convert enum to object
      result += `const ${enumName} = {\n`;
      
      // Process enum members
      const members = enumBody.split(',').map(item => item.trim()).filter(Boolean);
      members.forEach(member => {
        if (member.includes('=')) {
          const [key, value] = member.split('=').map(item => item.trim());
          result += `  ${key}: ${value},\n`;
        } else {
          result += `  ${member}: '${member}',\n`;
        }
      });
      
      result += '};\n\n';
    });
  }
  
  // Handle exported functions
  const functionMatches = source.match(/export function (\w+)([^{]*){([^}]*)}/g);
  if (functionMatches) {
    functionMatches.forEach(match => {
      const funcName = match.match(/export function (\w+)/)[1];
      const funcParams = match.match(/\(([^)]*)\)/)[1];
      const funcBody = match.match(/{([^}]*)}/)[1];
      
      // Convert function
      result += `function ${funcName}(${funcParams}) {\n${funcBody}\n}\n\n`;
    });
  }
  
  // Handle class methods (simplified)
  const classMatches = source.match(/export class (\w+)[^{]*{([^}]*)}/g);
  if (classMatches) {
    classMatches.forEach(match => {
      const className = match.match(/export class (\w+)/)[1];
      
      // For now, convert classes to factory functions
      result += `function create${className}(options = {}) {\n`;
      result += `  return {\n`;
      result += `    // Implement class methods as needed\n`;
      result += `  };\n`;
      result += `}\n\n`;
    });
  }
  
  // Add module exports
  result += 'module.exports = {\n';
  
  // Export any enums
  if (enumMatches) {
    enumMatches.forEach(match => {
      const enumName = match.match(/export enum (\w+)/)[1];
      result += `  ${enumName},\n`;
    });
  }
  
  // Export functions
  if (functionMatches) {
    functionMatches.forEach(match => {
      const funcName = match.match(/export function (\w+)/)[1];
      result += `  ${funcName},\n`;
    });
  }
  
  // Export classes (as factory functions)
  if (classMatches) {
    classMatches.forEach(match => {
      const className = match.match(/export class (\w+)/)[1];
      result += `  create${className},\n`;
    });
  }
  
  result += '};';
  
  return result;
}

/**
 * Generate a test file for the CommonJS module
 * 
 * @param {string} baseName Base name of the file
 * @param {string} modulePath Path to the CommonJS module
 * @param {string} source Original TypeScript source
 * @returns {string} Test file content
 */
function generateTestFile(baseName, modulePath, source) {
  // Calculate the relative path to the module
  const relativePath = path.relative(path.dirname(modulePath), modulePath);
  
  // Start with a test file header
  let result = `/**
 * ${baseName} Tests (CommonJS Version)
 * 
 * Tests for the ${baseName} domain module.
 */

const { ${getExportedSymbols(source).join(', ')} } = require('../../../../../${modulePath.replace(/\\/g, '/')}');

describe('${baseName}', () => {
  // Add your tests here
  test('should be defined', () => {
    // Basic existence test
    ${getExportedSymbols(source).map(symbol => `expect(${symbol}).toBeDefined();`).join('\n    ')}
  });
  
  // Add more specific tests based on the module's functionality
});
`;

  return result;
}

/**
 * Extract exported symbols from TypeScript source
 * 
 * @param {string} source TypeScript source code
 * @returns {string[]} Array of exported symbol names
 */
function getExportedSymbols(source) {
  const symbols = [];
  
  // Extract enum names
  const enumMatches = source.match(/export enum (\w+)/g);
  if (enumMatches) {
    enumMatches.forEach(match => {
      symbols.push(match.replace('export enum ', ''));
    });
  }
  
  // Extract function names
  const functionMatches = source.match(/export function (\w+)/g);
  if (functionMatches) {
    functionMatches.forEach(match => {
      symbols.push(match.replace('export function ', ''));
    });
  }
  
  // Extract class names (as factory functions)
  const classMatches = source.match(/export class (\w+)/g);
  if (classMatches) {
    classMatches.forEach(match => {
      const className = match.replace('export class ', '');
      symbols.push(`create${className}`);
    });
  }
  
  return symbols;
}

/**
 * Update the Jest configuration to include the new test
 * 
 * @param {string} testFile Path to the test file
 */
function updateJestConfig(testFile) {
  const configPath = 'jest.media-tests.config.cjs';
  const config = fs.readFileSync(configPath, 'utf8');
  
  // Check if the config already includes the test
  if (!config.includes(testFile)) {
    // Update the testMatch array
    const newConfig = config.replace(
      /(testMatch:\s*\[\s*')([^']*)(\')/,
      `$1$2',\n    '<rootDir>/${testFile}'`
    );
    
    fs.writeFileSync(configPath, newConfig, 'utf8');
    console.log(`Updated Jest configuration: ${configPath}`);
  }
}

/**
 * Main function
 */
function main() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.error('Usage: node create-test-modules.js <source-file> <destination-folder>');
    process.exit(1);
  }
  
  const [sourceFile, outputFolder] = args;
  
  // Ensure the output folder exists
  if (!fs.existsSync(outputFolder)) {
    fs.mkdirSync(outputFolder, { recursive: true });
  }
  
  // Convert the TypeScript module to CommonJS
  const result = convertToCjs(sourceFile, outputFolder);
  
  // Update the Jest configuration
  updateJestConfig(result.test);
  
  console.log('Done!');
}

// Run the main function
main();