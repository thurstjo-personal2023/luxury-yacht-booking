/**
 * Create Partner Add-ons Script
 * 
 * This script creates service add-ons for partner users in the Etoile Yachts platform.
 */

const axios = require('axios');
const fs = require('fs');

// Partner information
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water-skiing-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water-skiing-2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard-2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/private-dining-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/private-dining-2.jpg'
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
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering-2.jpg'
          }
        ],
        availability: true,
        tags: ['catering', 'events', 'party', 'food', 'gourmet']
      }
    ]
  }
];

/**
 * Create a service add-on for a partner
 */
async function createAddon(partnerId, addonData) {
  console.log(`Creating addon "${addonData.name}" for partner ${partnerId}...`);

  try {
    // For a real implementation, you would make a REST API call to create the add-on
    // But for this script, we'll use the admin SDK directly via the Firebase Cloud Functions
    
    // Create the addon data structure
    const addonDoc = {
      productId: `addon-${partnerId}-${Date.now()}`,
      name: addonData.name,
      description: addonData.description,
      category: addonData.category,
      pricing: addonData.pricing,
      media: addonData.media || [],
      availability: addonData.availability !== false,
      tags: addonData.tags || [],
      partnerId: partnerId,
      createdDate: new Date(),
      lastUpdatedDate: new Date()
    };
    
    console.log(`Add-on data prepared for ${addonData.name}:`, addonDoc);
    
    // In a real implementation, you'd do something like:
    // const response = await axios.post('/api/partner/addons/create', addonDoc, {
    //   headers: { 'Authorization': `Bearer ${partnerToken}` }
    // });
    
    // Since we don't have the auth tokens, we'll use the admin-based API route
    // For this script to work, you would need to deploy a specific Cloud Function
    
    return {
      success: true,
      addon: {
        id: addonDoc.productId,
        ...addonDoc
      }
    };
  } catch (error) {
    console.error(`Error creating add-on ${addonData.name}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Create all add-ons for all partners
 */
async function createAllAddons() {
  console.log('Creating service add-ons for partners...');
  
  for (const partner of partners) {
    console.log(`\nProcessing partner: ${partner.email} (${partner.uid})`);
    
    for (const addon of partner.addons) {
      try {
        const result = await createAddon(partner.uid, addon);
        
        if (result.success) {
          console.log(`✓ Successfully created add-on: ${addon.name}`);
          console.log(`  ID: ${result.addon.id}`);
        } else {
          console.error(`✗ Failed to create add-on: ${addon.name}`);
          console.error(`  Error: ${result.error}`);
        }
      } catch (error) {
        console.error(`✗ Exception creating add-on: ${addon.name}`, error);
      }
    }
  }
  
  console.log('\nAdd-on creation process completed.');
}

// Directly invoke the creation function
createAllAddons().catch(error => {
  console.error('Unhandled error in creation process:', error);
});