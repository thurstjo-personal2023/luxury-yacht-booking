/**
 * Jest setup file for Node.js testing environment (server tests)
 */

// Import any server-specific mocks or setup here

// Set environment variables for testing
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/test_db';

// Mocking Firebase Admin for server tests
jest.mock('firebase-admin', () => {
  const auth = {
    verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user-id', email: 'test@example.com' })),
    createUser: jest.fn(),
    updateUser: jest.fn(),
    getUserByEmail: jest.fn(),
    setCustomUserClaims: jest.fn(),
  };

  const firestore = () => ({
    collection: jest.fn((collectionPath) => ({
      doc: jest.fn((docId) => ({
        get: jest.fn(() => Promise.resolve({
          exists: true,
          data: () => ({ id: docId }),
          id: docId,
        })),
        set: jest.fn(() => Promise.resolve()),
        update: jest.fn(() => Promise.resolve()),
        delete: jest.fn(() => Promise.resolve())
      })),
      add: jest.fn(() => Promise.resolve({ id: 'new-doc-id' })),
      where: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({
          docs: [],
          empty: true,
          forEach: jest.fn()
        })),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
      })),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      get: jest.fn(() => Promise.resolve({
        docs: [],
        empty: true,
        forEach: jest.fn()
      })),
    })),
    batch: jest.fn(() => ({
      set: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      commit: jest.fn(() => Promise.resolve()),
    })),
    runTransaction: jest.fn((transactionFn) => 
      Promise.resolve(transactionFn({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      }))
    ),
  });

  return {
    apps: [],
    initializeApp: jest.fn(() => ({})),
    credential: {
      cert: jest.fn(),
      applicationDefault: jest.fn(),
    },
    auth: () => auth,
    firestore,
    storage: () => ({
      bucket: jest.fn(() => ({
        file: jest.fn(() => ({
          getSignedUrl: jest.fn(() => Promise.resolve(['https://storage.example.com/test.jpg'])),
          save: jest.fn(() => Promise.resolve()),
          delete: jest.fn(() => Promise.resolve()),
        })),
        upload: jest.fn(() => Promise.resolve()),
      })),
    }),
  };
});

// Mock Firestore FieldValue
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => new Date()),
    arrayUnion: jest.fn((...elements) => elements),
    arrayRemove: jest.fn((...elements) => elements),
    increment: jest.fn((n) => n),
  },
  Timestamp: {
    now: jest.fn(() => ({
      toDate: jest.fn(() => new Date()),
      seconds: Math.floor(Date.now() / 1000),
      nanoseconds: 0
    })),
    fromDate: jest.fn((date) => ({
      toDate: jest.fn(() => date),
      seconds: Math.floor(date.getTime() / 1000),
      nanoseconds: 0
    }))
  }
}));