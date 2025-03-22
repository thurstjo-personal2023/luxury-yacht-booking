/**
 * Type augmentations for Firebase
 * 
 * This file adds missing types to Firebase classes for testing purposes.
 * These augmentations allow our tests to work without TypeScript errors.
 */

import { Firestore, DocumentData, Query, DocumentReference } from 'firebase/firestore';

declare module 'firebase/firestore' {
  interface Firestore {
    collection(path: string): any;
    batch(): {
      set(docRef: any, data: any): any;
      update(docRef: any, data: any): any;
      delete(docRef: any): any;
      commit(): Promise<void>;
    };
  }
  
  interface DocumentReference<T = DocumentData> {
    collection(collectionPath: string): any;
  }
  
  interface Query<T = DocumentData> {
    get(): Promise<any>;
  }
}

// Augment Admin SDK types (for admin testing)
declare module 'firebase-admin/firestore' {
  interface Firestore {
    collection(path: string): any;
    batch(): {
      set(docRef: any, data: any): any;
      update(docRef: any, data: any): any;
      delete(docRef: any): any;
      commit(): Promise<void>;
    };
  }
  
  interface DocumentReference<T = DocumentData> {
    collection(collectionPath: string): any;
  }
}

// Fix common duplicate identifier errors in test utilities
declare module 'tests/test-utils' {
  export interface MockDocument {
    id: string;
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
}