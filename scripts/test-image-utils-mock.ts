import { getYachtMainImage, getAddonMainImage } from '../client/src/lib/image-utils';

/**
 * Test the image utility functions against mock data
 */
function testImageUtils() {
  console.log('🧪 Testing image-utils.ts functions against mock data...\n');
  
  // Mock data for different scenarios
  const mockData = [
    {
      name: "Standard yacht with media array",
      data: {
        id: "yacht-001",
        title: "Luxury Yacht 1",
        media: [
          { type: "image", url: "https://example.com/yacht1.jpg" },
          { type: "image", url: "https://example.com/yacht1-2.jpg" }
        ]
      },
      expectedSource: "media array"
    },
    {
      name: "Yacht with object-style media",
      data: {
        id: "yacht-002",
        title: "Luxury Yacht 2",
        media: {
          "0": { type: "image", url: "https://example.com/yacht2.jpg" },
          "1": { type: "image", url: "https://example.com/yacht2-2.jpg" }
        }
      },
      expectedSource: "media object"
    },
    {
      name: "Yacht with empty media array",
      data: {
        id: "yacht-003",
        title: "Luxury Yacht 3",
        media: []
      },
      expectedSource: "placeholder"
    },
    {
      name: "Yacht with imageUrl field",
      data: {
        id: "yacht-004",
        title: "Luxury Yacht 4",
        imageUrl: "https://example.com/yacht4.jpg"
      },
      expectedSource: "imageUrl"
    },
    {
      name: "Yacht with mainImage field",
      data: {
        id: "yacht-005",
        title: "Luxury Yacht 5",
        mainImage: "https://example.com/yacht5.jpg"
      },
      expectedSource: "mainImage"
    },
    {
      name: "Yacht with media but no valid URLs",
      data: {
        id: "yacht-006",
        title: "Luxury Yacht 6",
        media: [
          { type: "image" } // Missing URL
        ]
      },
      expectedSource: "placeholder"
    },
    {
      name: "Add-on with media array",
      data: {
        productId: "addon-001",
        name: "Premium Service",
        media: [
          { type: "image", url: "https://example.com/service1.jpg" }
        ]
      },
      expectedSource: "media array",
      isAddon: true
    },
    {
      name: "Add-on with no media",
      data: {
        productId: "addon-002",
        name: "Basic Service"
      },
      expectedSource: "placeholder",
      isAddon: true
    },
    {
      name: "Yacht with unified format fields",
      data: {
        id: "yacht-007",
        title: "Luxury Yacht 7",
        isAvailable: true,
        media: [
          { type: "image", url: "https://example.com/yacht7.jpg" }
        ]
      },
      expectedSource: "media array"
    },
    {
      name: "Yacht with mixed field naming",
      data: {
        id: "yacht-008",
        yachtId: "yacht-008",
        package_id: "yacht-008",
        title: "Luxury Yacht 8",
        name: "Alternate Yacht 8 Name",
        isAvailable: true,
        available: true,
        availability_status: true,
        media: [
          { type: "image", url: "https://example.com/yacht8.jpg" }
        ],
        updatedAt: { seconds: 1612345678, nanoseconds: 0 }
      },
      expectedSource: "media array"
    },
    {
      name: "Yacht with uploadedMedia field",
      data: {
        id: "yacht-009",
        title: "Luxury Yacht 9",
        uploadedMedia: { url: "https://example.com/yacht9-uploaded.jpg" },
        media: [
          { type: "image", url: "https://example.com/yacht9.jpg" }
        ]
      },
      expectedSource: "uploadedMedia" // Should prioritize uploadedMedia over media array
    }
  ];
  
  // Test each mock data entry
  mockData.forEach((testCase, index) => {
    console.log(`\n🔍 Test Case ${index + 1}: ${testCase.name}`);
    console.log(`📄 Mock data: ${JSON.stringify(testCase.data, null, 2)}`);
    
    // Run the appropriate function
    let imageUrl;
    if (testCase.isAddon) {
      imageUrl = getAddonMainImage(testCase.data);
      console.log(`🖼️ getAddonMainImage result: ${imageUrl}`);
    } else {
      imageUrl = getYachtMainImage(testCase.data);
      console.log(`🖼️ getYachtMainImage result: ${imageUrl}`);
    }
    
    // Analyze the result
    if (imageUrl.includes('placeholder')) {
      console.log(testCase.expectedSource === 'placeholder' ? 
        '✅ Success: Correctly returned placeholder image' : 
        '❌ Failed: Unexpectedly returned placeholder image');
    } else if (testCase.expectedSource === 'media array' && imageUrl.includes('example.com') && testCase.data.media && Array.isArray(testCase.data.media)) {
      console.log('✅ Success: Retrieved image from media array');
    } else if (testCase.expectedSource === 'media object' && imageUrl.includes('example.com')) {
      console.log('✅ Success: Retrieved image from media object');
    } else if (testCase.expectedSource === 'imageUrl' && imageUrl.includes('example.com')) {
      console.log('✅ Success: Retrieved image from imageUrl field');
    } else if (testCase.expectedSource === 'mainImage' && imageUrl.includes('example.com')) {
      console.log('✅ Success: Retrieved image from mainImage field');
    } else if (testCase.expectedSource === 'uploadedMedia' && imageUrl.includes('uploaded')) {
      console.log('✅ Success: Retrieved image from uploadedMedia field');
    } else {
      console.log('❌ Failed: Unexpected result');
    }
  });
  
  console.log('\n🧪 Testing complete!');
}

// Run the test
testImageUtils();