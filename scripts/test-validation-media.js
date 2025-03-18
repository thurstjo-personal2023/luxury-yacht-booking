/**
 * Test Validation Media Script
 * 
 * This script runs a comprehensive test of our media validation and repair tools
 * using a test collection populated with various problematic media URLs.
 */

const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { createTestCollection } = require('./create-test-media-collection');
const { validateMediaUrls, printMediaValidationReport } = require('./validate-media');
const { repairAllBrokenUrls } = require('./repair-broken-urls');
const { resolveAllBlobUrls } = require('./resolve-blob-urls');
const { fixRelativeUrls } = require('./fix-relative-urls');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// Test collection name
const TEST_COLLECTION = 'test_media_validation';

// Override collection lists for testing
const originalCollections = {
  validate: require('./validate-media').COLLECTIONS_TO_SCAN,
  repair: require('./repair-broken-urls').COLLECTIONS_TO_SCAN,
  resolve: require('./resolve-blob-urls').COLLECTIONS_TO_SCAN,
  fix: require('./fix-relative-urls').COLLECTIONS_TO_SCAN
};

function overrideCollections() {
  require('./validate-media').COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
  require('./repair-broken-urls').COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
  require('./resolve-blob-urls').COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
  require('./fix-relative-urls').COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
}

function restoreCollections() {
  require('./validate-media').COLLECTIONS_TO_SCAN = originalCollections.validate;
  require('./repair-broken-urls').COLLECTIONS_TO_SCAN = originalCollections.repair;
  require('./resolve-blob-urls').COLLECTIONS_TO_SCAN = originalCollections.resolve;
  require('./fix-relative-urls').COLLECTIONS_TO_SCAN = originalCollections.fix;
}

/**
 * Run a comprehensive test of our media validation and repair tools
 */
async function runMediaValidationTest() {
  try {
    const testId = uuidv4().substring(0, 8);
    console.log(`\n==== STARTING MEDIA VALIDATION TEST [${testId}] ====\n`);
    
    // Step 1: Create test collection with problematic URLs
    console.log('Step 1: Creating test collection with problematic media URLs...');
    await createTestCollection();
    console.log('✓ Test collection created\n');
    
    // Override collections to only scan our test collection
    overrideCollections();
    
    try {
      // Step 2: Run initial validation to identify issues
      console.log('Step 2: Running initial media validation...');
      const initialResults = await validateMediaUrls();
      printMediaValidationReport(initialResults);
      
      const initialIssues = initialResults.invalid.length + 
                           initialResults.blob.length + 
                           initialResults.relative.length +
                           initialResults.missing.length;
      
      console.log(`✓ Initial validation complete. Found ${initialIssues} issues\n`);
      
      // Step 3: Fix relative URLs
      console.log('Step 3: Fixing relative URLs...');
      const relativeResults = await fixRelativeUrls();
      console.log(`✓ Fixed ${relativeResults.stats.totalFixed} relative URLs\n`);
      
      // Step 4: Resolve blob URLs
      console.log('Step 4: Resolving blob URLs...');
      const blobResults = await resolveAllBlobUrls();
      console.log(`✓ Resolved ${blobResults.stats.totalResolved} blob URLs\n`);
      
      // Step 5: Repair broken URLs
      console.log('Step 5: Repairing broken URLs...');
      const repairResults = await repairAllBrokenUrls();
      console.log(`✓ Repaired ${repairResults.stats.totalRepaired} broken URLs\n`);
      
      // Step 6: Run final validation to verify fixes
      console.log('Step 6: Running final validation to verify fixes...');
      const finalResults = await validateMediaUrls();
      printMediaValidationReport(finalResults);
      
      const remainingIssues = finalResults.invalid.length + 
                             finalResults.blob.length + 
                             finalResults.relative.length +
                             finalResults.missing.length;
      
      const fixedIssues = initialIssues - remainingIssues;
      const successRate = Math.round((fixedIssues / initialIssues) * 100);
      
      console.log('\n==== MEDIA VALIDATION TEST SUMMARY ====\n');
      console.log(`Initial issues: ${initialIssues}`);
      console.log(`Issues fixed: ${fixedIssues}`);
      console.log(`Remaining issues: ${remainingIssues}`);
      console.log(`Success rate: ${successRate}%\n`);
      
      if (remainingIssues > 0) {
        console.log('Remaining issues may include:');
        console.log('- URLs that are genuinely inaccessible');
        console.log('- Content mismatches that require manual correction');
        console.log('- Special cases not covered by the automated fixes\n');
      }
      
      console.log(`==== MEDIA VALIDATION TEST [${testId}] COMPLETE ====\n`);
      
      return {
        testId,
        initialIssues,
        fixedIssues,
        remainingIssues,
        successRate
      };
    } finally {
      // Always restore the original collections
      restoreCollections();
    }
  } catch (error) {
    console.error('Error running media validation test:', error);
    restoreCollections();
    throw error;
  }
}

/**
 * Save test results to Firestore
 * 
 * @param {Object} results Test results
 * @returns {Promise<string>} ID of the saved report
 */
async function saveTestResults(results) {
  try {
    const reportId = results.testId;
    const timestamp = admin.firestore.FieldValue.serverTimestamp();
    
    // Create a summary of the results
    const summary = {
      id: reportId,
      timestamp,
      initialIssues: results.initialIssues,
      fixedIssues: results.fixedIssues,
      remainingIssues: results.remainingIssues,
      successRate: results.successRate
    };
    
    // Save the summary to Firestore
    await db.collection('media_validation_tests').doc(reportId).set(summary);
    
    console.log(`Test results saved with ID: ${reportId}`);
    return reportId;
  } catch (error) {
    console.error('Error saving test results:', error);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  try {
    const results = await runMediaValidationTest();
    await saveTestResults(results);
    process.exit(0);
  } catch (error) {
    console.error('Error in main process:', error);
    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  main();
}

module.exports = {
  runMediaValidationTest,
  TEST_COLLECTION
};