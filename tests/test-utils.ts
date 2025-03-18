/**
 * Common test utilities for the Etoile Yachts project
 */

// Types for mock documents and collections
export interface MockDocument {
  id: string;
  data: any;
  exists: boolean;
  ref: {
    id: string;
    path: string;
    collection: (path: string) => MockCollection;
    update: (data: any) => Promise<void>;
    set: (data: any, options?: any) => Promise<void>;
  };
}

export interface MockCollection {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
  doc: (id: string) => MockDocument['ref'];
  add: (data: any) => Promise<{ id: string }>;
  get: () => Promise<{ docs: MockDocument[]; empty: boolean; size: number; forEach: (callback: (doc: MockDocument) => void) => void; }>;
  where: (field: string, op: string, value: any) => MockCollection;
  orderBy: (field: string, direction?: 'asc' | 'desc') => MockCollection;
  limit: (limit: number) => MockCollection;
}

export interface MockQuerySnapshot {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
}

// Mock Firestore implementation
export const mockFirestore = {
  collection: (path: string) => createMockCollection(path),
  batch: () => ({
    set: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    commit: jest.fn().mockResolvedValue(undefined),
  }),
  runTransaction: jest.fn((fn) => {
    return Promise.resolve(fn({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    }));
  }),
};

// Mock Storage implementation
export const mockStorage = {
  bucket: (name?: string) => ({
    file: (path: string) => ({
      getSignedUrl: jest.fn(() => Promise.resolve(['https://storage.example.com/test.jpg'])),
      save: jest.fn((data: any, options: any) => Promise.resolve()),
      delete: jest.fn(() => Promise.resolve()),
      exists: jest.fn(() => Promise.resolve([true])),
    }),
    upload: jest.fn((path: string, options: any) => Promise.resolve()),
    getFiles: jest.fn(() => Promise.resolve([[{ name: 'test.jpg' }]])),
  }),
};

// Factory function to create mock documents
export function createMockDocument(options: { id: string; data: any; exists?: boolean }): MockDocument {
  const { id, data, exists = true } = options;
  const path = `mock/collection/${id}`;
  
  return {
    id,
    data: { ...data },
    exists,
    ref: {
      id,
      path,
      collection: (collectionPath: string) => createMockCollection(`${path}/${collectionPath}`),
      update: jest.fn((updateData) => {
        Object.assign(data, updateData);
        return Promise.resolve();
      }),
      set: jest.fn((newData, options = {}) => {
        if (options.merge) {
          Object.assign(data, newData);
        } else {
          Object.keys(data).forEach(key => {
            delete data[key];
          });
          Object.assign(data, newData);
        }
        return Promise.resolve();
      }),
    },
  };
}

// Factory function to create mock collections
export function createMockCollection(path: string, docs: MockDocument[] = []): MockCollection {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback),
    doc: (id: string) => {
      const existingDoc = docs.find(d => d.id === id);
      if (existingDoc) {
        return existingDoc.ref;
      }
      
      const newDoc = createMockDocument({ id, data: {}, exists: false });
      docs.push(newDoc);
      return newDoc.ref;
    },
    add: jest.fn((data) => {
      const id = `auto-id-${Date.now()}`;
      const newDoc = createMockDocument({ id, data });
      docs.push(newDoc);
      return Promise.resolve({ id });
    }),
    get: jest.fn(() => {
      return Promise.resolve({
        docs,
        empty: docs.length === 0,
        size: docs.length,
        forEach: (callback: (doc: MockDocument) => void) => docs.forEach(callback),
      });
    }),
    where: jest.fn(() => createMockCollection(path, docs)),
    orderBy: jest.fn(() => createMockCollection(path, docs)),
    limit: jest.fn(() => createMockCollection(path, docs)),
  };
}

// Create a mock query snapshot
export function createMockQuerySnapshot(docs: MockDocument[]): MockQuerySnapshot {
  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => docs.forEach(callback),
  };
}

// Helper to create a mock Firestore timestamp
export function createMockTimestamp(date = new Date()): any {
  return {
    toDate: () => date,
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
    isEqual: (other: any) => other?.seconds === Math.floor(date.getTime() / 1000),
  };
}

// Helper to create an array of test documents
export function createTestDocuments(count: number, dataFn?: (index: number) => any): MockDocument[] {
  return Array.from({ length: count }).map((_, i) => {
    const id = `test-doc-${i}`;
    const data = dataFn ? dataFn(i) : { name: `Test ${i}`, value: i };
    return createMockDocument({ id, data });
  });
}