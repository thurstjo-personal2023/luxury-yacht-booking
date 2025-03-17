/**
 * Create Partner Add-ons via API Script
 * 
 * This script creates service add-ons for partner users through the API.
 */

// Import necessary modules
import axios from 'axios';
import { execSync } from 'child_process';

// Configure API base URL
const API_BASE_URL = 'http://localhost:5000'; // Using local API server

// Partner information - same as before
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water_skiing_1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water_skiing_2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard_1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard_2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/dining_1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/dining_2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering_1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering_2.jpg'
          }
        ],
        availability: true,
        tags: ['catering', 'events', 'party', 'food', 'gourmet']
      }
    ]
  }
];

/**
 * Create service add-ons via the API
 */
async function createAddonsViaAPI() {
  console.log('Creating service add-ons for partners via API...');
  console.log(`API Base URL: ${API_BASE_URL}`);
  
  // For each partner
  for (const partner of partners) {
    console.log(`\nProcessing partner: ${partner.email} (${partner.uid})`);
    
    // Create each add-on
    for (const addon of partner.addons) {
      console.log(`\nCreating add-on "${addon.name}" for ${partner.email}...`);
      
      try {
        // Direct call to the server API endpoint using curl
        // This allows us to set the partner ID in the header
        const curlCommand = `curl -X POST ${API_BASE_URL}/api/partner/addons/create \\
          -H "Content-Type: application/json" \\
          -H "X-Partner-ID: ${partner.uid}" \\
          -d '${JSON.stringify({
            name: addon.name,
            description: addon.description,
            category: addon.category,
            pricing: addon.pricing,
            media: addon.media,
            availability: addon.availability,
            tags: addon.tags
          })}'`;
        
        console.log("Executing command: ", curlCommand);
        
        try {
          // Execute the curl command
          const result = execSync(curlCommand, { encoding: 'utf-8' });
          console.log(`✓ Successfully created add-on: ${addon.name}`);
          console.log(`  Response: ${result}`);
        } catch (curlError) {
          console.error(`✗ Failed to create add-on via curl: ${addon.name}`);
          console.error(`  Error: ${curlError.message}`);
          
          // Alternative approach using the server's direct Firebase access
          console.log(`  Trying alternative approach...`);
          
          try {
            const serverEndpoint = `${API_BASE_URL}/api/test/create-partner-addon`;
            const response = await axios.post(serverEndpoint, {
              partnerId: partner.uid,
              addon: {
                name: addon.name,
                description: addon.description,
                category: addon.category,
                pricing: addon.pricing,
                media: addon.media,
                availability: addon.availability,
                tags: addon.tags
              }
            });
            
            console.log(`✓ Successfully created add-on via server endpoint: ${addon.name}`);
            console.log(`  ID: ${response.data.addon?.id || 'unknown'}`);
          } catch (serverError) {
            console.error(`✗ Failed to create add-on via server: ${addon.name}`);
            console.error(`  Error: ${serverError.message}`);
          }
        }
      } catch (error) {
        console.error(`✗ Exception creating add-on: ${addon.name}`);
        console.error(`  Error: ${error.message}`);
      }
    }
  }
  
  console.log('\nAdd-on creation process completed.');
}

// Execute the API creation
createAddonsViaAPI()
  .then(() => {
    console.log('Process completed successfully');
  })
  .catch((error) => {
    console.error('Unhandled error in creation process:', error);
  });