import os
import requests

def download_image(url: str, filename: str):
    """Download and save image from URL"""
    try:
        response = requests.get(url)
        if response.status_code == 200:
            # Ensure the public directory exists
            public_dir = "client/public"
            if not os.path.exists(public_dir):
                os.makedirs(public_dir)

            # Save the image
            filepath = os.path.join(public_dir, filename)
            with open(filepath, 'wb') as f:
                f.write(response.content)
            print(f"Successfully saved {filename}")
    except Exception as e:
        print(f"Error downloading {filename}: {str(e)}")

def download_stock_images():
    """Download pre-optimized stock images"""
    images = {
        'yacht-hero.jpg': 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200&q=80',  # Optimized yacht hero
        'featured-yacht.jpg': 'https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&q=80',  # Featured yacht experience
        'diving.jpg': 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&q=80',  # Diving experience
        'resort.jpg': 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&q=80'  # Resort amenity
    }

    for filename, url in images.items():
        print(f"Downloading {filename}...")
        download_image(url, filename)

if __name__ == "__main__":
    download_stock_images()
