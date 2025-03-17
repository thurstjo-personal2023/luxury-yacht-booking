/**
 * Test Add Partner Add-ons Script
 * 
 * This script adds test partner add-ons directly through the API endpoint.
 * It does NOT require Firebase Admin SDK credentials and uses the server API instead.
 */

import axios from 'axios';

// Partner information (test accounts)
const partners = [
  {
    name: 'Lisa Webb',
    uid: 'p3wafU2xFnNZugiepyC6OOgw3fE2', // Water Sports Partner
    addons: [
      {
        name: 'Professional Water Skiing Experience',
        description: 'Expert water skiing instruction and equipment for all skill levels. Includes safety gear, professional instruction, and high-quality skis.',
        category: 'Water Sports',
        pricing: 249,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water-skiing-1.jpg'
          }
        ],
        availability: true,
        tags: ['water sports', 'adventure', 'instruction', 'equipment']
      }
    ]
  },
  {
    name: 'Gary Santil',
    uid: 'IETQG0edpxWJW1tzYylgLZHMMoB2', // Dining Partner
    addons: [
      {
        name: 'Exclusive Private Chef Experience',
        description: 'Customized multi-course meals tailored to the preferences of the yacht owner and guests. Our award-winning chefs create unforgettable dining experiences with premium ingredients.',
        category: 'Dining',
        pricing: 749,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/private-dining-1.jpg'
          }
        ],
        availability: true,
        tags: ['dining', 'luxury', 'chef', 'gourmet', 'exclusive']
      }
    ]
  }
];

/**
 * Create partner add-ons using the test API endpoint
 */
async function createPartnerAddons() {
  console.log('Creating partner add-ons through the API endpoint...');
  
  for (const partner of partners) {
    console.log(`\nProcessing partner: ${partner.name} (${partner.uid})`);
    
    for (const addon of partner.addons) {
      try {
        console.log(`Creating add-on: ${addon.name}`);
        
        // Prepare the add-on data for the API request
        const addonData = {
          partnerId: partner.uid,
          addon: addon
        };
        
        // Make the API request to create the add-on
        const response = await axios.post(
          'http://localhost:5000/api/test/create-partner-addon',
          addonData
        );
        
        if (response.data && response.data.success) {
          console.log(`✓ Successfully created add-on: ${addon.name}`);
          console.log(`  ID: ${response.data.addon?.productId || response.data.addon?.id || 'Unknown'}`);
        } else {
          console.error(`✗ Failed to create add-on: ${addon.name}`);
          console.error(`  Response:`, response.data);
        }
      } catch (error) {
        console.error(`✗ Failed to create add-on: ${addon.name}`);
        console.error(`  Error: ${error.message}`);
        
        if (error.response) {
          console.error(`  Status: ${error.response.status}`);
          console.error(`  Response:`, error.response.data);
        }
      }
    }
  }
  
  console.log('\nAdd-on creation attempt completed.');
}

// Execute the creation function
createPartnerAddons()
  .then(() => {
    console.log('Process completed successfully');
  })
  .catch((error) => {
    console.error('Error in the process:', error);
  });