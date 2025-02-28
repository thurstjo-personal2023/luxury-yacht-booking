import * as fs from 'fs';

// Path to firestore-init.ts file
const FIRESTORE_INIT_PATH = './client/src/lib/firestore-init.ts';

// Collection mapping
const COLLECTION_MAPPING = {
  'products_add_ons': 'product_add_ons',
  'products_add-ons': 'product_add_ons',
  'experience_packages': 'yacht_experiences'
};

// Function to update the collectionRefs object in firestore-init.ts
function updateFirestoreInit() {
  try {
    console.log(`Updating collection references in ${FIRESTORE_INIT_PATH}...`);
    
    // Read the file content
    let content = fs.readFileSync(FIRESTORE_INIT_PATH, 'utf8');
    
    // Check if the file contains the collectionRefs export
    if (content.includes('export const collectionRefs = {')) {
      console.log('Found collectionRefs object, updating...');
      
      // Find the start and end of the collectionRefs object
      const startIndex = content.indexOf('export const collectionRefs = {');
      const endIndex = content.indexOf('};', startIndex) + 2;
      
      // Extract the collectionRefs object text
      const collectionRefsText = content.substring(startIndex, endIndex);
      let updatedRefsText = collectionRefsText;
      
      // Add new collection references
      for (const [oldName, newName] of Object.entries(COLLECTION_MAPPING)) {
        // Check if the old collection is referenced
        if (collectionRefsText.includes(`${oldName}:`)) {
          console.log(`Adding new collection reference for ${newName}`);
          
          // Add the new collection reference if it doesn't exist
          if (!collectionRefsText.includes(`${newName}:`)) {
            // Find the location to insert the new reference
            const insertIndex = updatedRefsText.lastIndexOf('};');
            
            // Insert the new reference
            updatedRefsText = 
              updatedRefsText.substring(0, insertIndex) +
              `  ${newName}: collection(db, "${newName}"),\n  ` +
              updatedRefsText.substring(insertIndex);
          }
        }
      }
      
      // Replace the old collectionRefs with the updated one
      const updatedContent = content.replace(collectionRefsText, updatedRefsText);
      
      // Write the updated content back to the file
      fs.writeFileSync(FIRESTORE_INIT_PATH, updatedContent, 'utf8');
      console.log('Successfully updated collection references in firestore-init.ts');
    } else {
      console.log('Could not find collectionRefs object in firestore-init.ts');
    }
  } catch (error) {
    console.error('Error updating firestore-init.ts:', error);
  }
}

// Add a fallback function to initializeFirestore to try the new collections first
function addFallbackToInitializeFirestore() {
  try {
    console.log('Adding fallback logic to initializeFirestore function...');
    
    // Read the file content
    let content = fs.readFileSync(FIRESTORE_INIT_PATH, 'utf8');
    
    // Check if the file contains the initializeFirestore function
    if (content.includes('export async function initializeFirestore()')) {
      console.log('Found initializeFirestore function, adding fallback logic...');
      
      // Find the verifyCollection function
      const verifyCollectionIndex = content.indexOf('async function verifyCollection(');
      
      if (verifyCollectionIndex !== -1) {
        // Get the function text
        const funcStart = content.indexOf('{', verifyCollectionIndex) + 1;
        const funcEnd = findMatchingBrace(content, funcStart);
        const verifyCollectionFunc = content.substring(funcStart, funcEnd);
        
        // Create the updated function with fallback logic
        const updatedVerifyFunc = `{
  // Collection mapping for rationalization
  const collectionMapping = {
    'products_add_ons': 'product_add_ons',
    'products_add-ons': 'product_add_ons',
    'experience_packages': 'yacht_experiences'
  };

  // Try the new consolidated collection first if applicable
  const newCollectionName = collectionMapping[collectionName];
  
  if (newCollectionName) {
    try {
      console.log(\`Checking consolidated collection \${newCollectionName}...\`);
      const newCollectionRef = collection(db, newCollectionName);
      const newSnapshot = await getDocs(newCollectionRef);
      
      if (!newSnapshot.empty) {
        console.log(\`Collection \${newCollectionName} verified in emulator\`);
        return;
      }
    } catch (error) {
      console.log(\`Error checking consolidated collection \${newCollectionName}, falling back to original\`);
    }
  }
  
  // Original verification logic
  ${verifyCollectionFunc.trim()}
}`;
        
        // Replace the old function with the updated one
        const updatedContent = content.substring(0, funcStart) + updatedVerifyFunc + content.substring(funcEnd);
        
        // Write the updated content back to the file
        fs.writeFileSync(FIRESTORE_INIT_PATH, updatedContent, 'utf8');
        console.log('Successfully added fallback logic to verifyCollection function');
      } else {
        console.log('Could not find verifyCollection function in firestore-init.ts');
      }
    } else {
      console.log('Could not find initializeFirestore function in firestore-init.ts');
    }
  } catch (error) {
    console.error('Error adding fallback logic to initializeFirestore:', error);
  }
}

// Utility function to find matching closing brace
function findMatchingBrace(text: string, startIndex: number): number {
  let braceCount = 1;
  let currentIndex = startIndex;
  
  while (braceCount > 0 && currentIndex < text.length) {
    currentIndex++;
    if (text[currentIndex] === '{') braceCount++;
    if (text[currentIndex] === '}') braceCount--;
  }
  
  return currentIndex;
}

// Main function
async function main() {
  updateFirestoreInit();
  addFallbackToInitializeFirestore();
}

// Run the script
main();