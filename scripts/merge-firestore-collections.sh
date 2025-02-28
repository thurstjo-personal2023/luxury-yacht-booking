#!/bin/bash

# Script to merge and update Firestore collections
echo "Starting Firestore collection migration..."

# Fix the path to the firebase config file
echo "Fixing the merge-collections.ts script to access the correct Firebase config..."
sed -i 's/import { firebaseConfig } from "../client\/src\/lib\/firebase";/import { initializeApp } from "firebase\/app";\n\nconst firebaseConfig = {\n  apiKey: process.env.FIREBASE_API_KEY || "AIzaSyCN6e2HYWk-DYe2eex_TfjPTlDO-AxCCpg",\n  authDomain: "etoile-yachts.firebaseapp.com",\n  projectId: "etoile-yachts",\n  storageBucket: "etoile-yachts.appspot.com",\n  messagingSenderId: "273879155256",\n  appId: "1:273879155256:web:ae2d26d3c7b7ebcf1bbbbc",\n  measurementId: "G-08LYS0NB12"\n};/' ./scripts/merge-collections.ts

# Run the merge collections script
echo "Running the collection merge script..."
npx tsx scripts/merge-collections.ts

# Check if the script executed successfully
if [ $? -eq 0 ]; then
  echo "Collections merged successfully!"
  
  # Update firestore.rules to include the new collections
  echo "Updating Firestore rules..."
  
  # Add new collection paths to firestore.rules if they don't exist
  if ! grep -q "match /product_add_ons/{document}" firestore.rules; then
    sed -i '/match \/products_add_ons\/{document}/a \ \ \ \ \ \ match /product_add_ons/{document} {\n        allow read;\n        allow write: if request.time < timestamp.date(2024, 12, 31);\n      }' firestore.rules
  fi
  
  if ! grep -q "match /yacht_experiences/{document}" firestore.rules; then
    sed -i '/match \/experience_packages\/{document}/a \ \ \ \ \ \ match /yacht_experiences/{document} {\n        allow read;\n        allow write: if request.time < timestamp.date(2024, 12, 31);\n      }' firestore.rules
  fi
  
  echo "Migration completed successfully!"
else
  echo "Error occurred during collection merge!"
  exit 1
fi