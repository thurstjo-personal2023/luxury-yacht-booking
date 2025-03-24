/**
 * Simple Test Setup
 * 
 * This is a minimal setup file for simplified tests that don't need 
 * a full Firebase emulator environment.
 */

import { jest } from '@jest/globals';

// Mock Firebase Auth
jest.mock('firebase/auth', () => {
  return {
    getAuth: jest.fn(),
    initializeAuth: jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn(),
      signInWithEmailAndPassword: jest.fn().mockResolvedValue({
        user: { uid: 'test-uid', email: 'test@example.com' }
      })
    })),
    signInWithEmailAndPassword: jest.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    }),
    createUserWithEmailAndPassword: jest.fn().mockResolvedValue({
      user: { uid: 'test-uid', email: 'test@example.com' }
    }),
    connectAuthEmulator: jest.fn(),
    signOut: jest.fn().mockResolvedValue(undefined)
  };
});

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => {
  return {
    getFirestore: jest.fn(),
    initializeFirestore: jest.fn(() => ({})),
    connectFirestoreEmulator: jest.fn(),
    doc: jest.fn().mockReturnValue({ id: 'test-doc-id' }),
    getDoc: jest.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({}),
      id: 'test-doc-id'
    }),
    setDoc: jest.fn().mockResolvedValue(undefined),
    updateDoc: jest.fn().mockResolvedValue(undefined),
    collection: jest.fn().mockReturnValue({ id: 'test-collection' }),
    addDoc: jest.fn().mockResolvedValue({ id: 'test-doc-id' }),
    serverTimestamp: jest.fn().mockReturnValue({ _seconds: 0, _nanoseconds: 0 }),
    Timestamp: jest.fn().mockImplementation((seconds, nanoseconds) => ({
      seconds,
      nanoseconds
    })),
    getDocs: jest.fn().mockResolvedValue({
      docs: [],
      empty: true,
      size: 0
    })
  };
});

// Mock Firebase App
jest.mock('firebase/app', () => {
  return {
    initializeApp: jest.fn().mockReturnValue({
      name: 'test-app'
    }),
    deleteApp: jest.fn().mockResolvedValue(undefined)
  };
});

// Mock Express
jest.mock('express', () => {
  const app = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    use: jest.fn()
  };
  
  const express = jest.fn(() => app);
  express.json = jest.fn(() => jest.fn());
  express.urlencoded = jest.fn(() => jest.fn());
  
  return express;
});

// Mock speakeasy for TOTP
jest.mock('speakeasy', () => {
  return {
    generateSecret: jest.fn().mockReturnValue({
      base32: 'test-base32-secret',
      otpauth_url: 'otpauth://totp/test'
    }),
    totp: {
      generate: jest.fn().mockReturnValue('123456'),
      verify: jest.fn().mockImplementation(({ token }) => token === '123456')
    }
  };
});