/**
 * Media Validation Test Runner
 * 
 * This script runs the media validation and repair tools on our test collection
 * to verify they work correctly.
 */

const admin = require('firebase-admin');
const { validateMediaUrls, printMediaValidationReport, saveMediaValidationResults } = require('./validate-media');
const { repairAllBrokenUrls } = require('./repair-broken-urls');
const { resolveAllBlobUrls } = require('./resolve-blob-urls');
const { fixRelativeUrls } = require('./fix-relative-urls');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

// The test collection to scan
const TEST_COLLECTION = 'test_media_validation';

// Override the list of collections to scan with just our test collection
const original = {
  validateMedia: require('./validate-media'),
  repairBroken: require('./repair-broken-urls'),
  resolveBlob: require('./resolve-blob-urls'),
  fixRelative: require('./fix-relative-urls')
};

// Save original collection lists before overriding
const originalCollections = {
  validateMedia: [...original.validateMedia.COLLECTIONS_TO_SCAN],
  repairBroken: [...original.repairBroken.COLLECTIONS_TO_SCAN],
  resolveBlob: [...original.resolveBlob.COLLECTIONS_TO_SCAN],
  fixRelative: [...original.fixRelative.COLLECTIONS_TO_SCAN]
};

// Override collection lists for testing
original.validateMedia.COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
original.repairBroken.COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
original.resolveBlob.COLLECTIONS_TO_SCAN = [TEST_COLLECTION];
original.fixRelative.COLLECTIONS_TO_SCAN = [TEST_COLLECTION];

/**
 * Restore original collections after test
 */
function restoreOriginalCollections() {
  original.validateMedia.COLLECTIONS_TO_SCAN = originalCollections.validateMedia;
  original.repairBroken.COLLECTIONS_TO_SCAN = originalCollections.repairBroken;
  original.resolveBlob.COLLECTIONS_TO_SCAN = originalCollections.resolveBlob;
  original.fixRelative.COLLECTIONS_TO_SCAN = originalCollections.fixRelative;
}

/**
 * Run media validation test
 */
async function runMediaValidationTest() {
  try {
    console.log('\n==== RUNNING MEDIA VALIDATION TEST ====\n');
    
    // Step 1: Run media validation to identify issues
    console.log('\n=== Step 1: Validate Media URLs ===\n');
    const validationResults = await validateMediaUrls();
    printMediaValidationReport(validationResults);
    
    // Step 2: Fix relative URLs
    console.log('\n=== Step 2: Fix Relative URLs ===\n');
    const relativeUrlResults = await fixRelativeUrls();
    console.log(`Fixed ${relativeUrlResults.totalFixed} relative URLs`);
    
    // Step 3: Resolve blob URLs
    console.log('\n=== Step 3: Resolve Blob URLs ===\n');
    const blobUrlResults = await resolveAllBlobUrls();
    console.log(`Resolved ${blobUrlResults.totalResolved} blob URLs`);
    
    // Step 4: Repair broken URLs
    console.log('\n=== Step 4: Repair Broken URLs ===\n');
    const brokenUrlResults = await repairAllBrokenUrls();
    console.log(`Repaired ${brokenUrlResults.stats.totalRepaired} broken URLs`);
    
    // Step 5: Validate media again to confirm fixes
    console.log('\n=== Step 5: Validate Media URLs (After Fixes) ===\n');
    const finalValidationResults = await validateMediaUrls();
    printMediaValidationReport(finalValidationResults);
    
    // Print improvement summary
    const initialIssues = validationResults.invalid.length + validationResults.missing.length;
    const remainingIssues = finalValidationResults.invalid.length + finalValidationResults.missing.length;
    const fixedIssues = initialIssues - remainingIssues;
    
    console.log('\n==== VALIDATION TEST SUMMARY ====\n');
    console.log(`Initial issues detected: ${initialIssues}`);
    console.log(`Issues fixed: ${fixedIssues}`);
    console.log(`Remaining issues: ${remainingIssues}`);
    console.log(`Success rate: ${(fixedIssues / (initialIssues || 1) * 100).toFixed(1)}%`);
    
    if (remainingIssues > 0) {
      console.log('\nRemaining issues may include:');
      console.log('- Genuinely unreachable URLs (404s, etc.)');
      console.log('- Content type mismatches that cannot be automatically fixed');
      console.log('- Special URL formats that require manual intervention');
    }
    
    console.log('\n==== MEDIA VALIDATION TEST COMPLETE ====\n');
    
  } catch (error) {
    console.error('Error running media validation test:', error);
  } finally {
    // Restore original collection lists
    restoreOriginalCollections();
  }
}

/**
 * Main function
 */
async function main() {
  try {
    await runMediaValidationTest();
  } catch (error) {
    console.error('Error running test:', error);
  } finally {
    process.exit(0);
  }
}

// Run the script
main().catch(error => {
  console.error('Error executing script:', error);
  process.exit(1);
});