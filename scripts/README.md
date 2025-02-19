# Data Migration Scripts

These scripts help migrate data from PostgreSQL to Firebase Data Connect.

## Export Script (export-to-firebase.ts)

This script exports data from PostgreSQL and formats it for Firebase Data Connect.

To run:
```bash
npm run tsx scripts/export-to-firebase.ts
```

The script will create two files in the `exports` directory:
- `users.json`: Contains all user data
- `yachts.json`: Contains all yacht data

## Import Script (import-to-firebase.ts)

This script imports the exported data into Firebase Data Connect.

To run:
```bash
npm run tsx scripts/import-to-firebase.ts
```

Make sure the Firebase Data Connect emulator is running before executing the import script.

## Data Format

### Users Collection
```typescript
{
  userId: string;
  email: string;
  role: string;
  name: string;
  phone: string;
  points: number;
  emailVerified: boolean;
  createdAt: string;  // ISO date string
  updatedAt: string;  // ISO date string
}
```

### Yachts Collection
```typescript
{
  yachtId: string;
  name: string;
  description: string;
  price: number;
  capacity: number;
  producerId: string;
  imageUrl: string;
  location: string;
  activities: string[];
  duration: string;
  availableFrom: string;  // ISO date string
  availableTo: string;    // ISO date string
}
```
