/**
 * Media Validation Report Checker
 * 
 * This script checks the media_validation_reports collection to monitor
 * validation results and report on fixes made by the validation process.
 * 
 * Usage: node scripts/check-validation-reports.js [--limit=10]
 */

const admin = require('firebase-admin');

// Report collection name
const REPORT_COLLECTION = 'media_validation_reports';

// Parse command line arguments
const args = process.argv.slice(2);
let limit = 10; // Default limit

args.forEach(arg => {
  if (arg.startsWith('--limit=')) {
    limit = parseInt(arg.split('=')[1], 10);
  }
});

// Initialize Firebase Admin SDK
let serviceAccount;
try {
  serviceAccount = require('../firebase-admin-key.json');
} catch (error) {
  console.error('Error loading service account key file:');
  console.error('Please make sure firebase-admin-key.json exists in the root directory');
  console.error('You can download this file from the Firebase Console > Project Settings > Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

/**
 * Get recent media validation reports
 * 
 * @param {number} limit - Maximum number of reports to fetch
 * @returns {Promise<Array>} - Array of report documents
 */
async function getRecentReports(limit) {
  try {
    const snapshot = await admin
      .firestore()
      .collection(REPORT_COLLECTION)
      .orderBy('timestamp', 'desc')
      .limit(limit)
      .get();
      
    if (snapshot.empty) {
      console.log('No validation reports found.');
      return [];
    }
    
    const reports = [];
    snapshot.forEach(doc => {
      reports.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    return reports;
  } catch (error) {
    console.error('Error fetching validation reports:', error);
    return [];
  }
}

/**
 * Get summary of fixed URLs by type
 * 
 * @param {Array} reports - Array of report documents
 * @returns {Object} - Summary of fixes by type
 */
function getFixSummary(reports) {
  const summary = {
    totalReports: reports.length,
    totalFixedRelativeUrls: 0,
    totalFixedMediaTypes: 0,
    fixesByCollection: {},
    recentFixedRelativeUrls: [],
    recentFixedMediaTypes: []
  };
  
  reports.forEach(report => {
    // Count relative URL fixes
    const relativeUrlFixes = report.fixes?.relativeUrls || [];
    summary.totalFixedRelativeUrls += relativeUrlFixes.length;
    
    // Add recent examples (up to 5 per report)
    if (relativeUrlFixes.length > 0) {
      summary.recentFixedRelativeUrls.push(...relativeUrlFixes.slice(0, 5));
    }
    
    // Count media type fixes
    const mediaTypeFixes = report.fixes?.mediaTypes || [];
    summary.totalFixedMediaTypes += mediaTypeFixes.length;
    
    // Add recent examples (up to 5 per report)
    if (mediaTypeFixes.length > 0) {
      summary.recentFixedMediaTypes.push(...mediaTypeFixes.slice(0, 5));
    }
    
    // Track by collection
    const collection = report.collection;
    if (!summary.fixesByCollection[collection]) {
      summary.fixesByCollection[collection] = {
        relativeUrlFixes: 0,
        mediaTypeFixes: 0
      };
    }
    
    summary.fixesByCollection[collection].relativeUrlFixes += relativeUrlFixes.length;
    summary.fixesByCollection[collection].mediaTypeFixes += mediaTypeFixes.length;
  });
  
  // Limit recent examples to keep output manageable
  summary.recentFixedRelativeUrls = summary.recentFixedRelativeUrls.slice(0, 10);
  summary.recentFixedMediaTypes = summary.recentFixedMediaTypes.slice(0, 10);
  
  return summary;
}

/**
 * Get a human-readable timestamp
 * 
 * @param {Object} timestamp - Firestore timestamp
 * @returns {string} - Human-readable timestamp
 */
function formatTimestamp(timestamp) {
  if (!timestamp) return 'Unknown';
  
  try {
    // Handle both Firestore Timestamp objects and serialized timestamps
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp._seconds * 1000);
    return date.toISOString();
  } catch (error) {
    return 'Invalid timestamp';
  }
}

/**
 * Print detailed report information
 * 
 * @param {Object} report - Validation report document
 */
function printDetailedReport(report) {
  console.log(`\n=== Report ID: ${report.id} ===`);
  console.log(`Timestamp: ${formatTimestamp(report.timestamp)}`);
  console.log(`Collection: ${report.collection}`);
  console.log(`Document ID: ${report.documentId}`);
  
  // Print relative URL fixes
  const relativeUrlFixes = report.fixes?.relativeUrls || [];
  if (relativeUrlFixes.length > 0) {
    console.log(`\nRelative URL fixes (${relativeUrlFixes.length}):`);
    relativeUrlFixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. Path: ${fix.path}`);
      console.log(`     Original: ${fix.original}`);
      console.log(`     Updated: ${fix.updated}`);
    });
  } else {
    console.log('\nNo relative URL fixes in this report.');
  }
  
  // Print media type fixes
  const mediaTypeFixes = report.fixes?.mediaTypes || [];
  if (mediaTypeFixes.length > 0) {
    console.log(`\nMedia type fixes (${mediaTypeFixes.length}):`);
    mediaTypeFixes.forEach((fix, index) => {
      console.log(`  ${index + 1}. Path: ${fix.path}`);
      console.log(`     Original type: ${fix.original}`);
      console.log(`     Detected type: ${fix.updated}`);
      console.log(`     URL: ${fix.url}`);
    });
  } else {
    console.log('\nNo media type fixes in this report.');
  }
}

/**
 * Main function
 */
async function main() {
  console.log('=== Media Validation Report Checker ===');
  console.log(`Checking the last ${limit} validation reports...\n`);
  
  try {
    // Get recent reports
    const reports = await getRecentReports(limit);
    
    if (reports.length === 0) {
      console.log('No validation reports found. Try running the validation process first.');
      process.exit(0);
    }
    
    // Get summary of fixes
    const summary = getFixSummary(reports);
    
    // Print summary
    console.log(`Found ${summary.totalReports} validation reports`);
    console.log(`Total relative URL fixes: ${summary.totalFixedRelativeUrls}`);
    console.log(`Total media type fixes: ${summary.totalFixedMediaTypes}`);
    
    // Print collection breakdown
    console.log('\nFixes by collection:');
    for (const [collection, stats] of Object.entries(summary.fixesByCollection)) {
      if (stats.relativeUrlFixes > 0 || stats.mediaTypeFixes > 0) {
        console.log(`  ${collection}:`);
        console.log(`    Relative URL fixes: ${stats.relativeUrlFixes}`);
        console.log(`    Media type fixes: ${stats.mediaTypeFixes}`);
      }
    }
    
    // Print example fixes
    if (summary.recentFixedRelativeUrls.length > 0) {
      console.log('\nRecent relative URL fixes:');
      summary.recentFixedRelativeUrls.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix.original} → ${fix.updated}`);
      });
    }
    
    if (summary.recentFixedMediaTypes.length > 0) {
      console.log('\nRecent media type fixes:');
      summary.recentFixedMediaTypes.forEach((fix, index) => {
        console.log(`  ${index + 1}. ${fix.path}: ${fix.original} → ${fix.updated}`);
      });
    }
    
    // Ask if user wants to see detailed reports
    console.log('\nDo you want to see detailed reports? (yes/no)');
    process.stdin.once('data', (data) => {
      const answer = data.toString().trim().toLowerCase();
      
      if (answer === 'yes' || answer === 'y') {
        // Print detailed reports
        reports.slice(0, 3).forEach(report => {
          printDetailedReport(report);
        });
      }
      
      console.log('\n=== End of Report ===');
      process.exit(0);
    });
  } catch (error) {
    console.error('Error checking validation reports:', error);
    process.exit(1);
  }
}

// Run the script
main();