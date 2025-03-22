/**
 * Type definitions for test utilities
 */

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

export interface MockQuerySnapshot {
  docs: MockDocument[];
  empty: boolean;
  size: number;
  forEach: (callback: (doc: MockDocument) => void) => void;
}

export const mockFirestore: {
  collection: jest.Mock;
};

export const mockStorage: {
  ref: jest.Mock;
  upload: jest.Mock;
  getDownloadURL: jest.Mock;
};

/**
 * Create a mock Firestore document
 */
export function createMockDocument(options: { id: string; data: any; exists?: boolean }): MockDocument;

/**
 * Create a mock Firestore collection
 */
export function createMockCollection(path: string, docs?: MockDocument[]): MockCollection;

/**
 * Create a mock query snapshot
 */
export function createMockQuerySnapshot(docs: MockDocument[]): MockQuerySnapshot;

/**
 * Create a mock Firestore timestamp
 */
export function createMockTimestamp(date?: Date): any;

/**
 * Create a batch of test documents
 */
export function createTestDocuments(count: number, dataFn?: (index: number) => any): MockDocument[];