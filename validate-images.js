/**
 * Image Validation Script Runner
 * 
 * This script runs image validation across all collections and generates a detailed report.
 * Usage: node validate-images.js
 */

import validateImageUrls from './scripts/validate-images.js';

async function main() {
  console.log('Starting image validation...');
  
  try {
    const results = await validateImageUrls();
    
    console.log('\n==========================================');
    console.log('IMAGE VALIDATION SUMMARY:');
    console.log('==========================================');
    console.log(`Total documents scanned: ${results.stats.totalDocuments}`);
    console.log(`Total images checked: ${results.stats.totalUrls}`);
    console.log(`Valid images: ${results.stats.validUrls} (${((results.stats.validUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
    console.log(`Invalid images: ${results.stats.invalidUrls} (${((results.stats.invalidUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
    console.log(`Missing images: ${results.stats.missingUrls} (${((results.stats.missingUrls / results.stats.totalUrls) * 100).toFixed(1)}%)`);
    
    if (results.invalid.length > 0) {
      console.log('\nIMAGE ISSUES DETECTED:');
      for (const collection in results.stats.byCollection) {
        const stats = results.stats.byCollection[collection];
        if (stats.invalid > 0 || stats.missing > 0) {
          console.log(`- ${collection}: ${stats.invalid} invalid, ${stats.missing} missing (out of ${stats.total})`);
        }
      }
      
      console.log('\nRun the web admin interface to view and fix issues.');
    } else {
      console.log('\nAll images are valid! No issues detected.');
    }
    
    console.log('\nValidation report saved to image_validation_reports collection.');
    console.log('==========================================');
  } catch (error) {
    console.error('Error running validation:', error);
  }
}

main();