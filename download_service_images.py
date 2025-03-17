#!/usr/bin/env python3
"""
Download service add-on images from Google Drive
"""
import os
import requests
from time import sleep

# Direct image URLs from Google Drive (these would be direct download links)
# Note: In a real scenario, you would need to get these direct links from the Google Drive API
IMAGE_URLS = {
    "water_skiing": [
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/water-skiing-1.jpg",
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/water-skiing-2.jpg"
    ],
    "flyboard": [
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/flyboard-1.jpg",
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/flyboard-2.jpg"
    ],
    "dining": [
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/private-dining-1.jpg",
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/private-dining-2.jpg"
    ],
    "catering": [
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/catering-1.jpg",
        "https://storage.googleapis.com/etoile-yachts.firebasestorage.app/service-addons/catering-2.jpg"
    ]
}

# Create output directory
os.makedirs("temp_service_images", exist_ok=True)

# Download images
for category, urls in IMAGE_URLS.items():
    print(f"Downloading {category} images...")
    for i, url in enumerate(urls):
        filename = f"temp_service_images/{category}_{i+1}.jpg"
        print(f"  Downloading {url} to {filename}")
        
        # For demonstration purposes, we'll create placeholder files
        # In a real scenario, you would download actual images
        with open(filename, "w") as f:
            f.write(f"Placeholder for {category} image {i+1}")
        
        print(f"  Successfully created placeholder for {filename}")
        sleep(0.1)  # Small delay to avoid rate limiting

print("\nPlaceholder images created in the temp_service_images directory")
print("In a real scenario, you would download actual images from the provided Google Drive URLs")