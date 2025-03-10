/**
 * Test script to analyze media field formats in the unified_yacht_experiences.json file
 * This script helps debug the media field access issues
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Main test function
async function testMediaFieldHandling() {
  console.log('Starting media field handling test with unified_yacht_experiences.json data');
  
  try {
    // Load the unified yacht experiences data
    const filePath = path.join(process.cwd(), 'unified_yacht_experiences.json');
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    const yachtData = JSON.parse(rawData);
    
    console.log(`\nLoaded ${yachtData.length} yacht records from unified_yacht_experiences.json`);
    
    // Group yachts by source collection for analysis
    const yachtsBySource = {};
    for (const yacht of yachtData) {
      const source = yacht._source || 'unknown';
      if (!yachtsBySource[source]) {
        yachtsBySource[source] = [];
      }
      yachtsBySource[source].push(yacht);
    }
    
    console.log('\nYacht sources distribution:');
    for (const [source, yachts] of Object.entries(yachtsBySource)) {
      console.log(`- ${source}: ${yachts.length} records`);
    }
    
    // Analyze media field formats in each source
    console.log('\n=== Media Field Format Analysis ===');
    for (const [source, yachts] of Object.entries(yachtsBySource)) {
      console.log(`\nSource: ${source}`);
      const mediaFormats = {
        'undefined': 0,
        'empty array': 0,
        'non-empty array': 0,
        'object with numeric keys': 0,
        'other object': 0,
        'other': 0
      };
      
      for (const yacht of yachts) {
        if (yacht.media === undefined) {
          mediaFormats['undefined']++;
        } else if (Array.isArray(yacht.media)) {
          if (yacht.media.length === 0) {
            mediaFormats['empty array']++;
          } else {
            mediaFormats['non-empty array']++;
            
            // Check first item format
            if (yacht.media.length > 0) {
              const firstItem = yacht.media[0];
              if (firstItem && typeof firstItem === 'object') {
                console.log(`  Example media[0] from ${source}:`, firstItem);
              }
            }
          }
        } else if (typeof yacht.media === 'object') {
          // Check if it's an object with numeric keys (0, 1, 2...)
          const keys = Object.keys(yacht.media);
          const hasNumericKeys = keys.length > 0 && keys.some(k => !isNaN(parseInt(k)));
          
          if (hasNumericKeys) {
            mediaFormats['object with numeric keys']++;
            console.log(`  Example media object with numeric keys from ${source}:`, yacht.media);
          } else {
            mediaFormats['other object']++;
            console.log(`  Example media object from ${source}:`, yacht.media);
          }
        } else {
          mediaFormats['other']++;
        }
      }
      
      console.log('  Media format distribution:');
      for (const [format, count] of Object.entries(mediaFormats)) {
        if (count > 0) {
          console.log(`    - ${format}: ${count} records`);
        }
      }
    }
    
    // Test a sample of each collection type to see how image functions would work
    console.log('\n=== Media Access Test ===');
    
    // Simulate the function we use in the frontend
    function getYachtMainImage(yacht) {
      if (!yacht) {
        return '[PLACEHOLDER]';
      }

      // Debug version of the function
      console.log(`  Accessing media for yacht: ${yacht.title || yacht.name || 'Unknown'} (${yacht.id || 'Unknown ID'})`);
      console.log(`  Media field type: ${typeof yacht.media}`);
      
      if (yacht.media) {
        if (Array.isArray(yacht.media)) {
          console.log(`  Media is array with length: ${yacht.media.length}`);
          
          if (yacht.media.length > 0) {
            const firstImage = yacht.media[0];
            if (firstImage && typeof firstImage === 'object' && firstImage.url) {
              return `✓ SUCCESS: ${firstImage.url}`;
            }
          }
        } else if (typeof yacht.media === 'object') {
          console.log(`  Media is object with keys: ${Object.keys(yacht.media).join(', ')}`);
          
          // Try to get media.0.url
          if (yacht.media['0'] && yacht.media['0'].url) {
            return `✓ SUCCESS: ${yacht.media['0'].url}`;
          }
          
          // Try first key
          const firstKey = Object.keys(yacht.media)[0];
          if (firstKey && yacht.media[firstKey]?.url) {
            return `✓ SUCCESS from key ${firstKey}: ${yacht.media[firstKey].url}`;
          }
        }
      }
      
      // Try imageUrl directly
      if (yacht.imageUrl) {
        return `✓ SUCCESS from imageUrl: ${yacht.imageUrl}`;
      }
      
      return '[PLACEHOLDER - No image found]';
    }
    
    // Test the function with a sample from each source
    console.log('\nTesting image extraction for samples from each source:');
    for (const [source, yachts] of Object.entries(yachtsBySource)) {
      console.log(`\nSource: ${source}`);
      
      // Get one with media and one without if possible
      const withMedia = yachts.find(y => 
        (Array.isArray(y.media) && y.media.length > 0) || 
        (typeof y.media === 'object' && Object.keys(y.media).length > 0)
      );
      
      const withoutMedia = yachts.find(y => 
        !y.media || 
        (Array.isArray(y.media) && y.media.length === 0) ||
        (typeof y.media === 'object' && Object.keys(y.media).length === 0)
      );
      
      if (withMedia) {
        console.log(`\nTesting yacht with media: ${withMedia.title || withMedia.name} (${withMedia.id})`);
        const result = getYachtMainImage(withMedia);
        console.log(`Result: ${result}`);
      }
      
      if (withoutMedia) {
        console.log(`\nTesting yacht without media: ${withoutMedia.title || withoutMedia.name} (${withoutMedia.id})`);
        const result = getYachtMainImage(withoutMedia);
        console.log(`Result: ${result}`);
      }
    }
    
    console.log('\nMedia field handling test completed');
  } catch (error) {
    console.error('Error in testMediaFieldHandling:', error);
  }
}

// Run the test
testMediaFieldHandling();