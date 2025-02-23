import { adminDb } from "../server/firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import type {
  YachtExperience,
  TouristProfile,
  Article,
  Event,
  Notification,
  ProductAddOn,
  Promotion,
  Review,
  SupportContent,
  ServiceProviderProfile
} from "@shared/firestore-schema";

const sampleData = {
  yacht_experiences: [
    {
      package_id: "EXP_DXB_001",
      title: "Dubai Marina Yacht Club Experience",
      description: "Experience the stunning Dubai skyline aboard our luxury yacht, cruising through the iconic Dubai Marina.",
      category: "Luxury",
      location: {
        latitude: 25.0819,
        longitude: 55.1367,
        address: "Dubai Marina, Dubai, UAE",
        region: "dubai",
        port_marina: "Dubai Marina Yacht Club"
      },
      duration: 4,
      capacity: 12,
      pricing: 2500.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "Gourmet Dining", price: 750 },
        { name: "Professional Photography", price: 500 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800" }
      ],
      availability_status: true,
      tags: ["luxury", "sunset", "marina"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    },
    {
      package_id: "EXP_DXB_002",
      title: "Dubai Creek Luxury Experience",
      description: "Discover Dubai's maritime heritage from the historic Dubai Creek.",
      category: "Cultural",
      location: {
        latitude: 25.2526,
        longitude: 55.2800,
        address: "Dubai Creek, Dubai, UAE",
        region: "dubai",
        port_marina: "Dubai Creek Marina"
      },
      duration: 5,
      capacity: 15,
      pricing: 3000.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "Heritage Guide", price: 600 },
        { name: "Traditional Dinner", price: 800 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800" }
      ],
      availability_status: true,
      tags: ["heritage", "culture", "history"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    },
    {
      package_id: "EXP_AUH_001",
      title: "Yas Marina Luxury Experience",
      description: "Enjoy the Formula 1 atmosphere with a luxury yacht experience at Yas Marina.",
      category: "Premium",
      location: {
        latitude: 24.4672,
        longitude: 54.6031,
        address: "Yas Island, Abu Dhabi, UAE",
        region: "abu-dhabi",
        port_marina: "Yas Marina"
      },
      duration: 6,
      capacity: 20,
      pricing: 4000.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "F1 Circuit View Dinner", price: 1000 },
        { name: "Water Sports Package", price: 800 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800" }
      ],
      availability_status: true,
      tags: ["luxury", "sports", "entertainment"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    },
    {
      package_id: "EXP_AUH_002",
      title: "Saadiyat Island Marina Experience",
      description: "Experience luxury yachting from the pristine Saadiyat Island Marina.",
      category: "Ultra-Luxury",
      location: {
        latitude: 24.5439,
        longitude: 54.4275,
        address: "Saadiyat Island, Abu Dhabi, UAE",
        region: "abu-dhabi",
        port_marina: "Saadiyat Island Marina"
      },
      duration: 4,
      capacity: 10,
      pricing: 5000.00,
      pricing_model: "Fixed",
      customization_options: [
        { name: "Private Beach Access", price: 1200 },
        { name: "Luxury Spa Treatment", price: 1500 }
      ],
      media: [
        { type: "image", url: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800" }
      ],
      availability_status: true,
      tags: ["ultra-luxury", "beach", "exclusive"],
      created_date: Timestamp.fromDate(new Date()),
      last_updated_date: Timestamp.fromDate(new Date()),
      published_status: true
    }
  ]
};

async function populateEmulator() {
  try {
    console.log("Starting to populate Firebase emulator with sample data...");

    // Get reference to experience packages collection
    const experiencesCollection = adminDb.collection('experience_packages');

    // Clear existing data
    const existingDocs = await experiencesCollection.get();
    const batch = adminDb.batch();
    existingDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Add new experience packages
    for (const experience of sampleData.yacht_experiences) {
      await experiencesCollection.doc(experience.package_id).set(experience);
      console.log(`Created experience package document ${experience.package_id}`);
    }

    console.log("Successfully populated Firebase emulator with sample data");
  } catch (error) {
    console.error("Error populating Firebase emulator:", error);
    process.exit(1);
  }
}

populateEmulator();