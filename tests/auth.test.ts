/**
 * Authentication Service Test Suite
 * 
 * This file contains tests for authentication functionality.
 * These tests run against the Firebase Emulator.
 */
import * as firebase from 'firebase/app';
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  UserCredential,
  Auth
} from 'firebase/auth';
import { connectAuthEmulator } from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  Firestore 
} from 'firebase/firestore';
import { connectFirestoreEmulator } from 'firebase/firestore';

// Define test user data
const TEST_USER = {
  email: `test-${Date.now()}@example.com`,
  password: 'Test1234!',
  role: 'consumer',
  name: 'Test User'
};

const TEST_PRODUCER = {
  email: `producer-${Date.now()}@example.com`,
  password: 'Producer1234!',
  role: 'producer',
  name: 'Test Producer',
  businessName: 'Test Business'
};

describe('Authentication Service', () => {
  // Firebase instances
  let app: firebase.FirebaseApp;
  let auth: Auth;
  let db: Firestore;
  
  // Set up Firebase before tests
  beforeAll(async () => {
    // Initialize Firebase with test config
    app = firebase.initializeApp({
      apiKey: 'fake-api-key',
      authDomain: 'localhost',
      projectId: 'etoile-yachts',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    });
    
    // Get auth and Firestore instances
    auth = getAuth(app);
    db = getFirestore(app);
    
    // Connect to Firebase Auth Emulator
    connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
    
    // Connect to Firebase Firestore Emulator
    connectFirestoreEmulator(db, 'localhost', 8080);
    
    // Sign out any existing user
    await signOut(auth).catch(() => {});
    
    // Clean up: delete any existing test users
    try {
      await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
      await auth.currentUser?.delete();
    } catch (e) {
      // User doesn't exist, which is fine
    }
    
    try {
      await signInWithEmailAndPassword(auth, TEST_PRODUCER.email, TEST_PRODUCER.password);
      await auth.currentUser?.delete();
    } catch (e) {
      // User doesn't exist, which is fine
    }
    
    // Sign out again to ensure clean state
    await signOut(auth).catch(() => {});
  });
  
  // Close Firebase after tests
  afterAll(async () => {
    // Sign out after tests
    await signOut(auth).catch(() => {});
    
    // In Firebase v9, we don't need to explicitly delete the app
    // as it will be cleaned up when the tests complete
  });
  
  // Reset state before each test
  beforeEach(async () => {
    // Sign out before each test
    await signOut(auth).catch(() => {});
  });
  
  /**
   * Helper function to create a user in both Auth and Firestore
   */
  async function createTestUser(userData: any): Promise<UserCredential> {
    // Create user in Firebase Auth
    const userCred = await createUserWithEmailAndPassword(
      auth,
      userData.email,
      userData.password
    );
    
    const uid = userCred.user.uid;
    
    // Create harmonized user document in Firestore
    await setDoc(doc(db, 'harmonized_users', uid), {
      id: uid,
      userId: uid,
      name: userData.name,
      email: userData.email,
      phone: '+15551234567',
      role: userData.role,
      emailVerified: false,
      points: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      _standardized: true,
      _standardizedVersion: 1
    });
    
    // Create role-specific profile
    if (userData.role === 'consumer') {
      await setDoc(doc(db, 'user_profiles_tourist', uid), {
        id: uid,
        profilePhoto: '',
        loyaltyTier: 'bronze',
        preferences: [],
        wishlist: [],
        bookingHistory: [],
        reviewsProvided: [],
        lastUpdated: new Date()
      });
    } else if (userData.role === 'producer' || userData.role === 'partner') {
      await setDoc(doc(db, 'user_profiles_service_provider', uid), {
        providerId: uid,
        businessName: userData.businessName || `${userData.name}'s Business`,
        contactInformation: {
          address: '123 Test St, Dubai, UAE'
        },
        profilePhoto: '',
        servicesOffered: ['Yacht Rental'],
        certifications: [],
        ratings: 5.0,
        tags: ['new'],
        lastUpdated: new Date()
      });
    }
    
    return userCred;
  }
  
  describe('User Registration', () => {
    it('should register a new consumer user', async () => {
      // Create test user
      const userCred = await createTestUser(TEST_USER);
      
      // Verify user is created
      expect(userCred.user).toBeDefined();
      expect(userCred.user.email).toBe(TEST_USER.email);
      
      // Check Firestore for user document
      const userDoc = await getDoc(doc(db, 'harmonized_users', userCred.user.uid));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.role).toBe('consumer');
      
      // Check for tourist profile
      const profileDoc = await getDoc(doc(db, 'user_profiles_tourist', userCred.user.uid));
      expect(profileDoc.exists()).toBe(true);
    });
    
    it('should register a new producer user', async () => {
      // Create test producer
      const userCred = await createTestUser(TEST_PRODUCER);
      
      // Verify user is created
      expect(userCred.user).toBeDefined();
      expect(userCred.user.email).toBe(TEST_PRODUCER.email);
      
      // Check Firestore for user document
      const userDoc = await getDoc(doc(db, 'harmonized_users', userCred.user.uid));
      expect(userDoc.exists()).toBe(true);
      expect(userDoc.data()?.role).toBe('producer');
      
      // Check for service provider profile
      const profileDoc = await getDoc(doc(db, 'user_profiles_service_provider', userCred.user.uid));
      expect(profileDoc.exists()).toBe(true);
      expect(profileDoc.data()?.businessName).toBe(TEST_PRODUCER.businessName);
    });
    
    it('should fail registration with invalid email', async () => {
      // Attempt to create user with invalid email
      const invalidUser = {
        ...TEST_USER,
        email: 'invalid-email'
      };
      
      await expect(createTestUser(invalidUser)).rejects.toThrow();
    });
    
    it('should fail registration with weak password', async () => {
      // Attempt to create user with weak password
      const weakPasswordUser = {
        ...TEST_USER,
        email: `weak-${Date.now()}@example.com`,
        password: '123'
      };
      
      await expect(createTestUser(weakPasswordUser)).rejects.toThrow();
    });
  });
  
  describe('User Authentication', () => {
    let consumerCred: UserCredential;
    let producerCred: UserCredential;
    
    // Set up test users before auth tests
    beforeAll(async () => {
      // Create test users
      consumerCred = await createTestUser(TEST_USER);
      producerCred = await createTestUser(TEST_PRODUCER);
    });
    
    it('should sign in a consumer user with correct credentials', async () => {
      // Sign in with correct credentials
      const userCred = await signInWithEmailAndPassword(
        auth,
        TEST_USER.email,
        TEST_USER.password
      );
      
      // Verify user is signed in
      expect(userCred.user).toBeDefined();
      expect(userCred.user.uid).toBe(consumerCred.user.uid);
    });
    
    it('should sign in a producer user with correct credentials', async () => {
      // Sign in with correct credentials
      const userCred = await signInWithEmailAndPassword(
        auth,
        TEST_PRODUCER.email,
        TEST_PRODUCER.password
      );
      
      // Verify user is signed in
      expect(userCred.user).toBeDefined();
      expect(userCred.user.uid).toBe(producerCred.user.uid);
    });
    
    it('should fail sign in with incorrect password', async () => {
      // Attempt to sign in with incorrect password
      await expect(
        signInWithEmailAndPassword(auth, TEST_USER.email, 'wrong-password')
      ).rejects.toThrow();
    });
    
    it('should fail sign in with non-existent user', async () => {
      // Attempt to sign in with non-existent user
      await expect(
        signInWithEmailAndPassword(auth, 'non-existent@example.com', 'any-password')
      ).rejects.toThrow();
    });
    
    it('should sign out the current user', async () => {
      // Sign in first
      await signInWithEmailAndPassword(auth, TEST_USER.email, TEST_USER.password);
      
      // Verify user is signed in
      expect(auth.currentUser).not.toBeNull();
      
      // Sign out
      await signOut(auth);
      
      // Verify user is signed out
      expect(auth.currentUser).toBeNull();
    });
  });
  
  describe('User Role Verification', () => {
    it('should retrieve correct role for consumer user', async () => {
      // Create test user
      const userCred = await createTestUser(TEST_USER);
      
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'harmonized_users', userCred.user.uid));
      
      // Verify role
      expect(userDoc.data()?.role).toBe('consumer');
    });
    
    it('should retrieve correct role for producer user', async () => {
      // Create test producer
      const userCred = await createTestUser(TEST_PRODUCER);
      
      // Get user document from Firestore
      const userDoc = await getDoc(doc(db, 'harmonized_users', userCred.user.uid));
      
      // Verify role
      expect(userDoc.data()?.role).toBe('producer');
    });
    
    it('should have the correct profile collections linked to user', async () => {
      // Create test users
      const consumerCred = await createTestUser({
        ...TEST_USER,
        email: `consumer-${Date.now()}@example.com`
      });
      
      const producerCred = await createTestUser({
        ...TEST_PRODUCER,
        email: `producer-${Date.now()}@example.com`
      });
      
      // Check if consumer has a tourist profile
      const touristProfileDoc = await getDoc(
        doc(db, 'user_profiles_tourist', consumerCred.user.uid)
      );
      expect(touristProfileDoc.exists()).toBe(true);
      
      // Check if producer has a service provider profile
      const providerProfileDoc = await getDoc(
        doc(db, 'user_profiles_service_provider', producerCred.user.uid)
      );
      expect(providerProfileDoc.exists()).toBe(true);
      
      // Verify profile IDs match user IDs
      expect(touristProfileDoc.data()?.id).toBe(consumerCred.user.uid);
      expect(providerProfileDoc.data()?.providerId).toBe(producerCred.user.uid);
    });
  });
});