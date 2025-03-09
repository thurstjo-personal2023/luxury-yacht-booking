import { adminDb } from "./firebase-admin";
import { Timestamp } from 'firebase-admin/firestore';

// Test data for the unified yacht collection
const testYachts = [
  {
    id: "yacht-001",
    title: "Luxury Yacht Experience in Dubai",
    description: "Enjoy a luxurious yacht cruise along Dubai's coastline with stunning views.",
    category: "Day Cruise",
    yachtType: "Luxury Motor Yacht",
    location: {
      address: "Dubai Marina Yacht Club, Dubai, UAE",
      latitude: 25.0819,
      longitude: 55.1398,
      region: "dubai",
      portMarina: "Dubai Marina"
    },
    capacity: 12,
    duration: 4,
    pricing: 2500,
    pricingModel: "Fixed",
    customizationOptions: [
      {
        id: "option-1",
        name: "Premium Catering",
        price: 500
      },
      {
        id: "option-2",
        name: "Professional Photography",
        price: 300
      }
    ],
    media: [
      {
        type: "image",
        url: "https://example.com/yacht1.jpg"
      },
      {
        type: "image",
        url: "https://example.com/yacht1-interior.jpg"
      }
    ],
    isAvailable: true,
    isFeatured: true,
    isPublished: true,
    tags: ["luxury", "cruise", "dubai", "sightseeing"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Legacy fields for backward compatibility
    package_id: "yacht-001",
    yachtId: "yacht-001",
    name: "Luxury Yacht Experience in Dubai",
    availability_status: true,
    available: true,
    yacht_type: "Luxury Motor Yacht",
    features: ["luxury", "cruise", "dubai", "sightseeing"],
    max_guests: 12,
    price: 2500
  },
  {
    id: "yacht-002",
    title: "Abu Dhabi Sunset Yacht Tour",
    description: "Experience a breathtaking sunset tour along Abu Dhabi's iconic coastline.",
    category: "Sunset Tour",
    yachtType: "Catamaran",
    location: {
      address: "Yas Marina, Abu Dhabi, UAE",
      latitude: 24.4672,
      longitude: 54.6031,
      region: "abu-dhabi",
      portMarina: "Yas Marina"
    },
    capacity: 20,
    duration: 3,
    pricing: 1800,
    pricingModel: "Fixed",
    customizationOptions: [
      {
        id: "option-3",
        name: "BBQ Package",
        price: 400
      }
    ],
    media: [
      {
        type: "image",
        url: "https://example.com/yacht2.jpg"
      }
    ],
    isAvailable: true,
    isFeatured: true,
    isPublished: true,
    tags: ["sunset", "abu-dhabi", "tour", "catamaran"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Legacy fields for backward compatibility
    package_id: "yacht-002",
    yachtId: "yacht-002",
    name: "Abu Dhabi Sunset Yacht Tour",
    availability_status: true,
    available: true,
    yacht_type: "Catamaran",
    features: ["sunset", "abu-dhabi", "tour", "catamaran"],
    max_guests: 20,
    price: 1800
  },
  {
    id: "yacht-003",
    title: "Deep Sea Fishing Adventure",
    description: "A thrilling deep sea fishing expedition in the Arabian Gulf.",
    category: "Fishing",
    yachtType: "Sport Fishing Yacht",
    location: {
      address: "Dubai Fishing Harbor, Dubai, UAE",
      latitude: 25.1246,
      longitude: 55.1753,
      region: "dubai",
      portMarina: "Fishing Harbor"
    },
    capacity: 8,
    duration: 6,
    pricing: 3000,
    pricingModel: "Fixed",
    customizationOptions: [
      {
        id: "option-4",
        name: "Fishing Equipment",
        price: 200
      },
      {
        id: "option-5",
        name: "Seafood Lunch",
        price: 350
      }
    ],
    media: [
      {
        type: "image",
        url: "https://example.com/fishing-yacht.jpg"
      }
    ],
    isAvailable: true,
    isFeatured: false,
    isPublished: true,
    tags: ["fishing", "sport", "adventure", "deep-sea"],
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    // Legacy fields for backward compatibility
    package_id: "yacht-003",
    yachtId: "yacht-003",
    name: "Deep Sea Fishing Adventure",
    availability_status: true,
    available: true,
    yacht_type: "Sport Fishing Yacht",
    features: ["fishing", "sport", "adventure", "deep-sea"],
    max_guests: 8,
    price: 3000
  }
];

// Export an async function to insert test data
export async function insertTestYachts() {
  console.log('Inserting test data into unified_yacht_experiences collection...');
  
  try {
    const batch = adminDb.batch();
    
    for (const yacht of testYachts) {
      const docRef = adminDb.collection('unified_yacht_experiences').doc(yacht.id);
      batch.set(docRef, yacht);
    }
    
    await batch.commit();
    console.log(`Successfully inserted ${testYachts.length} test yachts into the unified_yacht_experiences collection.`);
    return { success: true, count: testYachts.length };
  } catch (error) {
    console.error('Error inserting test data:', error);
    return { success: false, error };
  }
}