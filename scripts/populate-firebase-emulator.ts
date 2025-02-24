import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";

const sampleData = {
  yacht_profiles: [
    {
      yacht_id: "YAC_YAS_001",
      name: "Pearl of Yas",
      description: "A stunning 35-meter luxury yacht perfectly suited for the F1 atmosphere of Yas Marina",
      capacity: 12,
      length: 35.0,
      features: ["Sundeck", "Premium Bar", "Entertainment System", "WiFi", "Climate Control"],
      certifications: ["Maritime Safety Certified", "UAE Coast Guard Approved"],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1621277224630-4c70c1a24c15?w=800" }
      ],
      pricing: 3500.00,
      owner_id: "OWN_YAS_001",
      tags: ["luxury", "f1", "entertainment"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date())
    },
    {
      yacht_id: "YAC_YAS_002",
      name: "Yas Elegance",
      description: "An exquisite 40-meter yacht featuring gourmet dining facilities and panoramic views",
      capacity: 15,
      length: 40.0,
      features: ["Gourmet Kitchen", "Dining Salon", "Master Suite", "Wine Cellar", "Observation Deck"],
      certifications: ["5-Star Luxury Rating", "UAE Maritime Authority Certified"],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800" }
      ],
      pricing: 4200.00,
      owner_id: "OWN_YAS_002",
      tags: ["luxury", "dining", "gourmet"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date())
    },
    {
      yacht_id: "YAC_YAS_003",
      name: "Yas Adventurer",
      description: "A versatile 45-meter yacht equipped for water sports and adventure activities",
      capacity: 20,
      length: 45.0,
      features: ["Water Sports Equipment", "Diving Gear", "Speed Boats", "Sun Deck", "Beach Club"],
      certifications: ["Water Sports Safety Certified", "Adventure Tourism Licensed"],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800" }
      ],
      pricing: 5500.00,
      owner_id: "OWN_YAS_003",
      tags: ["adventure", "water sports", "active"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date())
    }
  ],
  experience_packages: [
    {
      package_id: "EXP_YAS_001",
      title: "Yas Marina F1 Sunset Experience",
      description: "Experience the thrill of Formula 1 atmosphere with a luxury sunset cruise along Yas Marina Circuit. Perfect for motorsport enthusiasts and luxury seekers alike.",
      category: "Premium",
      location: {
        latitude: 24.4672,
        longitude: 54.6031,
        address: "Yas Marina, Abu Dhabi, UAE",
        port_marina: "Yas Marina"
      },
      duration: 4,
      capacity: 12,
      pricing: 3500.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "F1-themed Gourmet Dining", price: 850 },
        { name: "Professional Photography", price: 500 },
        { name: "Circuit Tour Guide", price: 300 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1621277224630-4c70c1a24c15?w=800" },
        { type: "video", url: "https://example.com/videos/yas-f1-experience.mp4" }
      ],
      availability_status: true,
      reviews: [
        { review_id: "REV_YAS_001", rating: 5, review_text: "Amazing F1 atmosphere and luxury service!" }
      ],
      tags: ["f1", "luxury", "sunset", "yacht"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    },
    {
      package_id: "EXP_YAS_002",
      title: "Yas Marina Luxury Dinner Cruise",
      description: "Indulge in an exquisite dining experience aboard our luxury yacht at Yas Marina. Featuring a 5-star chef and breathtaking views of the Abu Dhabi skyline.",
      category: "Ultra-Luxury",
      location: {
        latitude: 24.4672,
        longitude: 54.6031,
        address: "Yas Marina, Abu Dhabi, UAE",
        port_marina: "Yas Marina"
      },
      duration: 3,
      capacity: 15,
      pricing: 4200.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "Private Chef Experience", price: 1200 },
        { name: "Wine Pairing", price: 600 },
        { name: "Live Music", price: 800 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800" },
        { type: "video", url: "https://example.com/videos/yas-dinner-cruise.mp4" }
      ],
      availability_status: true,
      reviews: [
        { review_id: "REV_YAS_002", rating: 5, review_text: "The dining experience was absolutely spectacular!" }
      ],
      tags: ["dining", "luxury", "gourmet", "exclusive"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    },
    {
      package_id: "EXP_YAS_003",
      title: "Yas Marina Adventure Package",
      description: "Combine luxury yachting with thrilling water sports at Yas Marina. Perfect for adventure seekers looking for an adrenaline-packed day on the water.",
      category: "Adventure",
      location: {
        latitude: 24.4672,
        longitude: 54.6031,
        address: "Yas Marina, Abu Dhabi, UAE",
        port_marina: "Yas Marina"
      },
      duration: 6,
      capacity: 20,
      pricing: 5500.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "Jet Ski Package", price: 800 },
        { name: "Parasailing Experience", price: 400 },
        { name: "Diving Experience", price: 600 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800" },
        { type: "video", url: "https://example.com/videos/yas-adventure.mp4" }
      ],
      availability_status: true,
      reviews: [
        { review_id: "REV_YAS_003", rating: 5, review_text: "Perfect mix of luxury and adventure!" }
      ],
      tags: ["adventure", "watersports", "luxury", "active"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    }
  ]
};

async function populateEmulator() {
  try {
    console.log("Starting to populate Firebase Data Connect emulator with sample data...");

    // Populate yacht profiles
    const yachtProfilesCollection = adminDb.collection('yacht_profiles');
    for (const yacht of sampleData.yacht_profiles) {
      await yachtProfilesCollection.doc(yacht.yacht_id).set(yacht);
      console.log(`Created yacht profile document ${yacht.yacht_id}`);
    }

    // Populate experience packages
    const experiencePackagesCollection = adminDb.collection('experience_packages');
    for (const exp of sampleData.experience_packages) {
      await experiencePackagesCollection.doc(exp.package_id).set(exp);
      console.log(`Created experience package document ${exp.package_id}`);
    }

    console.log("Successfully populated Firebase Data Connect emulator with sample data");
  } catch (error) {
    console.error("Error populating Firebase Data Connect emulator:", error);
    process.exit(1);
  }
}

populateEmulator();