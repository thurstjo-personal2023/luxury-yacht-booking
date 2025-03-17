/**
 * Test Add-on Bundling with Yacht Experiences
 * 
 * This script tests bundling partner add-ons with yacht experiences
 * by updating an existing yacht with the partner add-ons.
 */

import axios from 'axios';

// Configure API base URL
const API_BASE_URL = 'http://localhost:5000';

// Producer ID to use for the test
const PRODUCER_ID = '93qh9pkzCuTzloSbxAMX2iIlix93'; // Andre Simpson

// Partner IDs with their add-ons
const PARTNER_ADDONS = {
  // Lisa Webb - Water Sports
  'p3wafU2xFnNZugiepyC6OOgw3fE2': [
    {
      name: 'Professional Water Skiing Experience',
      id: 'addon-p3wafU2xFnNZugiepyC6OOgw3fE2-1742233022189'
    }
  ],
  // Gary Santil - Dining Services
  'IETQG0edpxWJW1tzYylgLZHMMoB2': [
    {
      name: 'Exclusive Private Chef Experience',
      id: 'addon-IETQG0edpxWJW1tzYylgLZHMMoB2-1742233022419'
    }
  ]
};

/**
 * Fetch a producer's yachts
 */
async function getProducerYachts(producerId) {
  try {
    // This is a test script, we'll use our direct access endpoint
    const producerYachtsResponse = await axios.get(`${API_BASE_URL}/api/test/producer-yachts/${producerId}`);
    return producerYachtsResponse.data.yachts || [];
  } catch (error) {
    console.error('Error fetching producer yachts:', error.message);
    return [];
  }
}

/**
 * Get details for a specific yacht
 */
async function getYachtDetails(yachtId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/yachts/${yachtId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching yacht ${yachtId}:`, error.message);
    return null;
  }
}

/**
 * Get add-ons for a specific partner
 */
async function getPartnerAddons(partnerId) {
  try {
    const response = await axios.get(`${API_BASE_URL}/api/test/partner-addons/${partnerId}`);
    return response.data.addons || [];
  } catch (error) {
    console.error(`Error fetching add-ons for partner ${partnerId}:`, error.message);
    return [];
  }
}

/**
 * Update a yacht to include partner add-ons
 */
async function updateYachtWithAddons(yachtId, includedAddOns, optionalAddOns) {
  try {
    // Create the update data
    const updateData = {
      includedAddOns: includedAddOns.map(addon => ({
        addOnId: addon.id,
        partnerId: addon.partnerId,
        name: addon.name,
        description: addon.description || 'No description provided',
        pricing: addon.pricing || 0,
        isRequired: true,
        commissionRate: 15, // 15% commission to partner
        category: addon.category || 'Other',
        mediaUrl: addon.media && addon.media.length > 0 ? addon.media[0].url : null
      })),
      optionalAddOns: optionalAddOns.map(addon => ({
        addOnId: addon.id,
        partnerId: addon.partnerId,
        name: addon.name,
        description: addon.description || 'No description provided',
        pricing: addon.pricing || 0,
        isRequired: false,
        commissionRate: 10, // 10% commission to partner
        category: addon.category || 'Other',
        mediaUrl: addon.media && addon.media.length > 0 ? addon.media[0].url : null
      }))
    };
    
    // Send update request
    const response = await axios.post(`${API_BASE_URL}/api/test/update-yacht-addons/${yachtId}`, updateData);
    return response.data;
  } catch (error) {
    console.error(`Error updating yacht ${yachtId} with add-ons:`, error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    return null;
  }
}

/**
 * Test adding partner add-ons to a yacht
 */
async function testAddonBundling() {
  try {
    console.log(`Using producer ID: ${PRODUCER_ID}`);
    
    // 1. Fetch a yacht owned by our test producer
    const producerYachts = await getProducerYachts(PRODUCER_ID);
    
    if (!producerYachts.length) {
      console.error('No yachts found for producer');
      return;
    }
    
    // Get the first yacht
    const yacht = producerYachts[0];
    console.log(`Selected yacht: ${yacht.title} (${yacht.id})`);
    
    // 2. Fetch full details for the yacht
    const yachtDetails = await getYachtDetails(yacht.id);
    
    if (!yachtDetails) {
      console.error('Could not fetch yacht details');
      return;
    }
    
    console.log('Yacht details retrieved successfully');
    
    // 3. Gather all partner add-ons
    const allAddons = [];
    for (const partnerId of Object.keys(PARTNER_ADDONS)) {
      const partnerAddons = await getPartnerAddons(partnerId);
      
      console.log(`Found ${partnerAddons.length} add-ons for partner ${partnerId}`);
      
      if (partnerAddons.length) {
        allAddons.push(...partnerAddons);
      }
    }
    
    console.log(`Total add-ons available: ${allAddons.length}`);
    
    if (!allAddons.length) {
      console.error('No add-ons found');
      return;
    }
    
    // 4. Separate add-ons for demonstration purposes
    const waterSportsAddons = allAddons.filter(addon => addon.category === 'Water Sports');
    const diningAddons = allAddons.filter(addon => addon.category === 'Dining');
    
    console.log(`Water Sports add-ons: ${waterSportsAddons.length}`);
    console.log(`Dining add-ons: ${diningAddons.length}`);
    
    // 5. Setup included and optional add-ons
    // - Water sports add-ons will be required (included)
    // - Dining add-ons will be optional
    const includedAddOns = waterSportsAddons;
    const optionalAddOns = diningAddons;
    
    // 6. Update the yacht with the add-ons
    console.log('Updating yacht with partner add-ons...');
    const updateResult = await updateYachtWithAddons(yacht.id, includedAddOns, optionalAddOns);
    
    if (updateResult && updateResult.success) {
      console.log('✓ Successfully bundled partner add-ons with yacht!');
      console.log('- Included add-ons:', includedAddOns.map(a => a.name).join(', '));
      console.log('- Optional add-ons:', optionalAddOns.map(a => a.name).join(', '));
    } else {
      console.error('✗ Failed to bundle add-ons with yacht');
    }
    
  } catch (error) {
    console.error('An error occurred during testing:', error.message);
  }
}

// Create a dummy endpoint for testing add-on bundling
async function createTestEndpoint() {
  try {
    console.log('Creating test update endpoint for add-on bundling...');
    const response = await axios.post(`${API_BASE_URL}/api/test/create-bundling-endpoint`);
    return response.data;
  } catch (error) {
    console.error('Error creating test endpoint:', error.message);
    return null;
  }
}

// Run the test
createTestEndpoint()
  .then(result => {
    if (result && result.success) {
      console.log('Test endpoint created successfully, running bundling test...');
      return testAddonBundling();
    } else {
      console.log('Creating test endpoint failed, skipping bundling test.');
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
  });