# Creating the Required Firestore Index

To fix the booking query issue, we need to create a composite index on the `bookings` collection. Firebase is returning an error because the query requires an index on the `userId` and `createdAt` fields.

## Steps to Create the Index:

1. Use this direct link to create the required index in the Firebase Console:
   [Create Bookings Index](https://console.firebase.google.com/v1/r/project/etoile-yachts/firestore/indexes?create_composite=Ck5wcm9qZWN0cy9ldG9pbGUteWFjaHRzL2RhdGFiYXNlcy8oZGVmYXVsdCkvY29sbGVjdGlvbkdyb3Vwcy9ib29raW5ncy9pbmRleGVzL18QARoKCgZ1c2VySWQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC)

2. Alternatively, create the index manually in the Firebase Console:
   - Navigate to [Firebase Console](https://console.firebase.google.com)
   - Select the "etoile-yachts" project
   - Go to "Firestore Database" in the left sidebar
   - Click on the "Indexes" tab
   - Click "Add Index"
   - Fill in the following details:
     - Collection: `bookings`
     - Fields to index:
       1. Field path: `userId`, Order: Ascending
       2. Field path: `createdAt`, Order: Descending
     - Click "Create"

3. The index will take a few minutes to build. Once it's complete, the bookings query will work correctly.

## Index Definition (already added to firestore.indexes.json)

```json
{
  "collectionGroup": "bookings",
  "queryScope": "COLLECTION",
  "fields": [
    {
      "fieldPath": "userId",
      "order": "ASCENDING"
    },
    {
      "fieldPath": "createdAt",
      "order": "DESCENDING"
    }
  ]
}
```

After creating this index, the "My Bookings" tab should display bookings correctly.