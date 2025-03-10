/**
 * This script tests the image utility functions against the unified_yacht_experiences.json data
 * to ensure they handle all data formats correctly.
 */

import * as fs from 'fs';
import * as path from 'path';

// Import the image utility functions
import { 
  getYachtMainImage, 
  getAddonMainImage,
  handleYachtImageError,
  handleAddonImageError,
  getYachtImageProps,
  getAddonImageProps 
} from '../client/src/lib/image-utils';

/**
 * Test the image utility functions against the unified yacht experiences data
 */
async function testImageUtils() {
  try {
    console.log('Starting image utility test with unified_yacht_experiences.json data');
    
    // Load the unified yacht experiences data
    const filePath = path.join(process.cwd(), 'unified_yacht_experiences.json');
    if (!fs.existsSync(filePath)) {
      console.error(`File not found: ${filePath}`);
      return;
    }
    
    const rawData = fs.readFileSync(filePath, 'utf8');
    const yachtData = JSON.parse(rawData);
    
    console.log(`Loaded ${yachtData.length} yacht records from unified_yacht_experiences.json`);
    
    // Group yachts by source collection for analysis
    const yachtsBySource: Record<string, any[]> = {};
    for (const yacht of yachtData) {
      const source = yacht._source || 'unknown';
      if (!yachtsBySource[source]) {
        yachtsBySource[source] = [];
      }
      yachtsBySource[source].push(yacht);
    }
    
    console.log('Yacht sources distribution:');
    for (const [source, yachts] of Object.entries(yachtsBySource)) {
      console.log(`- ${source}: ${yachts.length} records`);
    }
    
    // Analyze media field formats in each source
    console.log('\nAnalyzing media field formats in each source:');
    for (const [source, yachts] of Object.entries(yachtsBySource)) {
      console.log(`\nSource: ${source}`);
      const mediaFormats: Record<string, number> = {
        'undefined': 0,
        'empty array': 0,
        'non-empty array': 0,
        'object': 0,
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
          }
        } else if (typeof yacht.media === 'object') {
          mediaFormats['object']++;
        } else {
          mediaFormats['other']++;
        }
      }
      
      for (const [format, count] of Object.entries(mediaFormats)) {
        console.log(`  - ${format}: ${count} records`);
      }
    }
    
    // Test getYachtMainImage function on each yacht
    console.log('\nTesting getYachtMainImage function on each yacht:');
    let successCount = 0;
    let fallbackCount = 0;
    
    for (const yacht of yachtData) {
      const yachtId = yacht.id || yacht.package_id || yacht.yachtId || 'unknown';
      const yachtName = yacht.title || yacht.name || 'Unnamed Yacht';
      const source = yacht._source || 'unknown';
      
      try {
        const imageUrl = getYachtMainImage(yacht);
        if (imageUrl && !imageUrl.includes('yacht-placeholder')) {
          successCount++;
          console.log(`✅ ${yachtId} (${yachtName}) from ${source}: ${imageUrl}`);
        } else {
          fallbackCount++;
          console.log(`⚠️ ${yachtId} (${yachtName}) from ${source}: Using fallback image`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${yachtId} (${yachtName}) from ${source}:`, error);
      }
    }
    
    console.log(`\nSummary:
- Total yachts: ${yachtData.length}
- Successful image retrieval: ${successCount}
- Fallback images used: ${fallbackCount}
- Success rate: ${(successCount / yachtData.length * 100).toFixed(2)}%`);
    
    // Sample a few yachts with media and test getYachtImageProps
    console.log('\nTesting getYachtImageProps on sample yachts with media:');
    const yachtsWithMedia = yachtData.filter(yacht => 
      yacht.media && Array.isArray(yacht.media) && yacht.media.length > 0
    );
    
    if (yachtsWithMedia.length > 0) {
      for (let i = 0; i < Math.min(5, yachtsWithMedia.length); i++) {
        const yacht = yachtsWithMedia[i];
        const yachtId = yacht.id || yacht.package_id || yacht.yachtId || 'unknown';
        const props = getYachtImageProps(yacht);
        console.log(`Yacht ${yachtId}: Image props:`, props);
      }
    } else {
      console.log('No yachts with media found for testing getYachtImageProps');
    }
    
    console.log('\nImage utility tests completed');
  } catch (error) {
    console.error('Error running image utility tests:', error);
  }
}

// Run the test
testImageUtils();