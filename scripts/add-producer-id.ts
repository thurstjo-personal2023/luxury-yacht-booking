import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, updateDoc, getDocs, query, limit } from 'firebase/firestore';

// Initialize Firebase with emulator configuration
const firebaseConfig = {
  projectId: 'demo-etoile-yachts',
  appId: '1:1234567890:web:1234567890abcdef',
};

// Use emulator URLs
const app = initializeApp({
  ...firebaseConfig,
});

// Connect to Firestore emulator
const db = getFirestore(app);
const HOST = 'localhost';
const PORT = '8080';
console.log(`Connecting to Firestore emulator at ${HOST}:${PORT}`);

// The producer ID to add to our test yachts
// In a real app, this would be the authenticated user's ID
const TEST_PRODUCER_ID = "test-producer-123";

async function addProducerIdToYachts() {
  console.log('Starting to add producer ID to yachts...');
  
  try {
    // Get all yachts from the unified collection
    const yachtsRef = collection(db, 'unified_yacht_experiences');
    const q = query(yachtsRef, limit(5)); // Limit to the first 5 yachts
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) {
      console.log('No yachts found in unified_yacht_experiences');
      return;
    }
    
    console.log(`Found ${snapshot.size} yachts, adding producer ID to them`);
    
    let updateCount = 0;
    
    // Update each yacht with the producer ID
    for (const docSnap of snapshot.docs) {
      try {
        const yachtRef = doc(db, 'unified_yacht_experiences', docSnap.id);
        
        // Update both field names for maximum compatibility
        await updateDoc(yachtRef, {
          providerId: TEST_PRODUCER_ID,
          producerId: TEST_PRODUCER_ID
        });
        
        console.log(`Added producer ID to yacht ${docSnap.id}`);
        updateCount++;
      } catch (err) {
        console.error(`Error updating yacht ${docSnap.id}:`, err);
      }
    }
    
    console.log(`Successfully added producer ID to ${updateCount} yachts`);
  } catch (error) {
    console.error('Error in operation:', error);
  }
}

// Execute the function
addProducerIdToYachts()
  .then(() => {
    console.log('Completed adding producer IDs');
    process.exit(0);
  })
  .catch(err => {
    console.error('Script failed:', err);
    process.exit(1);
  });