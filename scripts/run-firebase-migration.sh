#!/bin/bash

# Master script to run the Firebase collection rationalization process
echo "====== Firebase Collection Rationalization ======"
echo "This script will:"
echo "1. Merge overlapping collections"
echo "2. Update Firestore security rules"
echo "3. Update client-side references"
echo "4. Update firestore-init.ts initialization"
echo ""

# Ensure we have the right permissions
chmod +x scripts/merge-firestore-collections.sh

# Step 1: Run the collection merge script
echo "====== Step 1: Merging Firebase Collections ======"
./scripts/merge-firestore-collections.sh

# Check if the merge was successful
if [ $? -ne 0 ]; then
  echo "Collection merge failed. Stopping migration process."
  exit 1
fi

echo ""

# Step 2: Update client-side references
echo "====== Step 2: Updating Client-Side References ======"
echo "This will update collection references in the client code..."
npx tsx scripts/update-client-references.ts

echo ""

# Step 3: Update firestore initialization
echo "====== Step 3: Updating Firestore Initialization ======"
echo "This will update the collection references in firestore-init.ts..."
npx tsx scripts/update-firestore-init.ts

echo ""
echo "====== Migration Completed Successfully ======"
echo "Notes:"
echo "- New consolidated collections: product_add_ons, users, yacht_experiences"
echo "- Original collections preserved for backward compatibility"
echo "- Client code updated with graceful fallbacks for safety"
echo ""
echo "Please restart your application to apply all changes."