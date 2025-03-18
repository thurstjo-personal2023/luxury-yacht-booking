/**
 * Test Utilities
 * 
 * This file provides common test utilities and mock implementations
 * for Firebase-related functionality.
 */

// Mock Document Interface
export interface MockDocument {
  id: string;
  data: any;
  exists: boolean;
  ref: {
    id: string;
    path: string;
    collection: (path: string) => MockCollection;
    update: jest.Mock;
    set: jest.Mock;
  };
  data(): any;
}

// Mock Collection Interface
export interface MockCollection {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
  doc: (id: string) => MockDocument['ref'];
  add: jest.Mock;
  get: () => Promise<{
    docs: MockDocument[];
    empty: boolean;
    size: number;
    forEach: (callback: (doc: MockDocument) => void) => void;
  }>;
  where: (field: string, op: string, value: any) => MockCollection;
  orderBy: (field: string, direction?: 'asc' | 'desc') => MockCollection;
  limit: (limit: number) => MockCollection;
}

// Mock Query Snapshot Interface
export interface MockQuerySnapshot {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
}

// Mock Firestore implementation
export const mockFirestore = {
  collection: jest.fn((path: string) => createMockCollection(path)),
  batch: jest.fn(() => ({
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve())
  })),
  runTransaction: jest.fn((fn: (transaction: any) => Promise<any>) => {
    const transaction = {
      get: jest.fn((docRef: any) => Promise.resolve({
        exists: true,
        data: () => ({}),
        id: docRef.id
      })),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    };
    return fn(transaction);
  })
};

// Mock Storage implementation
export const mockStorage = {
  bucket: jest.fn(() => ({
    file: jest.fn((path: string) => ({
      getSignedUrl: jest.fn(() => Promise.resolve([`https://storage.googleapis.com/${path}`])),
      download: jest.fn(() => Promise.resolve(['file content'])),
      save: jest.fn((content: any) => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve())
    })),
    upload: jest.fn((path: string, options: any) => Promise.resolve()),
    getFiles: jest.fn(() => Promise.resolve([[{ name: 'file1.jpg' }, { name: 'file2.jpg' }]]))
  }))
};

/**
 * Create a mock Firestore document
 */
export function createMockDocument(options: { id: string; data: any; exists?: boolean }): MockDocument {
  const { id, data, exists = true } = options;
  
  const doc = {
    id,
    data,
    exists,
    ref: {
      id,
      path: `mock-collection/${id}`,
      collection: jest.fn((path: string) => createMockCollection(path)),
      update: jest.fn((newData: any) => Promise.resolve()),
      set: jest.fn((newData: any, options?: any) => Promise.resolve())
    },
    data: () => data
  };
  
  return doc;
}

/**
 * Create a mock Firestore collection
 */
export function createMockCollection(path: string, docs: MockDocument[] = []): MockCollection {
  const collection = {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: MockDocument) => void) => docs.forEach(callback),
    doc: jest.fn((id: string) => {
      const existingDoc = docs.find(d => d.id === id);
      if (existingDoc) {
        return existingDoc.ref;
      }
      
      // Create a new document reference if it doesn't exist
      return {
        id,
        path: `${path}/${id}`,
        collection: jest.fn((subPath: string) => createMockCollection(`${path}/${id}/${subPath}`)),
        update: jest.fn((data: any) => Promise.resolve()),
        set: jest.fn((data: any, options?: any) => Promise.resolve())
      };
    }),
    add: jest.fn((data: any) => Promise.resolve({ id: `new-doc-${Date.now()}` })),
    get: jest.fn(() => Promise.resolve({
      docs,
      empty: docs.length === 0,
      size: docs.length,
      forEach: (callback: (doc: MockDocument) => void) => docs.forEach(callback)
    })),
    where: jest.fn(() => collection),
    orderBy: jest.fn(() => collection),
    limit: jest.fn(() => collection)
  };
  
  return collection;
}

/**
 * Create a mock query snapshot
 */
export function createMockQuerySnapshot(docs: MockDocument[]): MockQuerySnapshot {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback: (doc: MockDocument) => void) => docs.forEach(callback)
  };
}

/**
 * Create a mock Firestore timestamp
 */
export function createMockTimestamp(date = new Date()): any {
  return {
    toDate: () => date,
    toMillis: () => date.getTime(),
    valueOf: () => date.getTime(),
    _seconds: Math.floor(date.getTime() / 1000),
    _nanoseconds: (date.getTime() % 1000) * 1000000
  };
}

/**
 * Create a batch of test documents
 */
export function createTestDocuments(count: number, dataFn?: (index: number) => any): MockDocument[] {
  const docs = [];
  
  for (let i = 0; i < count; i++) {
    const data = dataFn ? dataFn(i) : { index: i };
    docs.push(createMockDocument({
      id: `test-doc-${i}`,
      data
    }));
  }
  
  return docs;
}