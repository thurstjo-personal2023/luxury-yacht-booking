/**
 * Manual Test Script for Blob URL Resolver
 * 
 * This script provides a simple way to test the blob URL resolver 
 * functionality without requiring a full server setup.
 */

// Import our resolver module using dynamic import
import('./blob-url-resolver.mjs')
  .then(({ resolveAllBlobUrls }) => {
    console.log('=== Blob URL Resolver Test Script ===');
    console.log('Starting Blob URL resolution test...');
    
    // Run the resolver
    return resolveAllBlobUrls();
  })
  .then(result => {
    console.log('=== Blob URL Resolution Results ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('=== Test Complete ===');
  })
  .catch(error => {
    console.error('=== Blob URL Resolution Error ===');
    console.error(error);
  });