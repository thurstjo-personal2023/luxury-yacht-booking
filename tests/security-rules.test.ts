/**
 * Firestore Security Rules Test Suite
 * 
 * This file contains tests to verify that our Firestore security rules
 * correctly protect data based on authentication state and user roles.
 */
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const PROJECT_ID = 'test-project';

describe('Firestore Security Rules', () => {
  let testEnv: RulesTestEnvironment;
  
  beforeAll(async () => {
    // Load the security rules file
    const rules = readFileSync(resolve(__dirname, '../firestore.rules'), 'utf8');
    
    // Initialize the test environment with the rules
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules
      }
    });
  });
  
  afterAll(async () => {
    // Clean up the test environment
    await testEnv.cleanup();
  });
  
  beforeEach(async () => {
    // Clear the database between tests
    await testEnv.clearFirestore();
  });
  
  // Helper functions
  const getFirestoreWithAuth = (auth: { uid: string, email?: string, role?: string }) => {
    return testEnv.authenticatedContext(auth.uid, auth).firestore();
  };
  
  const getFirestoreWithoutAuth = () => {
    return testEnv.unauthenticatedContext().firestore();
  };

  // Tests for Yacht collection access
  describe('Yacht Listings', () => {
    beforeEach(async () => {
      // Seed the database with test data
      const adminDb = testEnv.authenticatedContext('admin', { uid: 'admin', role: 'admin' }).firestore();
      
      // Create a public yacht listing
      await setDoc(doc(adminDb, 'unified_yacht_experiences', 'public-yacht-1'), {
        id: 'public-yacht-1',
        title: 'Public Yacht',
        description: 'This is a public yacht',
        isPublished: true,
        isAvailable: true,
        providerId: 'producer-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create a private yacht listing
      await setDoc(doc(adminDb, 'unified_yacht_experiences', 'private-yacht-1'), {
        id: 'private-yacht-1',
        title: 'Private Yacht',
        description: 'This is a private yacht',
        isPublished: false,
        isAvailable: true,
        providerId: 'producer-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create a yacht listing for another producer
      await setDoc(doc(adminDb, 'unified_yacht_experiences', 'other-producer-yacht-1'), {
        id: 'other-producer-yacht-1',
        title: 'Other Producer Yacht',
        description: 'This yacht belongs to another producer',
        isPublished: true,
        isAvailable: true,
        providerId: 'producer-2',
        createdAt: new Date(),
        updatedAt: new Date()
      });
    });
    
    it('allows unauthenticated users to read published yachts', async () => {
      const db = getFirestoreWithoutAuth();
      
      // Should be able to read a published yacht
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).exists()).toBe(true);
      
      // Should not be able to read an unpublished yacht
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'private-yacht-1'))).rejects.toThrow();
    });
    
    it('allows consumers to read published yachts', async () => {
      const db = getFirestoreWithAuth({ uid: 'consumer-1', role: 'consumer' });
      
      // Should be able to read a published yacht
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).exists()).toBe(true);
      
      // Should not be able to read an unpublished yacht
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'private-yacht-1'))).rejects.toThrow();
    });
    
    it('allows producers to read and write their own yachts', async () => {
      const db = getFirestoreWithAuth({ uid: 'producer-1', role: 'producer' });
      
      // Should be able to read own yachts (published and private)
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'private-yacht-1'))).resolves.toBeDefined();
      
      // Should be able to update own yacht
      await expect(updateDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'), {
        description: 'Updated description'
      })).resolves.toBeUndefined();
      
      // Should be able to create a new yacht
      await expect(setDoc(doc(db, 'unified_yacht_experiences', 'new-yacht-1'), {
        id: 'new-yacht-1',
        title: 'New Yacht',
        description: 'This is a new yacht',
        isPublished: false,
        isAvailable: true,
        providerId: 'producer-1',
        createdAt: new Date(),
        updatedAt: new Date()
      })).resolves.toBeUndefined();
      
      // Should not be able to read or write another producer's yacht
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'other-producer-yacht-1'))).resolves.toBeDefined(); // Can read public yachts
      await expect(updateDoc(doc(db, 'unified_yacht_experiences', 'other-producer-yacht-1'), {
        description: 'Trying to update someone else\'s yacht'
      })).rejects.toThrow();
    });
    
    it('allows admins to read and write all yachts', async () => {
      const db = getFirestoreWithAuth({ uid: 'admin', role: 'admin' });
      
      // Should be able to read all yachts
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'private-yacht-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(db, 'unified_yacht_experiences', 'other-producer-yacht-1'))).resolves.toBeDefined();
      
      // Should be able to update any yacht
      await expect(updateDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'), {
        description: 'Admin updated this'
      })).resolves.toBeUndefined();
      
      await expect(updateDoc(doc(db, 'unified_yacht_experiences', 'other-producer-yacht-1'), {
        description: 'Admin updated this too'
      })).resolves.toBeUndefined();
    });
    
    it('prevents unauthorized users from creating or modifying yachts', async () => {
      const db = getFirestoreWithoutAuth();
      
      // Unauthenticated user should not be able to create a yacht
      await expect(setDoc(doc(db, 'unified_yacht_experiences', 'unauthorized-yacht'), {
        id: 'unauthorized-yacht',
        title: 'Unauthorized Yacht',
        description: 'This should not be allowed',
        isPublished: true,
        isAvailable: true,
        providerId: 'hacker',
        createdAt: new Date(),
        updatedAt: new Date()
      })).rejects.toThrow();
      
      // Unauthenticated user should not be able to update a yacht
      await expect(updateDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'), {
        description: 'Hacked description'
      })).rejects.toThrow();
      
      // Unauthenticated user should not be able to delete a yacht
      await expect(deleteDoc(doc(db, 'unified_yacht_experiences', 'public-yacht-1'))).rejects.toThrow();
    });
  });
  
  // Tests for Booking access
  describe('Bookings', () => {
    beforeEach(async () => {
      // Seed the database with test bookings
      const adminDb = testEnv.authenticatedContext('admin', { uid: 'admin', role: 'admin' }).firestore();
      
      // Create a booking for consumer-1
      await setDoc(doc(adminDb, 'bookings', 'booking-1'), {
        id: 'booking-1',
        yachtId: 'public-yacht-1',
        userId: 'consumer-1',
        totalPrice: 500.00,
        status: 'confirmed',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      });
      
      // Create a booking for consumer-2
      await setDoc(doc(adminDb, 'bookings', 'booking-2'), {
        id: 'booking-2',
        yachtId: 'public-yacht-1',
        userId: 'consumer-2',
        totalPrice: 700.00,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      });
    });
    
    it('allows consumers to read and create their own bookings', async () => {
      const db = getFirestoreWithAuth({ uid: 'consumer-1', role: 'consumer' });
      
      // Should be able to read own booking
      await expect(getDoc(doc(db, 'bookings', 'booking-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(db, 'bookings', 'booking-1'))).exists()).toBe(true);
      
      // Should not be able to read another consumer's booking
      await expect(getDoc(doc(db, 'bookings', 'booking-2'))).rejects.toThrow();
      
      // Should be able to create a new booking
      await expect(setDoc(doc(db, 'bookings', 'booking-3'), {
        id: 'booking-3',
        yachtId: 'public-yacht-1',
        userId: 'consumer-1', // Must match authenticated user ID
        totalPrice: 600.00,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      })).resolves.toBeUndefined();
      
      // Should not be able to create a booking for another user
      await expect(setDoc(doc(db, 'bookings', 'booking-4'), {
        id: 'booking-4',
        yachtId: 'public-yacht-1',
        userId: 'consumer-2', // Different from authenticated user ID
        totalPrice: 600.00,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      })).rejects.toThrow();
    });
    
    it('allows producers to read bookings for their yachts', async () => {
      // First, create producer yacht association
      const adminDb = testEnv.authenticatedContext('admin', { uid: 'admin', role: 'admin' }).firestore();
      await setDoc(doc(adminDb, 'unified_yacht_experiences', 'producer-yacht'), {
        id: 'producer-yacht',
        title: 'Producer Yacht',
        description: 'This is a producer\'s yacht',
        isPublished: true,
        isAvailable: true,
        providerId: 'producer-1',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create booking for producer's yacht
      await setDoc(doc(adminDb, 'bookings', 'producer-booking'), {
        id: 'producer-booking',
        yachtId: 'producer-yacht',
        userId: 'consumer-1', 
        totalPrice: 600.00,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      });
      
      const db = getFirestoreWithAuth({ uid: 'producer-1', role: 'producer' });
      
      // Should be able to read bookings for their yacht
      await expect(getDoc(doc(db, 'bookings', 'producer-booking'))).resolves.toBeDefined();
      expect((await getDoc(doc(db, 'bookings', 'producer-booking'))).exists()).toBe(true);
      
      // Should not be able to read bookings for other yachts
      await expect(getDoc(doc(db, 'bookings', 'booking-1'))).rejects.toThrow();
    });
    
    it('allows admins to read all bookings', async () => {
      const db = getFirestoreWithAuth({ uid: 'admin', role: 'admin' });
      
      // Admin should be able to read all bookings
      await expect(getDoc(doc(db, 'bookings', 'booking-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(db, 'bookings', 'booking-2'))).resolves.toBeDefined();
    });
    
    it('prevents unauthenticated users from accessing bookings', async () => {
      const db = getFirestoreWithoutAuth();
      
      // Unauthenticated users should not be able to read bookings
      await expect(getDoc(doc(db, 'bookings', 'booking-1'))).rejects.toThrow();
      
      // Unauthenticated users should not be able to create bookings
      await expect(setDoc(doc(db, 'bookings', 'unauthorized-booking'), {
        id: 'unauthorized-booking',
        yachtId: 'public-yacht-1',
        userId: 'hacker',
        totalPrice: 500.00,
        status: 'pending',
        startDate: new Date(),
        endDate: new Date(Date.now() + 86400000), // Tomorrow
        createdAt: new Date()
      })).rejects.toThrow();
    });
  });
  
  // Tests for User Profiles access
  describe('User Profiles', () => {
    beforeEach(async () => {
      // Seed the database with test user profiles
      const adminDb = testEnv.authenticatedContext('admin', { uid: 'admin', role: 'admin' }).firestore();
      
      // Create consumer profile
      await setDoc(doc(adminDb, 'harmonized_users', 'consumer-1'), {
        id: 'consumer-1',
        userId: 'consumer-1',
        name: 'Test Consumer',
        email: 'consumer@example.com',
        phone: '1234567890',
        role: 'consumer',
        emailVerified: true,
        points: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create corresponding tourist profile
      await setDoc(doc(adminDb, 'user_profiles_tourist', 'consumer-1'), {
        id: 'consumer-1',
        profilePhoto: 'https://example.com/photo.jpg',
        loyaltyTier: 'gold',
        preferences: ['luxury', 'family'],
        wishlist: ['yacht-1', 'yacht-2'],
        bookingHistory: ['booking-1'],
        lastUpdated: new Date()
      });
      
      // Create producer profile
      await setDoc(doc(adminDb, 'harmonized_users', 'producer-1'), {
        id: 'producer-1',
        userId: 'producer-1',
        name: 'Test Producer',
        email: 'producer@example.com',
        phone: '0987654321',
        role: 'producer',
        emailVerified: true,
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Create corresponding service provider profile
      await setDoc(doc(adminDb, 'user_profiles_service_provider', 'producer-1'), {
        providerId: 'producer-1',
        businessName: 'Test Yacht Company',
        contactInformation: {
          address: '123 Marina Dr, Dubai'
        },
        profilePhoto: 'https://example.com/company.jpg',
        servicesOffered: ['charters', 'tours'],
        lastUpdated: new Date()
      });
    });
    
    it('allows users to read and update their own profiles', async () => {
      const consumerDb = getFirestoreWithAuth({ uid: 'consumer-1', role: 'consumer' });
      
      // Should be able to read own core profile
      await expect(getDoc(doc(consumerDb, 'harmonized_users', 'consumer-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(consumerDb, 'harmonized_users', 'consumer-1'))).exists()).toBe(true);
      
      // Should be able to read own tourist profile
      await expect(getDoc(doc(consumerDb, 'user_profiles_tourist', 'consumer-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(consumerDb, 'user_profiles_tourist', 'consumer-1'))).exists()).toBe(true);
      
      // Should be able to update own tourist profile
      await expect(updateDoc(doc(consumerDb, 'user_profiles_tourist', 'consumer-1'), {
        preferences: ['luxury', 'family', 'adventure']
      })).resolves.toBeUndefined();
      
      // Should not be able to read other user profiles
      await expect(getDoc(doc(consumerDb, 'harmonized_users', 'producer-1'))).rejects.toThrow();
      await expect(getDoc(doc(consumerDb, 'user_profiles_service_provider', 'producer-1'))).rejects.toThrow();
    });
    
    it('allows producers to read and update their own profiles', async () => {
      const producerDb = getFirestoreWithAuth({ uid: 'producer-1', role: 'producer' });
      
      // Should be able to read own core profile
      await expect(getDoc(doc(producerDb, 'harmonized_users', 'producer-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(producerDb, 'harmonized_users', 'producer-1'))).exists()).toBe(true);
      
      // Should be able to read own service provider profile
      await expect(getDoc(doc(producerDb, 'user_profiles_service_provider', 'producer-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(producerDb, 'user_profiles_service_provider', 'producer-1'))).exists()).toBe(true);
      
      // Should be able to update own service provider profile
      await expect(updateDoc(doc(producerDb, 'user_profiles_service_provider', 'producer-1'), {
        servicesOffered: ['charters', 'tours', 'fishing']
      })).resolves.toBeUndefined();
      
      // Should not be able to read other user profiles
      await expect(getDoc(doc(producerDb, 'harmonized_users', 'consumer-1'))).rejects.toThrow();
      await expect(getDoc(doc(producerDb, 'user_profiles_tourist', 'consumer-1'))).rejects.toThrow();
    });
    
    it('allows admins to read and update all profiles', async () => {
      const adminDb = getFirestoreWithAuth({ uid: 'admin', role: 'admin' });
      
      // Should be able to read all profiles
      await expect(getDoc(doc(adminDb, 'harmonized_users', 'consumer-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(adminDb, 'user_profiles_tourist', 'consumer-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(adminDb, 'harmonized_users', 'producer-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(adminDb, 'user_profiles_service_provider', 'producer-1'))).resolves.toBeDefined();
      
      // Should be able to update any profile
      await expect(updateDoc(doc(adminDb, 'harmonized_users', 'consumer-1'), {
        points: 150
      })).resolves.toBeUndefined();
      
      await expect(updateDoc(doc(adminDb, 'user_profiles_service_provider', 'producer-1'), {
        businessName: 'Updated Business Name'
      })).resolves.toBeUndefined();
    });
    
    it('prevents unauthenticated users from accessing profiles', async () => {
      const db = getFirestoreWithoutAuth();
      
      // Unauthenticated users should not be able to read profiles
      await expect(getDoc(doc(db, 'harmonized_users', 'consumer-1'))).rejects.toThrow();
      await expect(getDoc(doc(db, 'user_profiles_tourist', 'consumer-1'))).rejects.toThrow();
      
      // Unauthenticated users should not be able to create profiles
      await expect(setDoc(doc(db, 'harmonized_users', 'hacker'), {
        id: 'hacker',
        name: 'Hacker',
        email: 'hacker@example.com',
        role: 'admin' // Trying to create admin account
      })).rejects.toThrow();
    });
  });
  
  // Tests for Add-ons collection access
  describe('Product Add-ons', () => {
    beforeEach(async () => {
      // Seed the database with test add-ons
      const adminDb = testEnv.authenticatedContext('admin', { uid: 'admin', role: 'admin' }).firestore();
      
      // Create partner add-on
      await setDoc(doc(adminDb, 'products_add_ons', 'addon-1'), {
        productId: 'addon-1',
        name: 'Catering Service',
        description: 'Luxury catering service',
        category: 'food',
        pricing: 300.00,
        media: [{ type: 'image', url: 'https://example.com/catering.jpg' }],
        availability: true,
        tags: ['food', 'luxury'],
        partnerId: 'partner-1',
        createdDate: new Date(),
        lastUpdatedDate: new Date()
      });
      
      // Create another partner add-on
      await setDoc(doc(adminDb, 'products_add_ons', 'addon-2'), {
        productId: 'addon-2',
        name: 'DJ Service',
        description: 'Professional DJ service',
        category: 'entertainment',
        pricing: 500.00,
        media: [{ type: 'image', url: 'https://example.com/dj.jpg' }],
        availability: true,
        tags: ['music', 'party'],
        partnerId: 'partner-2',
        createdDate: new Date(),
        lastUpdatedDate: new Date()
      });
    });
    
    it('allows partners to read and update their own add-ons', async () => {
      const partnerDb = getFirestoreWithAuth({ uid: 'partner-1', role: 'partner' });
      
      // Should be able to read own add-ons
      await expect(getDoc(doc(partnerDb, 'products_add_ons', 'addon-1'))).resolves.toBeDefined();
      expect((await getDoc(doc(partnerDb, 'products_add_ons', 'addon-1'))).exists()).toBe(true);
      
      // Should be able to update own add-ons
      await expect(updateDoc(doc(partnerDb, 'products_add_ons', 'addon-1'), {
        pricing: 350.00,
        description: 'Updated luxury catering service'
      })).resolves.toBeUndefined();
      
      // Should be able to create a new add-on
      await expect(setDoc(doc(partnerDb, 'products_add_ons', 'addon-3'), {
        productId: 'addon-3',
        name: 'Massage Service',
        description: 'Relaxing massage service',
        category: 'wellness',
        pricing: 200.00,
        media: [{ type: 'image', url: 'https://example.com/massage.jpg' }],
        availability: true,
        tags: ['relaxation', 'wellness'],
        partnerId: 'partner-1', // Must match authenticated user ID
        createdDate: new Date(),
        lastUpdatedDate: new Date()
      })).resolves.toBeUndefined();
      
      // Should not be able to update another partner's add-ons
      await expect(updateDoc(doc(partnerDb, 'products_add_ons', 'addon-2'), {
        pricing: 450.00
      })).rejects.toThrow();
    });
    
    it('allows producers to read all add-ons', async () => {
      const producerDb = getFirestoreWithAuth({ uid: 'producer-1', role: 'producer' });
      
      // Should be able to read all add-ons regardless of owner
      await expect(getDoc(doc(producerDb, 'products_add_ons', 'addon-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(producerDb, 'products_add_ons', 'addon-2'))).resolves.toBeDefined();
      
      // Should not be able to update partner add-ons
      await expect(updateDoc(doc(producerDb, 'products_add_ons', 'addon-1'), {
        pricing: 400.00
      })).rejects.toThrow();
    });
    
    it('allows consumers to read available add-ons', async () => {
      const consumerDb = getFirestoreWithAuth({ uid: 'consumer-1', role: 'consumer' });
      
      // Should be able to read add-ons
      await expect(getDoc(doc(consumerDb, 'products_add_ons', 'addon-1'))).resolves.toBeDefined();
      await expect(getDoc(doc(consumerDb, 'products_add_ons', 'addon-2'))).resolves.toBeDefined();
      
      // Should not be able to update add-ons
      await expect(updateDoc(doc(consumerDb, 'products_add_ons', 'addon-1'), {
        pricing: 250.00
      })).rejects.toThrow();
    });
  });
});