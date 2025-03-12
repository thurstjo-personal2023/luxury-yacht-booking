/**
 * Test Producer API Script
 * 
 * This script verifies the functionality of producer-related API endpoints
 * by making direct HTTP requests and checking responses.
 */

import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import fs from 'fs';
import path from 'path';

// Initialize Firebase Admin with minimal config for emulators
process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8080';
process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';

const app = initializeApp({ projectId: 'etoile-yachts-emulator' });
const auth = getAuth(app);
const db = getFirestore(app);

// Constants for API testing
const API_BASE_URL = 'http://0.0.0.0:5000';
const TEST_EMAIL = 'producer@example.com';
const TEST_PASSWORD = 'testpass123';
const PRODUCER_ROLE = 'producer';

// Helper to create a test user if needed
async function createTestUserIfNeeded() {
  try {
    console.log(`Looking for test user with email: ${TEST_EMAIL}`);
    
    // Check if user exists in auth
    try {
      const userRecord = await auth.getUserByEmail(TEST_EMAIL);
      console.log(`✓ Test user exists in Auth with UID: ${userRecord.uid}`);
      return userRecord.uid;
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        console.log('Test user does not exist in Auth, creating...');
        
        // Create the user in Auth
        const userRecord = await auth.createUser({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          displayName: 'Test Producer',
          emailVerified: true
        });
        
        console.log(`✓ Created test user in Auth with UID: ${userRecord.uid}`);
        
        // Set custom claims to make user a producer
        await auth.setCustomUserClaims(userRecord.uid, {
          role: PRODUCER_ROLE
        });
        
        console.log(`✓ Set custom claims for user: role=${PRODUCER_ROLE}`);
        
        return userRecord.uid;
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error creating/checking test user:', error);
    throw error;
  }
}

// Create user profile in Firestore
async function createUserProfile(uid) {
  try {
    // Check if user exists in harmonized_users collection
    const userDoc = await db.collection('harmonized_users').doc(uid).get();
    
    if (userDoc.exists) {
      console.log(`✓ User profile exists in harmonized_users: ${uid}`);
    } else {
      console.log(`Creating user profile in harmonized_users: ${uid}`);
      
      // Create user profile
      await db.collection('harmonized_users').doc(uid).set({
        id: uid,
        userId: uid,
        name: 'Test Producer',
        email: TEST_EMAIL,
        phone: '1234567890',
        role: PRODUCER_ROLE,
        producerId: uid,
        providerId: uid,
        emailVerified: true,
        points: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        _standardized: true,
        _standardizedVersion: 1
      });
      
      console.log(`✓ Created user profile in harmonized_users: ${uid}`);
    }
    
    // Check if user exists in service_provider_profiles collection
    const spDoc = await db.collection('user_profiles_service_provider').doc(uid).get();
    
    if (spDoc.exists) {
      console.log(`✓ Provider profile exists: ${uid}`);
    } else {
      console.log(`Creating provider profile: ${uid}`);
      
      // Create service provider profile
      await db.collection('user_profiles_service_provider').doc(uid).set({
        providerId: uid,
        businessName: 'Test Producer Business',
        contactInformation: {
          email: TEST_EMAIL,
          phone: '1234567890',
          address: 'Test Address'
        },
        profilePhoto: '',
        servicesOffered: ['Yacht Rentals', 'Water Sports'],
        certifications: ['Certified Yacht Captain'],
        ratings: 4.5,
        tags: ['premium', 'family-friendly'],
        lastUpdated: new Date()
      });
      
      console.log(`✓ Created provider profile: ${uid}`);
    }
    
    return uid;
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
}

// Create test yachts for the producer
async function createTestYachts(producerId, count = 2) {
  try {
    console.log(`Creating ${count} test yachts for producer: ${producerId}`);
    
    const yachtCollection = db.collection('unified_yacht_experiences');
    
    // Check if producer already has yachts
    const existingYachtsSnapshot = await yachtCollection
      .where('producerId', '==', producerId)
      .get();
    
    if (!existingYachtsSnapshot.empty) {
      console.log(`✓ Producer already has ${existingYachtsSnapshot.size} yachts`);
      return existingYachtsSnapshot.size;
    }
    
    // Create new test yachts
    const batch = db.batch();
    
    for (let i = 0; i < count; i++) {
      const yachtId = `test-yacht-${producerId}-${i}`;
      const yachtRef = yachtCollection.doc(yachtId);
      
      batch.set(yachtRef, {
        id: yachtId,
        title: `Test Yacht ${i+1}`,
        description: `Test yacht for producer ${producerId}`,
        category: 'Luxury',
        yachtType: 'Motor',
        capacity: 10 + i,
        duration: 4,
        pricing: 1000 + (i * 500),
        pricingModel: 'Fixed',
        isAvailable: true,
        isFeatured: i === 0, // First yacht is featured
        isPublished: true,
        customizationOptions: [],
        media: [
          {
            type: 'image',
            url: 'https://example.com/yacht.jpg'
          }
        ],
        location: {
          address: 'Dubai Marina',
          latitude: 25.0657,
          longitude: 55.1302,
          region: 'dubai',
          portMarina: 'Dubai Marina'
        },
        tags: ['luxury', 'family-friendly'],
        producerId: producerId,
        providerId: producerId,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    await batch.commit();
    console.log(`✓ Created ${count} test yachts for producer: ${producerId}`);
    return count;
  } catch (error) {
    console.error('Error creating test yachts:', error);
    throw error;
  }
}

// Get a custom token for the test user
async function getCustomToken(uid) {
  try {
    console.log(`Generating custom token for user: ${uid}`);
    const customToken = await auth.createCustomToken(uid, { role: PRODUCER_ROLE });
    console.log(`✓ Generated custom token: ${customToken.substring(0, 20)}...`);
    return customToken;
  } catch (error) {
    console.error('Error generating custom token:', error);
    throw error;
  }
}

// Test producer yachts endpoint
async function testProducerYachtsEndpoint(token) {
  try {
    console.log('\n=== Testing Producer Yachts Endpoint ===');
    console.log(`Making request to: ${API_BASE_URL}/api/producer/yachts`);
    
    const response = await fetch(`${API_BASE_URL}/api/producer/yachts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data && data.yachts && Array.isArray(data.yachts)) {
        console.log(`✓ Found ${data.yachts.length} yachts in the response`);
        console.log(`✓ Pagination info: page ${data.pagination.currentPage}/${data.pagination.totalPages}, ${data.pagination.totalCount} total yachts`);
        return true;
      } else {
        console.error('✗ Response data format is incorrect');
        return false;
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error testing producer yachts endpoint:', error);
    return false;
  }
}

// Test producer add-ons endpoint
async function testProducerAddOnsEndpoint(token) {
  try {
    console.log('\n=== Testing Producer Add-Ons Endpoint ===');
    console.log(`Making request to: ${API_BASE_URL}/api/producer/addons`);
    
    const response = await fetch(`${API_BASE_URL}/api/producer/addons`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      const data = await response.json();
      console.log('Response data:', JSON.stringify(data, null, 2));
      
      if (data && data.addons && Array.isArray(data.addons)) {
        console.log(`✓ Found ${data.addons.length} add-ons in the response`);
        console.log(`✓ Pagination info: page ${data.pagination.currentPage}/${data.pagination.totalPages}, ${data.pagination.totalCount} total add-ons`);
        return true;
      } else {
        console.error('✗ Response data format is incorrect');
        return false;
      }
    } else {
      try {
        const errorText = await response.text();
        console.error('Error response body:', errorText);
      } catch (e) {
        console.error('Could not read error response body');
      }
      
      return false;
    }
  } catch (error) {
    console.error('Error testing producer add-ons endpoint:', error);
    return false;
  }
}

// Main function
async function main() {
  try {
    console.log('=== Producer API Test Script ===');
    
    // Create test user
    const uid = await createTestUserIfNeeded();
    
    // Create user profile
    await createUserProfile(uid);
    
    // Create test yachts
    await createTestYachts(uid);
    
    // Get custom token
    const token = await getCustomToken(uid);
    
    // Test producer endpoints
    const yachtsResult = await testProducerYachtsEndpoint(token);
    const addOnsResult = await testProducerAddOnsEndpoint(token);
    
    // Summary
    console.log('\n=== Test Results ===');
    console.log(`Producer Yachts Endpoint: ${yachtsResult ? '✓ PASS' : '✗ FAIL'}`);
    console.log(`Producer Add-Ons Endpoint: ${addOnsResult ? '✓ PASS' : '✗ FAIL'}`);
    console.log('===========================');
    
    process.exit(0);
  } catch (error) {
    console.error('Test script error:', error);
    process.exit(1);
  }
}

// Run the main function
main();