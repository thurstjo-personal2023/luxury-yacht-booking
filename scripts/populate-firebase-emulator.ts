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
      yachtId: "YAC123",
      name: "Majestic Pearl",
      description: "A 30-meter luxury yacht with state-of-the-art amenities, perfect for sunset cruises and private events.",
      capacity: 12,
      price: 2500,
      imageUrl: "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800",
      location: {
        latitude: 25.7617,
        longitude: -80.1918,
        address: "Miami Marina, FL"
      },
      features: ["Jacuzzi", "Sundeck", "Premium Bar", "WiFi"],
      available: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    },
    {
      yachtId: "YAC124",
      name: "Ocean Empress",
      description: "Luxury 35-meter yacht featuring spacious entertainment areas and professional crew service.",
      capacity: 15,
      price: 3200,
      imageUrl: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800",
      location: {
        latitude: 25.7617,
        longitude: -80.1918,
        address: "Miami Marina, FL"
      },
      features: ["Master Suite", "Beach Club", "Water Sports Equipment", "Gourmet Kitchen"],
      available: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    },
    {
      yachtId: "YAC125",
      name: "Royal Navigator",
      description: "A 40-meter superyacht offering the ultimate luxury experience with helicopter landing pad.",
      capacity: 20,
      price: 4500,
      imageUrl: "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800",
      location: {
        latitude: 25.7617,
        longitude: -80.1918,
        address: "Miami Marina, FL"
      },
      features: ["Helipad", "Cinema Room", "Gym", "Multiple Decks"],
      available: true,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date())
    }
  ]
};

async function populateEmulator() {
  try {
    console.log("Starting to populate Firebase emulator with sample data...");

    // Get reference to yacht experiences collection
    const yachtCollection = adminDb.collection('yacht_experiences');

    // Clear existing data
    const existingDocs = await yachtCollection.get();
    const batch = adminDb.batch();
    existingDocs.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();

    // Add new yacht experiences
    for (const yacht of sampleData.yacht_experiences) {
      await yachtCollection.doc(yacht.yachtId).set(yacht);
      console.log(`Created yacht document ${yacht.yachtId}`);
    }

    console.log("Successfully populated Firebase emulator with sample data");
  } catch (error) {
    console.error("Error populating Firebase emulator:", error);
    process.exit(1);
  }
}

populateEmulator();