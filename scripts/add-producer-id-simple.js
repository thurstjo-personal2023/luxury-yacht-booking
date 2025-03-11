/**
 * Simplified Script to Add Producer ID to All Yachts
 * 
 * This script uses the helper function in storage.ts to add a producer ID
 * to all yachts in the unified collection.
 */

// We need to use require for CommonJS compatibility
const { addProducerIdToTestYachts } = require('../server/storage.js');

// The producer ID to associate with all yachts
const PRODUCER_ID = 'V4aiP9ihPbdnWNO6UbiZKEt1GoCZ';

async function main() {
  console.log(`Adding producer ID ${PRODUCER_ID} to all yachts...`);
  
  try {
    const result = await addProducerIdToTestYachts(PRODUCER_ID);
    
    if (result) {
      console.log('Successfully added producer ID to yachts');
    } else {
      console.log('Failed to add producer ID to yachts');
    }
  } catch (error) {
    console.error('Error adding producer ID:', error);
  }
}

main()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
  });