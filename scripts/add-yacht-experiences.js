/**
 * Add Yacht Experiences Script
 * 
 * This script:
 * 1. Updates the Abu Dhabi Grand Tour Yacht with a proper image
 * 2. Creates fishing experiences for Andre (producerId: 93qh9pkzCuTzloSbxAMX2iIlix93)
 * 3. Creates diving experiences for Andre (producerId: 93qh9pkzCuTzloSbxAMX2iIlix93)
 * 4. Creates fishing experiences for Ally (producerId: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2)
 * 5. Creates diving experiences for Ally (producerId: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the Firebase config file
const firebaseConfigPath = path.resolve(__dirname, '../firebase-data-connect.json');
const firebaseConfig = JSON.parse(readFileSync(firebaseConfigPath, 'utf8'));

// Initialize Firebase Admin
const admin = initializeApp({
  credential: cert(firebaseConfig)
});

const db = getFirestore();

/**
 * Fix the Abu Dhabi Grand Tour Yacht image
 */
async function fixGrandTourYacht() {
  try {
    console.log("Fixing Abu Dhabi Grand Tour Yacht image...");
    
    // ID of the yacht with the broken image
    const yachtId = "yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742110450000";
    
    // Update the yacht with a proper image from Firebase Storage
    await db.collection("unified_yacht_experiences").doc(yachtId).update({
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg",
      media: [{
        type: "image",
        url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg"
      }]
    });
    
    console.log("✓ Successfully updated Abu Dhabi Grand Tour Yacht image");
  } catch (error) {
    console.error("Error fixing Grand Tour Yacht:", error);
  }
}

/**
 * Create a yacht experience for a given producer
 */
async function createYachtExperience(yachtData) {
  try {
    const producerId = yachtData.producerId;
    
    // Generate a unique ID for the yacht based on producer ID and timestamp
    const timestamp = Date.now();
    const yachtId = `yacht-${producerId}-${timestamp}`;
    
    // Create the yacht document with current timestamp
    await db.collection("unified_yacht_experiences").doc(yachtId).set({
      ...yachtData,
      id: yachtId,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      created_date: Timestamp.now(), // Legacy field
      last_updated_date: Timestamp.now(), // Legacy field
    });
    
    console.log(`✓ Successfully created yacht: ${yachtData.title} (${yachtId})`);
    return yachtId;
  } catch (error) {
    console.error(`Error creating yacht experience:`, error);
    throw error;
  }
}

async function main() {
  try {
    console.log("Starting yacht experiences update script...");
    
    // Fix the Abu Dhabi Grand Tour Yacht image
    await fixGrandTourYacht();
    
    // Andre: Fishing Experience (producer: 93qh9pkzCuTzloSbxAMX2iIlix93)
    const andreFishingYacht = {
      title: "Dubai Deep Sea Fishing Adventure",
      description: "Experience the thrill of deep sea fishing in the rich waters of Dubai. Our professional crew will guide you to the best fishing spots. All equipment provided and suitable for all experience levels.",
      category: "Fishing Charter",
      yachtType: "Fishing Boat",
      location: {
        address: "Dubai Marina, Dubai, UAE",
        latitude: 25.0757,
        longitude: 55.1394,
        region: "dubai",
        port_marina: "Dubai Marina"
      },
      capacity: 8,
      duration: 6,
      pricing: 1800,
      pricingModel: "Fixed",
      customizationOptions: [
        {
          id: "fishing-equipment-premium",
          name: "Premium Fishing Equipment",
          price: 250
        },
        {
          id: "fishing-guide",
          name: "Personal Fishing Guide",
          price: 350
        },
        {
          id: "refreshments",
          name: "Gourmet Refreshments Package",
          price: 150
        }
      ],
      media: [
        {
          type: "image",
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/93qh9pkzCuTzloSbxAMX2iIlix93/fishing_boat_1.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["fishing", "dubai", "deep sea", "charter", "sport fishing", "leisure", "premium equipment", "guided"],
      producerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      providerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/93qh9pkzCuTzloSbxAMX2iIlix93/fishing_boat_1.jpg"
    };
    
    // Andre: Diving Experience
    const andreDivingYacht = {
      title: "Dubai Coral Reef Diving Expedition",
      description: "Discover Dubai's vibrant coral reefs with this premium diving expedition. Perfect for certified divers seeking to explore underwater ecosystems. Includes professional guidance, all equipment, and underwater photography.",
      category: "Diving Expedition",
      yachtType: "Diving Boat",
      location: {
        address: "Dubai Harbour, Dubai, UAE",
        latitude: 25.0988,
        longitude: 55.1491,
        region: "dubai",
        port_marina: "Dubai Harbour"
      },
      capacity: 10,
      duration: 5,
      pricing: 2200,
      pricingModel: "Fixed",
      customizationOptions: [
        {
          id: "diving-equipment-premium",
          name: "Premium Diving Equipment",
          price: 300
        },
        {
          id: "underwater-photography",
          name: "Underwater Photography Package",
          price: 250
        },
        {
          id: "dive-instructor",
          name: "Private Dive Instructor",
          price: 400
        }
      ],
      media: [
        {
          type: "image",
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/93qh9pkzCuTzloSbxAMX2iIlix93/diving_boat_1.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["diving", "dubai", "coral reef", "underwater", "scuba", "expedition", "certified divers", "marine life", "reef exploration"],
      producerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      providerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/93qh9pkzCuTzloSbxAMX2iIlix93/diving_boat_1.jpg"
    };
    
    // Ally: Fishing Experience (producer: N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2)
    const allyFishingYacht = {
      title: "Abu Dhabi Sport Fishing Adventure",
      description: "Join us for an exciting sport fishing adventure in the pristine waters of Abu Dhabi. Target game fish species like kingfish, queenfish, and tuna with high-quality equipment and expert fishing guides.",
      category: "Fishing Charter",
      yachtType: "Sport Fishing Boat",
      location: {
        address: "Yas Marina, Abu Dhabi, UAE",
        latitude: 24.4539,
        longitude: 54.3773,
        region: "abu-dhabi",
        port_marina: "Yas Marina"
      },
      capacity: 6,
      duration: 7,
      pricing: 2300,
      pricingModel: "Fixed",
      customizationOptions: [
        {
          id: "tournament-equipment",
          name: "Tournament-Grade Fishing Equipment",
          price: 400
        },
        {
          id: "fish-processing",
          name: "Catch Cleaning & Processing",
          price: 200
        },
        {
          id: "refreshments-premium",
          name: "Premium Food & Beverage Package",
          price: 250
        }
      ],
      media: [
        {
          type: "image",
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/fishing_yacht_1.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["fishing", "abu-dhabi", "sport fishing", "game fish", "charter", "premium", "guided", "tournament", "kingfish", "deep sea"],
      producerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      providerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/fishing_yacht_1.jpg"
    };
    
    // Ally: Diving Experience
    const allyDivingYacht = {
      title: "Abu Dhabi Wreck Diving Expedition",
      description: "Explore fascinating shipwrecks and artificial reefs in Abu Dhabi's waters. This specialized diving expedition is perfect for certified divers looking to discover underwater history and marine ecosystems that have developed around these structures.",
      category: "Diving Expedition",
      yachtType: "Dive Boat",
      location: {
        address: "Zayed Port, Abu Dhabi, UAE",
        latitude: 24.513,
        longitude: 54.377,
        region: "abu-dhabi",
        port_marina: "Zayed Port"
      },
      capacity: 8,
      duration: 6,
      pricing: 2500,
      pricingModel: "Fixed",
      customizationOptions: [
        {
          id: "technical-dive-gear",
          name: "Technical Diving Equipment",
          price: 350
        },
        {
          id: "wreck-specialist",
          name: "Wreck Diving Specialist Guide",
          price: 450
        },
        {
          id: "underwater-video",
          name: "Professional Underwater Videography",
          price: 300
        }
      ],
      media: [
        {
          type: "image",
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/diving_yacht_1.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["diving", "abu-dhabi", "wreck diving", "shipwreck", "underwater", "scuba", "expedition", "certified divers", "marine life", "artificial reef", "technical diving"],
      producerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      providerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/diving_yacht_1.jpg"
    };
    
    // Create all the yacht experiences
    await createYachtExperience(andreFishingYacht);
    await createYachtExperience(andreDivingYacht);
    await createYachtExperience(allyFishingYacht);
    await createYachtExperience(allyDivingYacht);
    
    console.log("✓ All yacht experiences created successfully!");
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error("Error in main function:", error);
    process.exit(1);
  }
}

// Run the script
main();