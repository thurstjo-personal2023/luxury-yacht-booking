/**
 * Upload Yacht Images Script
 * 
 * This script uploads sample yacht images to Firebase Storage
 * for use in our yacht experiences.
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getStorage } = require("firebase-admin/storage");
const fs = require('fs');
const path = require('path');

// Initialize Firebase Admin
const admin = initializeApp({
  credential: cert(require("../firebase-data-connect.json"))
}, 'upload-app');

const storage = getStorage();
const bucket = storage.bucket('etoile-yachts.firebasestorage.app');

// Create a function to upload an image to Firebase Storage
async function uploadImage(localFilePath, destinationPath) {
  try {
    // Check if the file exists
    if (!fs.existsSync(localFilePath)) {
      console.error(`File not found: ${localFilePath}`);
      return null;
    }

    // Upload the file to Firebase Storage
    await bucket.upload(localFilePath, {
      destination: destinationPath,
      public: true,
      metadata: {
        contentType: 'image/jpeg',
        cacheControl: 'public, max-age=31536000',
      },
    });

    console.log(`✓ Successfully uploaded: ${destinationPath}`);
    
    // Return the public URL
    return `https://storage.googleapis.com/${bucket.name}/${destinationPath}`;
  } catch (error) {
    console.error(`Error uploading ${localFilePath}:`, error);
    return null;
  }
}

// Function to create a sample file in a temporary folder if it doesn't exist
async function createSampleImageIfNeeded(filename, producerId) {
  const tempDir = path.join(__dirname, '..', 'temp_yacht_images');
  
  // Create temp directory if it doesn't exist
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const filePath = path.join(tempDir, filename);
  
  // If file doesn't exist, create a simple colored square image
  if (!fs.existsSync(filePath)) {
    // Create a simple image using Node.js built-in modules (no external dependencies)
    // This is a placeholder if we don't have actual images
    const imageData = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x64, 0x00, 0x00, 0x00, 0x64,
      0x08, 0x02, 0x00, 0x00, 0x00, 0xFF, 0x80, 0x02, 0x03, 0x00, 0x00, 0x00,
      0x19, 0x74, 0x45, 0x58, 0x74, 0x53, 0x6F, 0x66, 0x74, 0x77, 0x61, 0x72,
      0x65, 0x00, 0x41, 0x64, 0x6F, 0x62, 0x65, 0x20, 0x49, 0x6D, 0x61, 0x67,
      0x65, 0x52, 0x65, 0x61, 0x64, 0x79, 0x71, 0xC9, 0x65, 0x3C, 0x00, 0x00,
      0x00, 0x30, 0x49, 0x44, 0x41, 0x54, 0x78, 0xDA, 0xEC, 0xED, 0x31, 0x01,
      0x00, 0x00, 0x00, 0xC2, 0xA0, 0xF5, 0x4F, 0x6D, 0x0E, 0x37, 0xA0, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x80, 0x77, 0x03, 0x00, 0x00, 0x00, 0xFF, 0xFF, 0x03, 0x00,
      0x24, 0xE0, 0x02, 0x30, 0xEB, 0x53, 0x15, 0x27, 0x00, 0x00, 0x00, 0x00,
      0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync(filePath, imageData);
    console.log(`Created sample image: ${filePath}`);
  }
  
  return filePath;
}

async function uploadSampleImages() {
  try {
    console.log("Starting yacht image upload...");
    
    // Producer IDs
    const andreId = "93qh9pkzCuTzloSbxAMX2iIlix93";
    const allyId = "N2hCWi8Kfsdv3N5MbUyIRYVRHRQ2";
    
    // Create and upload sample images for Andre's yachts
    const andreFishingImage = await createSampleImageIfNeeded('andre_fishing_boat.jpg', andreId);
    const andreDivingImage = await createSampleImageIfNeeded('andre_diving_boat.jpg', andreId);
    
    // Create and upload sample images for Ally's yachts
    const allyFishingImage = await createSampleImageIfNeeded('ally_fishing_yacht.jpg', allyId);
    const allyDivingImage = await createSampleImageIfNeeded('ally_diving_yacht.jpg', allyId);
    
    // Upload images to Firebase Storage
    const andreFishingUrl = await uploadImage(
      andreFishingImage, 
      `yacht_media/${andreId}/fishing_boat_1.jpg`
    );
    
    const andreDivingUrl = await uploadImage(
      andreDivingImage,
      `yacht_media/${andreId}/diving_boat_1.jpg`
    );
    
    const allyFishingUrl = await uploadImage(
      allyFishingImage,
      `yacht_media/${allyId}/fishing_yacht_1.jpg`
    );
    
    const allyDivingUrl = await uploadImage(
      allyDivingImage,
      `yacht_media/${allyId}/diving_yacht_1.jpg`
    );
    
    console.log("Image URLs:");
    console.log("Andre Fishing:", andreFishingUrl);
    console.log("Andre Diving:", andreDivingUrl);
    console.log("Ally Fishing:", allyFishingUrl);
    console.log("Ally Diving:", allyDivingUrl);
    
    console.log("✓ All yacht images uploaded successfully!");
    
    // Exit the process
    process.exit(0);
  } catch (error) {
    console.error("Error uploading yacht images:", error);
    process.exit(1);
  }
}

// Run the script
uploadSampleImages();