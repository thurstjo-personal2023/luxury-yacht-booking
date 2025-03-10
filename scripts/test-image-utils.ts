import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, getDoc } from 'firebase/firestore';
import { getYachtMainImage, getAddonMainImage } from '../client/src/lib/image-utils';

// Initialize Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDJAZ6UBJirQhJ9IwjqtqASF7MtJpYI3Vc",
  authDomain: "etoile-yachts.firebaseapp.com",
  projectId: "etoile-yachts",
  storageBucket: "etoile-yachts.appspot.com",
  messagingSenderId: "616029347844",
  appId: "1:616029347844:web:82126f092d5c9d80bc2441",
  measurementId: "G-JPTQ5GH4YG"
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Test the image utility functions against various collections
 */
async function testImageUtils() {
  console.log('🧪 Testing image-utils.ts functions against real data...\n');
  
  // Collections to test
  const collections = [
    'unified_yacht_experiences', 
    'yacht_experiences',
    'products_add_ons'
  ];
  
  for (const collectionName of collections) {
    console.log(`\n📂 Testing collection: ${collectionName}`);
    
    try {
      // Get all documents in the collection
      const querySnapshot = await getDocs(collection(db, collectionName));
      
      if (querySnapshot.empty) {
        console.log(`   ⚠️ No documents found in ${collectionName}`);
        continue;
      }
      
      console.log(`   ✅ Found ${querySnapshot.docs.length} documents`);
      
      // Test a subset of documents (up to 3)
      const docsToTest = querySnapshot.docs.slice(0, Math.min(3, querySnapshot.docs.length));
      
      for (const docSnapshot of docsToTest) {
        const data = docSnapshot.data();
        const id = docSnapshot.id;
        
        console.log(`\n   🔍 Testing document ID: ${id}`);
        console.log(`   📄 Document data preview: { id: "${id}", title: "${data.title || data.name || 'N/A'}" }`);
        
        // Check if media field exists
        if (data.media) {
          console.log(`   📊 Media field exists: ${Array.isArray(data.media) ? 'Array' : typeof data.media}`);
          if (Array.isArray(data.media)) {
            console.log(`   📊 Media count: ${data.media.length}`);
            if (data.media.length > 0) {
              console.log(`   📊 First media item: ${JSON.stringify(data.media[0])}`);
            }
          }
        } else {
          console.log('   ⚠️ No media field found');
        }
        
        // Test the appropriate function based on the collection
        let imageUrl;
        if (collectionName === 'products_add_ons') {
          imageUrl = getAddonMainImage(data);
          console.log(`   🖼️ getAddonMainImage result: ${imageUrl}`);
        } else {
          imageUrl = getYachtMainImage(data);
          console.log(`   🖼️ getYachtMainImage result: ${imageUrl}`);
        }
        
        // Analyze the result
        if (imageUrl.includes('placeholder')) {
          console.log('   ❌ Failed: Returned placeholder image');
        } else {
          console.log('   ✅ Success: Found valid image URL');
        }
      }
    } catch (error) {
      console.error(`   ❌ Error testing ${collectionName}:`, error);
    }
  }
  
  console.log('\n🧪 Testing specific yacht by ID...');
  
  // Test a few specific yacht IDs that we know should have images
  const specificIds = ['yacht-001', 'EXP123', 'yacht-luxury-1'];
  
  for (const id of specificIds) {
    try {
      // Try to get the document from both collections
      let docData = null;
      let collectionUsed = '';
      
      // Try unified collection first
      const unifiedDoc = await getDoc(doc(db, 'unified_yacht_experiences', id));
      if (unifiedDoc.exists()) {
        docData = unifiedDoc.data();
        collectionUsed = 'unified_yacht_experiences';
      } else {
        // Try legacy collection
        const legacyDoc = await getDoc(doc(db, 'yacht_experiences', id));
        if (legacyDoc.exists()) {
          docData = legacyDoc.data();
          collectionUsed = 'yacht_experiences';
        }
      }
      
      if (docData) {
        console.log(`\n   🔍 Testing specific yacht ID: ${id} (from ${collectionUsed})`);
        console.log(`   📄 Document data preview: { id: "${id}", title: "${docData.title || docData.name || 'N/A'}" }`);
        
        // Check if media field exists
        if (docData.media) {
          console.log(`   📊 Media field exists: ${Array.isArray(docData.media) ? 'Array' : typeof docData.media}`);
          if (Array.isArray(docData.media)) {
            console.log(`   📊 Media count: ${docData.media.length}`);
            if (docData.media.length > 0) {
              console.log(`   📊 First media item: ${JSON.stringify(docData.media[0])}`);
            }
          }
        } else {
          console.log('   ⚠️ No media field found');
        }
        
        // Test the getYachtMainImage function
        const imageUrl = getYachtMainImage(docData);
        console.log(`   🖼️ getYachtMainImage result: ${imageUrl}`);
        
        // Analyze the result
        if (imageUrl.includes('placeholder')) {
          console.log('   ❌ Failed: Returned placeholder image');
        } else {
          console.log('   ✅ Success: Found valid image URL');
        }
      } else {
        console.log(`\n   ⚠️ Yacht with ID ${id} not found in any collection`);
      }
    } catch (error) {
      console.error(`   ❌ Error testing yacht ID ${id}:`, error);
    }
  }
  
  console.log('\n🧪 Testing complete!');
}

// Run the test
testImageUtils().catch(error => {
  console.error('Error running tests:', error);
});