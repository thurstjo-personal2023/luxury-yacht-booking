/**
 * Create Service Add-ons Script
 * 
 * This script creates service add-ons for partner users.
 */

// Import axios for API calls
import axios from 'axios';

// Configure API base URL
const API_BASE_URL = 'http://localhost:5000'; // Using local API server

// Partner information with updated image URLs
const partners = [
  {
    email: 'lisa.webb@hotmail.com',
    uid: 'p3wafU2xFnNZugiepyC6OOgw3fE2',
    addons: [
      {
        name: 'Professional Water Skiing Experience',
        description: 'Expert water skiing instruction and equipment for all skill levels. Includes safety gear, professional instruction, and high-quality skis.',
        category: 'Water Sports',
        pricing: 249,
        media: [
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/bc0eb0c4-ea7f-4f11-93ba-74d3fa5f4e77'
          },
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/32e5a9ae-0a85-4fec-8ad8-3377c5221d8c'
          }
        ],
        availability: true,
        tags: ['water sports', 'adventure', 'instruction', 'equipment']
      },
      {
        name: 'Luxury Flyboard Experience',
        description: 'Experience the thrill of hydro-flight with our premium flyboard equipment and certified instructor. Perfect for beginners and experienced flyers alike.',
        category: 'Water Sports',
        pricing: 299,
        media: [
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/87c3b118-2950-484b-8353-4ca21a3d3fb3'
          },
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/db1adaea-cb41-4dc4-9d06-ef2d52cff848'
          }
        ],
        availability: true,
        tags: ['water sports', 'adventure', 'hydro-flight', 'extreme']
      }
    ]
  },
  {
    email: 'garysantil@hotmail.com',
    uid: 'IETQG0edpxWJW1tzYylgLZHMMoB2',
    addons: [
      {
        name: 'Exclusive Private Chef Experience',
        description: 'Customized multi-course meals tailored to the preferences of the yacht owner and guests. Our award-winning chefs create unforgettable dining experiences with premium ingredients.',
        category: 'Dining',
        pricing: 749,
        media: [
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/5a3ef0c7-e32f-4f41-9cdb-6a3df67e7530'
          },
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/f4ba3b2c-4ae0-4ba4-b7a7-2e04af168683'
          }
        ],
        availability: true,
        tags: ['dining', 'luxury', 'chef', 'gourmet', 'exclusive']
      },
      {
        name: 'Premium Yacht Catering Service',
        description: 'High-quality catering for special events, parties, or gatherings on the yacht. Our culinary team provides elegant presentation and exceptional flavors for any occasion.',
        category: 'Dining',
        pricing: 499,
        media: [
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/92be2c66-f27a-4300-b9e8-8d0cf2db78aa'
          },
          {
            type: 'image',
            url: 'https://github.com/user-attachments/assets/f67df21e-8848-46b3-8fb7-7c0334012c23'
          }
        ],
        availability: true,
        tags: ['catering', 'events', 'party', 'food', 'gourmet']
      }
    ]
  }
];

/**
 * Create all service add-ons via API
 */
async function createServiceAddons() {
  console.log('Creating service add-ons for partners...');
  
  const results = [];
  
  for (const partner of partners) {
    console.log(`\nProcessing partner: ${partner.email} (${partner.uid})`);
    
    for (const addon of partner.addons) {
      console.log(`Creating add-on "${addon.name}"...`);
      
      try {
        const response = await axios.post(`${API_BASE_URL}/api/test/create-partner-addon`, {
          partnerId: partner.uid,
          addon: addon
        });
        
        console.log(`✓ Successfully created add-on: ${addon.name}`);
        console.log(`  ID: ${response.data.addon?.id || 'unknown'}`);
        
        results.push({
          partner: partner.email,
          addon: addon.name,
          success: true,
          id: response.data.addon?.id
        });
      } catch (error) {
        console.error(`✗ Failed to create add-on: ${addon.name}`);
        console.error(`  Error: ${error.message}`);
        
        results.push({
          partner: partner.email,
          addon: addon.name,
          success: false,
          error: error.message
        });
      }
    }
  }
  
  console.log('\n=== Add-on Creation Summary ===');
  for (const result of results) {
    if (result.success) {
      console.log(`✓ Partner: ${result.partner} - Add-on: ${result.addon} - ID: ${result.id}`);
    } else {
      console.log(`✗ Partner: ${result.partner} - Add-on: ${result.addon} - Error: ${result.error}`);
    }
  }
  
  console.log('\nAdd-on creation process completed.');
}

// Execute the creation
createServiceAddons()
  .then(() => {
    console.log('Process completed successfully');
  })
  .catch((error) => {
    console.error('Unhandled error in creation process:', error);
  });