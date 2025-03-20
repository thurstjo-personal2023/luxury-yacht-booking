/**
 * Firestore Operations Test Suite
 * 
 * This file contains tests for Firestore operations against the emulator.
 * It focuses on CRUD operations for the main collections.
 */
import * as firebase from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  Firestore
} from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut,
  Auth
} from 'firebase/auth';
import { connectAuthEmulator } from 'firebase/auth';

describe('Firestore Operations', () => {
  // Firebase app instance
  let app: firebase.FirebaseApp;
  let db: Firestore;
  let auth: Auth;
  
  // Test user credentials
  const TEST_USER = {
    email: `firestore-test-${Date.now()}@example.com`,
    password: 'Test1234!',
    uid: ''
  };
  
  // Test data
  const TEST_YACHT = {
    title: 'Test Yacht',
    description: 'A test yacht for automated testing',
    category: 'Luxury',
    yachtType: 'Motor Yacht',
    capacity: 10,
    duration: 4,
    pricing: 1000,
    pricingModel: 'Fixed',
    location: {
      latitude: 25.0,
      longitude: 55.0,
      address: 'Dubai Marina, UAE',
      region: 'dubai',
      port_marina: 'Dubai Marina'
    },
    media: [
      {
        type: 'image',
        url: 'https://example.com/yacht1.jpg'
      }
    ],
    isAvailable: true,
    isFeatured: false,
    isPublished: true,
    tags: ['luxury', 'test'],
    customizationOptions: []
  };
  
  const TEST_PRODUCT_ADDON = {
    name: 'Test Add-on',
    description: 'A test service add-on',
    category: 'Catering',
    pricing: 150,
    availability: true,
    media: [
      {
        type: 'image',
        url: 'https://example.com/addon.jpg'
      }
    ],
    tags: ['food', 'test']
  };
  
  // Initialize Firebase before all tests
  beforeAll(async () => {
    // Initialize Firebase with test configuration
    app = firebase.initializeApp({
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
      projectId: 'etoile-yachts',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
    
    // Get Firestore and Auth instances
    db = getFirestore(app);
    auth = getAuth(app);
    
    // Connect to emulators
    connectFirestoreEmulator(db, 'localhost', 8080);
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    
    // Create test user
    try {
      const userCred = await createUserWithEmailAndPassword(
        auth,
        TEST_USER.email,
        TEST_USER.password
      );
      
      if (userCred && userCred.user) {
        TEST_USER.uid = userCred.user.uid;
        
        // Create harmonized user document in Firestore
        await setDoc(doc(db, 'harmonized_users', TEST_USER.uid), {
          id: TEST_USER.uid,
          userId: TEST_USER.uid,
          name: 'Test User',
          email: TEST_USER.email,
          role: 'producer',
          emailVerified: false,
          points: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        
        // Create service provider profile
        await setDoc(doc(db, 'user_profiles_service_provider', TEST_USER.uid), {
          providerId: TEST_USER.uid,
          businessName: 'Test Business',
          contactInformation: {
            address: '123 Test St, Dubai, UAE'
          },
          servicesOffered: ['Yacht Rental'],
          lastUpdated: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error setting up test user:', error);
    }
  });
  
  // Cleanup after all tests
  afterAll(async () => {
    await signOut(auth).catch(() => {});
    
    // Clean up test data
    try {
      // Delete test user in Auth
      if (auth.currentUser && auth.currentUser.uid === TEST_USER.uid) {
        await auth.currentUser.delete();
      }
    } catch (error) {
      console.error('Error cleaning up test user:', error);
    }
    
    // Close Firebase app
    await app.delete();
  });
  
  // Sign in before each test
  beforeEach(async () => {
    // Sign in as test user
    try {
      await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
    } catch (error) {
      console.error('Error signing in test user:', error);
    }
  });
  
  describe('Yacht Operations', () => {
    let yachtId: string;
    
    it('should create a new yacht document', async () => {
      // Add producer ID to the yacht
      const yachtData = {
        ...TEST_YACHT,
        providerId: TEST_USER.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Add yacht to Firestore
      const docRef = await addDoc(collection(db, 'unified_yacht_experiences'), yachtData);
      yachtId = docRef.id;
      
      // Verify yacht document was created
      const docSnapshot = await getDoc(docRef);
      expect(docSnapshot.exists()).toBe(true);
      
      const data = docSnapshot.data();
      if (data) {
        expect(data.title).toBe(TEST_YACHT.title);
        expect(data.providerId).toBe(TEST_USER.uid);
      }
    });
    
    it('should read yacht documents', async () => {
      // Query yachts by provider ID
      const q = query(
        collection(db, 'unified_yacht_experiences'),
        where('providerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify yacht is in the results
      expect(querySnapshot.empty).toBe(false);
      
      let found = false;
      querySnapshot.forEach(doc => {
        if (doc.id === yachtId) {
          found = true;
          const data = doc.data();
          expect(data.title).toBe(TEST_YACHT.title);
          expect(data.description).toBe(TEST_YACHT.description);
        }
      });
      
      expect(found).toBe(true);
    });
    
    it('should update a yacht document', async () => {
      // New data to update
      const updateData = {
        title: 'Updated Test Yacht',
        description: 'This yacht has been updated',
        pricing: 1200,
        updatedAt: serverTimestamp()
      };
      
      // Update yacht document
      const yachtRef = doc(db, 'unified_yacht_experiences', yachtId);
      await updateDoc(yachtRef, updateData);
      
      // Verify update
      const docSnapshot = await getDoc(yachtRef);
      expect(docSnapshot.exists()).toBe(true);
      
      const data = docSnapshot.data();
      if (data) {
        expect(data.title).toBe(updateData.title);
        expect(data.description).toBe(updateData.description);
        expect(data.pricing).toBe(updateData.pricing);
      }
    });
    
    it('should delete a yacht document', async () => {
      // Delete yacht document
      const yachtRef = doc(db, 'unified_yacht_experiences', yachtId);
      await deleteDoc(yachtRef);
      
      // Verify deletion
      const docSnapshot = await getDoc(yachtRef);
      expect(docSnapshot.exists()).toBe(false);
    });
  });
  
  describe('Product Add-on Operations', () => {
    let addonId: string;
    
    it('should create a new product add-on document', async () => {
      // Add partner ID and timestamps to the add-on
      const addonData = {
        ...TEST_PRODUCT_ADDON,
        partnerId: TEST_USER.uid,
        productId: `ADDON-${Date.now()}`,
        createdDate: serverTimestamp(),
        lastUpdatedDate: serverTimestamp()
      };
      
      // Add add-on to Firestore
      const docRef = await addDoc(collection(db, 'products_add_ons'), addonData);
      addonId = docRef.id;
      
      // Verify add-on document was created
      const docSnapshot = await getDoc(docRef);
      expect(docSnapshot.exists()).toBe(true);
      
      const data = docSnapshot.data();
      if (data) {
        expect(data.name).toBe(TEST_PRODUCT_ADDON.name);
        expect(data.partnerId).toBe(TEST_USER.uid);
      }
    });
    
    it('should read product add-on documents', async () => {
      // Query add-ons by partner ID
      const q = query(
        collection(db, 'products_add_ons'),
        where('partnerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify add-on is in the results
      expect(querySnapshot.empty).toBe(false);
      
      let found = false;
      querySnapshot.forEach(doc => {
        if (doc.id === addonId) {
          found = true;
          const data = doc.data();
          expect(data.name).toBe(TEST_PRODUCT_ADDON.name);
          expect(data.description).toBe(TEST_PRODUCT_ADDON.description);
        }
      });
      
      expect(found).toBe(true);
    });
    
    it('should update a product add-on document', async () => {
      // New data to update
      const updateData = {
        name: 'Updated Add-on',
        description: 'This add-on has been updated',
        pricing: 200,
        lastUpdatedDate: serverTimestamp()
      };
      
      // Update add-on document
      const addonRef = doc(db, 'products_add_ons', addonId);
      await updateDoc(addonRef, updateData);
      
      // Verify update
      const docSnapshot = await getDoc(addonRef);
      expect(docSnapshot.exists()).toBe(true);
      
      const data = docSnapshot.data();
      if (data) {
        expect(data.name).toBe(updateData.name);
        expect(data.description).toBe(updateData.description);
        expect(data.pricing).toBe(updateData.pricing);
      }
    });
    
    it('should delete a product add-on document', async () => {
      // Delete add-on document
      const addonRef = doc(db, 'products_add_ons', addonId);
      await deleteDoc(addonRef);
      
      // Verify deletion
      const docSnapshot = await getDoc(addonRef);
      expect(docSnapshot.exists()).toBe(false);
    });
  });
  
  describe('User Profile Operations', () => {
    it('should read the user profile document', async () => {
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'harmonized_users', TEST_USER.uid));
      
      // Verify user document
      expect(userDoc.exists()).toBe(true);
      
      const data = userDoc.data();
      if (data) {
        expect(data.email).toBe(TEST_USER.email);
        expect(data.role).toBe('producer');
      }
    });
    
    it('should update the user profile document', async () => {
      // Update data
      const updateData = {
        name: 'Updated Test User',
        phone: '+15559876543',
        updatedAt: serverTimestamp()
      };
      
      // Update user document
      const userRef = doc(db, 'harmonized_users', TEST_USER.uid);
      await updateDoc(userRef, updateData);
      
      // Verify update
      const userDoc = await getDoc(userRef);
      expect(userDoc.exists()).toBe(true);
      
      const data = userDoc.data();
      if (data) {
        expect(data.name).toBe(updateData.name);
        expect(data.phone).toBe(updateData.phone);
      }
    });
    
    it('should update the service provider profile document', async () => {
      // Update data
      const updateData = {
        businessName: 'Updated Test Business',
        contactInformation: {
          address: '456 Updated St, Dubai, UAE'
        },
        lastUpdated: serverTimestamp()
      };
      
      // Update profile document
      const profileRef = doc(db, 'user_profiles_service_provider', TEST_USER.uid);
      await updateDoc(profileRef, updateData);
      
      // Verify update
      const profileDoc = await getDoc(profileRef);
      expect(profileDoc.exists()).toBe(true);
      
      const data = profileDoc.data();
      if (data) {
        expect(data.businessName).toBe(updateData.businessName);
        expect(data.contactInformation.address).toBe(updateData.contactInformation.address);
      }
    });
  });
  
  describe('Query Operations', () => {
    // Create several test yachts for query testing
    let yachtIds: string[] = [];
    
    beforeAll(async () => {
      // Create test yachts
      const yachts = [
        {
          ...TEST_YACHT,
          title: 'Luxury Yacht 1',
          category: 'Luxury',
          pricing: 2000,
          capacity: 15,
          providerId: TEST_USER.uid,
          isAvailable: true,
          isFeatured: true,
          tags: ['luxury', 'featured']
        },
        {
          ...TEST_YACHT,
          title: 'Sports Yacht 1',
          category: 'Sports',
          pricing: 1500,
          capacity: 8,
          providerId: TEST_USER.uid,
          isAvailable: true,
          isFeatured: false,
          tags: ['sports', 'speed']
        },
        {
          ...TEST_YACHT,
          title: 'Family Yacht 1',
          category: 'Family',
          pricing: 1200,
          capacity: 12,
          providerId: TEST_USER.uid,
          isAvailable: false, // Unavailable
          isFeatured: false,
          tags: ['family', 'comfort']
        }
      ];
      
      // Add yachts to Firestore
      for (const yacht of yachts) {
        const yachtData = {
          ...yacht,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };
        
        const docRef = await addDoc(collection(db, 'unified_yacht_experiences'), yachtData);
        yachtIds.push(docRef.id);
      }
    });
    
    afterAll(async () => {
      // Clean up test yachts
      for (const id of yachtIds) {
        try {
          await deleteDoc(doc(db, 'unified_yacht_experiences', id));
        } catch (error) {
          console.error(`Error deleting test yacht ${id}:`, error);
        }
      }
    });
    
    it('should query yachts by category', async () => {
      // Query yachts by category
      const q = query(
        collection(db, 'unified_yacht_experiences'),
        where('category', '==', 'Luxury'),
        where('providerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify results
      expect(querySnapshot.empty).toBe(false);
      
      let luxuryCount = 0;
      querySnapshot.forEach(doc => {
        expect(doc.data().category).toBe('Luxury');
        luxuryCount++;
      });
      
      expect(luxuryCount).toBeGreaterThan(0);
    });
    
    it('should query yachts by availability', async () => {
      // Query available yachts
      const q = query(
        collection(db, 'unified_yacht_experiences'),
        where('isAvailable', '==', true),
        where('providerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify results
      expect(querySnapshot.empty).toBe(false);
      
      querySnapshot.forEach(doc => {
        expect(doc.data().isAvailable).toBe(true);
      });
      
      // Should have at least 2 available yachts
      expect(querySnapshot.size).toBeGreaterThanOrEqual(2);
    });
    
    it('should query featured yachts', async () => {
      // Query featured yachts
      const q = query(
        collection(db, 'unified_yacht_experiences'),
        where('isFeatured', '==', true),
        where('providerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify results
      expect(querySnapshot.empty).toBe(false);
      
      querySnapshot.forEach(doc => {
        expect(doc.data().isFeatured).toBe(true);
      });
      
      // Should have at least 1 featured yacht
      expect(querySnapshot.size).toBeGreaterThanOrEqual(1);
    });
    
    it('should handle complex queries combining multiple conditions', async () => {
      // Query available luxury yachts
      const q = query(
        collection(db, 'unified_yacht_experiences'),
        where('category', '==', 'Luxury'),
        where('isAvailable', '==', true),
        where('providerId', '==', TEST_USER.uid)
      );
      
      const querySnapshot = await getDocs(q);
      
      // Verify results
      expect(querySnapshot.empty).toBe(false);
      
      querySnapshot.forEach(doc => {
        expect(doc.data().category).toBe('Luxury');
        expect(doc.data().isAvailable).toBe(true);
      });
    });
  });
});