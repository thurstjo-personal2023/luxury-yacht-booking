import * as fs from 'fs';
import * as path from 'path';

// Define the source directory to search
const SOURCE_DIR = './client/src';

// Collection mapping - old to new
const COLLECTION_MAPPING = {
  'products_add_ons': 'product_add_ons',
  'products_add-ons': 'product_add_ons',
  'experience_packages': 'yacht_experiences'
};

// Function to recursively search files
function findFiles(dir: string, fileList: string[] = []): string[] {
  const files = fs.readdirSync(dir);

  files.forEach(file => {
    const filePath = path.join(dir, file);
    
    if (fs.statSync(filePath).isDirectory()) {
      fileList = findFiles(filePath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx')) {
      fileList.push(filePath);
    }
  });

  return fileList;
}

// Check if a file contains any of our old collection names
function fileContainsOldCollections(filePath: string): boolean {
  const content = fs.readFileSync(filePath, 'utf8');
  
  return Object.keys(COLLECTION_MAPPING).some(oldName => 
    content.includes(`collection('${oldName}')`) || 
    content.includes(`collection("${oldName}")`) ||
    content.includes(`.collection('${oldName}')`) || 
    content.includes(`.collection("${oldName}")`)
  );
}

// Update a file's content to use the new collection names
function updateFile(filePath: string): boolean {
  let content = fs.readFileSync(filePath, 'utf8');
  let madeChanges = false;
  
  for (const [oldName, newName] of Object.entries(COLLECTION_MAPPING)) {
    // Update exact collection references with quotes
    const patterns = [
      `collection('${oldName}')`,
      `collection("${oldName}")`,
      `.collection('${oldName}')`,
      `.collection("${oldName}")`
    ];
    
    for (const pattern of patterns) {
      // Prepare the replacement string based on pattern
      const replacement = pattern.replace(oldName, newName);
      
      if (content.includes(pattern)) {
        // Instead of directly replacing, we'll add a graceful fallback for safer migration
        // Find the position of the pattern in the content
        const index = content.indexOf(pattern);
        
        // Find line start and end
        const lineStart = content.lastIndexOf('\n', index) + 1;
        const lineEnd = content.indexOf('\n', index);
        const line = content.substring(lineStart, lineEnd !== -1 ? lineEnd : content.length);
        
        // Only replace if we're not already using a try-catch for collection
        if (!line.includes('try {') && !line.includes('catch')) {
          // Create a new string with replacement
          const newContent = 
            content.substring(0, lineStart) +
            `// Updated collection reference for rationalization\n` +
            `try {\n` +
            `  // First try the new consolidated collection\n` +
            `  ${line.replace(pattern, replacement)}\n` +
            `} catch (error) {\n` +
            `  console.warn('Falling back to original collection: ${oldName}');\n` +
            `  // Fallback to the original collection if needed\n` +
            `  ${line}\n` +
            `}\n` +
            content.substring(lineEnd !== -1 ? lineEnd : content.length);
          
          content = newContent;
          madeChanges = true;
        }
      }
    }
  }
  
  if (madeChanges) {
    fs.writeFileSync(filePath, content, 'utf8');
    return true;
  }
  
  return false;
}

// Main function
async function main() {
  try {
    console.log('Searching for files with old collection references...');
    
    // Find all TypeScript files in the source directory
    const files = findFiles(SOURCE_DIR);
    console.log(`Found ${files.length} TypeScript files to check.`);
    
    // Filter files that contain old collection references
    const filesToUpdate = files.filter(file => fileContainsOldCollections(file));
    console.log(`Found ${filesToUpdate.length} files with old collection references.`);
    
    // Update each file
    let updatedCount = 0;
    for (const file of filesToUpdate) {
      console.log(`Checking ${file}...`);
      if (updateFile(file)) {
        console.log(`Updated: ${file}`);
        updatedCount++;
      }
    }
    
    console.log(`Process completed. Updated ${updatedCount} files.`);
  } catch (error) {
    console.error('Error updating client references:', error);
  }
}

// Run the script
main();