# TypeScript Testing Configuration for Firebase

This document explains how we handle TypeScript type issues when testing with Firebase.

## Common TypeScript Issues with Firebase in Tests

When testing with Firebase, especially with the Firebase emulators, you may encounter TypeScript errors like:

```
Property 'collection' does not exist on type 'Firestore'.
Property 'batch' does not exist on type 'Firestore'.
```

These errors occur because the TypeScript definitions for Firebase don't fully reflect the runtime capabilities when using the emulator or certain Firebase versions.

## Our Approach to Resolving These Issues

Rather than implementing complex TypeScript overrides or module augmentations, we've taken a pragmatic approach:

1. We document the known issues
2. We use `//@ts-ignore` comments in test files when necessary
3. We've created a basic type augmentation file (see below)

The rationale behind this approach is that test code doesn't ship to production, so type safety in tests is less critical than in production code.

## Type Augmentation File

We've created a basic type augmentation file at `tests/types/firebase-augmentation.ts`:

```typescript
/**
 * Type augmentations for Firebase
 * 
 * This file adds missing types to Firebase classes for testing purposes.
 * These augmentations allow our tests to work without TypeScript errors.
 */

import { Firestore, DocumentData, Query } from 'firebase/firestore';

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
```

## Using `//@ts-ignore` Comments

When TypeScript errors persist despite our augmentations, we use `//@ts-ignore` comments. While not ideal, this approach allows us to focus on test functionality rather than type definitions.

Example usage:
```typescript
// @ts-ignore - Firestore collection method not recognized by TypeScript
const usersCollection = db.collection('users');
```

## Best Practices for Test Files

1. Import the augmentation file at the top of your test file:
   ```typescript
   import '../types/firebase-augmentation';
   ```

2. Use explicit types for Firebase objects when destructuring:
   ```typescript
   const { collection, doc, getDoc } = firestore as any;
   ```

3. When creating mock objects, type them properly:
   ```typescript
   const mockDoc = { exists: () => true, data: () => ({ name: 'Test' }) } as any;
   ```

4. For persistent issues, use `//@ts-ignore` with a clear comment explaining why

## Future Improvements

We may consider more robust type augmentation solutions in the future, such as:

1. Creating a more comprehensive type declaration file
2. Using a third-party package that provides better Firebase type definitions
3. Creating wrapper functions that handle the type casting internally

For now, our pragmatic approach allows us to move forward with testing while acknowledging the type system limitations.