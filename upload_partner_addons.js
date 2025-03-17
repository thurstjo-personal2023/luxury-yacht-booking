/**
 * Upload Partner Add-ons Script
 * 
 * This script uploads service add-ons for partner users directly to Firestore.
 */

const admin = require('firebase-admin');
const serviceAccount = require('./firebase-data-connect.json');

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();
const partnersCollection = 'products_add_ons';

// Partner information
const partners = [
  {
    email: 'lisa.webb@hotmail.com',
    uid: 'p3wafU2xFnNZugiepyC6OOgw3fE2',
    addons: [
      {
        name: 'Professional Water Skiing Experience',
        description: 'Expert water skiing instruction and equipment for all skill levels. Includes safety gear, professional instruction, and high-quality skis.',
        category: 'Water Sports',
        pricing: 249,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water-skiing-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/water-skiing-2.jpg'
          }
        ],
        availability: true,
        tags: ['water sports', 'adventure', 'instruction', 'equipment']
      },
      {
        name: 'Luxury Flyboard Experience',
        description: 'Experience the thrill of hydro-flight with our premium flyboard equipment and certified instructor. Perfect for beginners and experienced flyers alike.',
        category: 'Water Sports',
        pricing: 299,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/flyboard-2.jpg'
          }
        ],
        availability: true,
        tags: ['water sports', 'adventure', 'hydro-flight', 'extreme']
      }
    ]
  },
  {
    email: 'garysantil@hotmail.com',
    uid: 'IETQG0edpxWJW1tzYylgLZHMMoB2',
    addons: [
      {
        name: 'Exclusive Private Chef Experience',
        description: 'Customized multi-course meals tailored to the preferences of the yacht owner and guests. Our award-winning chefs create unforgettable dining experiences with premium ingredients.',
        category: 'Dining',
        pricing: 749,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/private-dining-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/private-dining-2.jpg'
          }
        ],
        availability: true,
        tags: ['dining', 'luxury', 'chef', 'gourmet', 'exclusive']
      },
      {
        name: 'Premium Yacht Catering Service',
        description: 'High-quality catering for special events, parties, or gatherings on the yacht. Our culinary team provides elegant presentation and exceptional flavors for any occasion.',
        category: 'Dining',
        pricing: 499,
        media: [
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering-1.jpg'
          },
          {
            type: 'image',
            url: 'https://storage.googleapis.com/etoile-yachts.appspot.com/service-addons/catering-2.jpg'
          }
        ],
        availability: true,
        tags: ['catering', 'events', 'party', 'food', 'gourmet']
      }
    ]
  }
];

/**
 * Upload partner add-ons directly to Firestore
 */
async function uploadPartnerAddons() {
  console.log('Uploading service add-ons for partners directly to Firestore...');
  
  let totalUploaded = 0;
  
  for (const partner of partners) {
    console.log(`\nProcessing partner: ${partner.email} (${partner.uid})`);
    
    for (const addon of partner.addons) {
      try {
        const productId = `addon-${partner.uid}-${Date.now()}`;
        
        // Create the add-on document
        const addonDoc = {
          productId: productId,
          name: addon.name,
          description: addon.description,
          category: addon.category,
          pricing: addon.pricing,
          media: addon.media || [],
          availability: addon.availability !== false,
          tags: addon.tags || [],
          partnerId: partner.uid,
          createdDate: admin.firestore.FieldValue.serverTimestamp(),
          lastUpdatedDate: admin.firestore.FieldValue.serverTimestamp()
        };
        
        // Upload to Firestore
        await db.collection(partnersCollection).doc(productId).set(addonDoc);
        
        console.log(`✓ Successfully created add-on: ${addon.name}`);
        console.log(`  ID: ${productId}`);
        
        totalUploaded++;
      } catch (error) {
        console.error(`✗ Failed to create add-on: ${addon.name}`);
        console.error(`  Error: ${error.message}`);
      }
    }
  }
  
  console.log(`\nAdd-on creation completed. Total add-ons uploaded: ${totalUploaded}`);
}

// Execute the upload
uploadPartnerAddons()
  .then(() => {
    console.log('Upload process completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error in upload process:', error);
    process.exit(1);
  });