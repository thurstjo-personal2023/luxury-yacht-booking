#!/bin/bash

# Script to export all Firestore collections to JSON files

echo "====== Firestore Data Export ======"
echo "This script will export all collections from Firestore to JSON files"
echo "The exported files will be saved in the 'exports' directory"
echo ""

# Create exports directory if it doesn't exist
mkdir -p exports

# Run the export script
echo "Starting export process..."
npx tsx scripts/export-from-firestore.ts

# Check if the export was successful
if [ $? -ne 0 ]; then
  echo "Export failed. Please check the error messages above."
  exit 1
fi

echo ""
echo "====== Export Completed ======"
echo "You can find the exported JSON files in the 'exports' directory"
echo "To import this data into a Firebase Emulator in the future, you can use:"
echo "  npx tsx scripts/populate-firebase-emulator.ts"
echo ""