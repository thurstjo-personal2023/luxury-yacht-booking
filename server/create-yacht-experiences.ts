/**
 * Create Yacht Experiences Module
 * 
 * This module provides functionality to create yacht experiences directly from the server.
 * It fixes the Abu Dhabi Grand Tour Yacht's image and creates new fishing and diving experiences.
 */

import { adminDb, adminStorage } from './firebase-admin';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Update the Abu Dhabi Grand Tour Yacht's image
 */
export async function fixGrandTourYacht(): Promise<boolean> {
  try {
    console.log("Fixing Abu Dhabi Grand Tour Yacht image...");
    
    // ID of the yacht with the broken image
    const yachtId = "yacht-IPwWfOoHOkgkJimhvPwABhyZ3Kn1-1742110450000";
    
    // Get the yacht document to verify it exists
    const yachtDoc = await adminDb.collection("unified_yacht_experiences").doc(yachtId).get();
    
    if (!yachtDoc.exists) {
      console.error(`Yacht ${yachtId} does not exist`);
      return false;
    }
    
    // Update the yacht with a proper image from Firebase Storage
    const newImageUrl = "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg";
    
    await adminDb.collection("unified_yacht_experiences").doc(yachtId).update({
      mainImage: newImageUrl,
      media: [{
        type: "image",
        url: newImageUrl
      }]
    });
    
    console.log("✓ Successfully updated Abu Dhabi Grand Tour Yacht image");
    return true;
  } catch (error) {
    console.error("Error fixing Grand Tour Yacht:", error);
    return false;
  }
}

/**
 * Create a yacht experience with specified data
 */
export async function createYachtExperience(yachtData: any): Promise<string | null> {
  try {
    const producerId = yachtData.producerId;
    
    // Generate a unique ID for the yacht based on producer ID and timestamp
    const timestamp = Date.now();
    const yachtId = `yacht-${producerId}-${timestamp}`;
    
    // Create the yacht document with current timestamp
    await adminDb.collection("unified_yacht_experiences").doc(yachtId).set({
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
    return null;
  }
}

/**
 * Create all required yacht experiences
 */
export async function createAllYachtExperiences(): Promise<boolean> {
  try {
    console.log("Starting to create all yacht experiences...");
    
    // Fix the Abu Dhabi Grand Tour Yacht image
    await fixGrandTourYacht();
    
    // Check if the producers exist in the database
    const andreDoc = await adminDb.collection("harmonized_users").doc("93qh9pkzCuTzloSbxAMX2iIlix93").get();
    const allyDoc = await adminDb.collection("harmonized_users").doc("N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2").get();
    
    if (!andreDoc.exists) {
      console.log("Andre's user document does not exist. Creating experiences anyway.");
    }
    
    if (!allyDoc.exists) {
      console.log("Ally's user document does not exist. Creating experiences anyway.");
    }
    
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
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["fishing", "dubai", "deep sea", "charter", "sport fishing", "leisure", "premium equipment", "guided"],
      producerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      providerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg"
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
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742025141083_5048ef628e1102f6_vecteezy_illustration-of-superyacht-at-night_24475363.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["diving", "dubai", "coral reef", "underwater", "scuba", "expedition", "certified divers", "marine life", "reef exploration"],
      producerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      providerId: "93qh9pkzCuTzloSbxAMX2iIlix93",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742025141083_5048ef628e1102f6_vecteezy_illustration-of-superyacht-at-night_24475363.jpg"
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
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/1741988199845_9cd5278e59167d75_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["fishing", "abu-dhabi", "sport fishing", "game fish", "charter", "premium", "guided", "tournament", "kingfish", "deep sea"],
      producerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      providerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2/1741988199845_9cd5278e59167d75_luxury-yachts-in-the-harbour-of-monaco-SBI-350754027-preview.jpg"
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
          url: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg"
        }
      ],
      isAvailable: true,
      isFeatured: true,
      isPublished: true,
      tags: ["diving", "abu-dhabi", "wreck diving", "shipwreck", "underwater", "scuba", "expedition", "certified divers", "marine life", "artificial reef", "technical diving"],
      producerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      providerId: "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2",
      mainImage: "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/yacht_media/IPwWfOoHOkgkJimhvPwABhyZ3Kn1/1742024837698_cfee399ca789efe4_people-having-fun-on-the-yacht-in-the-open-sea-by-the-luxury-beach-resort-luxu-SBI-349930433-preview.jpg"
    };
    
    // Create all the yacht experiences
    await createYachtExperience(andreFishingYacht);
    await createYachtExperience(andreDivingYacht);
    await createYachtExperience(allyFishingYacht);
    await createYachtExperience(allyDivingYacht);
    
    console.log("✓ All yacht experiences created successfully!");
    return true;
  } catch (error) {
    console.error("Error creating all yacht experiences:", error);
    return false;
  }
}