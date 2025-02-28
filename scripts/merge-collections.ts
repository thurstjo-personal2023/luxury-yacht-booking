import { getFirestore, collection, getDocs, doc, setDoc, Timestamp } from "firebase/firestore";
import { initializeApp } from "firebase/app";

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCN6e2HYWk-DYe2eex_TfjPTlDO-AxCCpg",
  authDomain: "etoile-yachts.firebaseapp.com",
  projectId: "etoile-yachts",
  storageBucket: "etoile-yachts.appspot.com",
  messagingSenderId: "273879155256",
  appId: "1:273879155256:web:ae2d26d3c7b7ebcf1bbbbc",
  measurementId: "G-08LYS0NB12"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Define a function to merge collections
async function mergeCollections(sourceCollections: string[], targetCollection: string, transformFn?: (doc: any) => any) {
  console.log(`Starting to merge ${sourceCollections.join(", ")} into ${targetCollection}`);
  
  // Count of processed documents
  let processedCount = 0;
  
  try {
    // Process each source collection
    for (const sourceCollection of sourceCollections) {
      console.log(`Processing collection: ${sourceCollection}`);
      
      try {
        // Get all documents from the source collection
        const snapshot = await getDocs(collection(db, sourceCollection));
        
        // If no documents found, continue to the next collection
        if (snapshot.empty) {
          console.log(`No documents found in ${sourceCollection}`);
          continue;
        }
        
        // Process each document
        for (const document of snapshot.docs) {
          const data = document.data();
          
          // Apply transformation if provided
          const transformedData = transformFn ? transformFn(data) : data;
          
          // Set the document in the target collection with the same ID
          await setDoc(doc(db, targetCollection, document.id), transformedData);
          processedCount++;
        }
        
        console.log(`Processed ${snapshot.docs.length} documents from ${sourceCollection}`);
      } catch (error) {
        console.error(`Error processing collection ${sourceCollection}:`, error);
      }
    }
    
    console.log(`Successfully merged ${processedCount} documents into ${targetCollection}`);
    return processedCount;
  } catch (error) {
    console.error(`Error merging collections:`, error);
    throw error;
  }
}

// Define transformations for each collection type
const addUserTypeTransform = (userDoc: any) => {
  // Determine the user type based on collection or existing fields
  let userType = userDoc.role || "tourist"; // Default to tourist if role not specified
  
  // Add user_type field while preserving all original data
  return {
    ...userDoc,
    user_type: userType,
    lastUpdatedDate: userDoc.lastUpdatedDate || Timestamp.now()
  };
};

const standardizeYachtExperienceTransform = (experienceDoc: any) => {
  // Ensure all necessary fields exist
  return {
    ...experienceDoc,
    package_id: experienceDoc.package_id || experienceDoc.id || "",
    pricing_model: experienceDoc.pricing_model || "Fixed",
    last_updated_date: experienceDoc.last_updated_date || Timestamp.now()
  };
};

const standardizeProductAddOnTransform = (productDoc: any) => {
  // Standardize product add-on fields
  return {
    ...productDoc,
    productId: productDoc.productId || productDoc.product_id || "",
    createdDate: productDoc.createdDate || Timestamp.now(),
    lastUpdatedDate: productDoc.lastUpdatedDate || Timestamp.now()
  };
};

// Main merge function
async function performCollectionMerge() {
  try {
    console.log("Starting collection merge process...");
    
    // 1. Merge Product Add Ons
    await mergeCollections(
      ["products_add_ons", "products_add-ons"], 
      "product_add_ons",
      standardizeProductAddOnTransform
    );
    
    // 2. Merge Users
    await mergeCollections(
      ["users", "user_profiles_tourist", "user_profiles_service_provider"], 
      "users",
      addUserTypeTransform
    );
    
    // 3. Merge Yacht Experiences
    await mergeCollections(
      ["yacht_experiences", "experience_packages"], 
      "yacht_experiences",
      standardizeYachtExperienceTransform
    );
    
    console.log("Collection merge completed successfully!");
    
  } catch (error) {
    console.error("Error during collection merge:", error);
  }
}

// Run the merge process
performCollectionMerge();