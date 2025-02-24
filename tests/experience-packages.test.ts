import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, collection, getDocs, query, where, addDoc, deleteDoc, Timestamp } from "firebase/firestore";
import { beforeEach, afterEach, describe, test, expect } from '@jest/globals';
import type { YachtExperience } from "../shared/firestore-schema";

const firebaseConfig = {
  projectId: "etoile-yachts",
  // We don't need other config options when using emulators
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firestore emulator
connectFirestoreEmulator(db, "127.0.0.1", 8080);

interface Review {
  rating: number;
}

const mockExperiences: YachtExperience[] = [
  {
    package_id: "EXP_YAS_001",
    title: "Yas Marina F1 Sunset Experience",
    description: "Experience the thrill of Formula 1 atmosphere",
    category: "Premium",
    location: {
      latitude: 24.4672,
      longitude: 54.6031,
      address: "Yas Marina, Abu Dhabi, UAE",
      region: "abu-dhabi",
      port_marina: "Yas Marina"
    },
    duration: 4,
    capacity: 12,
    pricing: 3500,
    pricing_model: "Fixed",
    customization_options: [],
    media: [],
    availability_status: true,
    featured: true,
    tags: ["yacht", "luxury", "f1"],
    reviews: [{ rating: 4.8 }],
    created_date: Timestamp.fromDate(new Date()),
    last_updated_date: Timestamp.fromDate(new Date()),
    published_status: true
  },
  {
    package_id: "EXP_DXB_001",
    title: "Dubai Marina Luxury Cruise",
    description: "Luxury cruise experience",
    category: "Premium",
    location: {
      latitude: 25.2048,
      longitude: 55.2708,
      address: "Dubai Marina, Dubai, UAE",
      region: "dubai",
      port_marina: "Dubai Marina"
    },
    duration: 3,
    capacity: 15,
    pricing: 4200,
    pricing_model: "Fixed",
    customization_options: [],
    media: [],
    availability_status: true,
    featured: false,
    tags: ["yacht", "luxury"],
    reviews: [{ rating: 4.2 }],
    created_date: Timestamp.fromDate(new Date()),
    last_updated_date: Timestamp.fromDate(new Date()),
    published_status: true
  }
];

describe('Experience Packages Queries', () => {
  beforeEach(async () => {
    // Clear and populate test data
    const experiencesRef = collection(db, 'experience_packages');

    // Clear existing data
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    // Add test data
    for (const exp of mockExperiences) {
      await addDoc(experiencesRef, exp);
    }
    console.log('Test data initialized');
  });

  afterEach(async () => {
    // Clean up test data
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }
  });

  test('fetchAllPackages returns all experiences', async () => {
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    const experiences = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    expect(experiences.length).toBe(mockExperiences.length);
    experiences.forEach(exp => {
      expect(exp).toHaveProperty('title');
      expect(exp).toHaveProperty('location');
    });
  });

  test('filterByCategory returns only yacht experiences', async () => {
    const filtered = await getDocs(
      query(
        collection(db, 'experience_packages'),
        where('tags', 'array-contains', 'yacht')
      )
    );

    const experiences = filtered.docs.map(doc => doc.data());
    expect(experiences.length).toBeGreaterThan(0);
    experiences.forEach(exp => {
      expect(exp.tags).toContain('yacht');
    });
  });

  test('filterByRegion returns experiences from specified region', async () => {
    const region = 'Dubai';
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    const experiences = snapshot.docs
      .map(doc => doc.data())
      .filter(exp => exp.location.address.includes(region));

    expect(experiences.length).toBeGreaterThan(0);
    experiences.forEach(exp => {
      expect(exp.location.address).toContain(region);
    });
  });

  test('fetchRecommended returns featured or highly rated experiences', async () => {
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    const experiences = snapshot.docs
      .map(doc => doc.data())
      .filter(exp => exp.featured || exp.reviews?.some((r: Review) => r.rating >= 4.5));

    expect(experiences.length).toBeGreaterThan(0);
    experiences.forEach(exp => {
      const isRecommended = exp.featured || exp.reviews?.some((r: Review) => r.rating >= 4.5);
      expect(isRecommended).toBe(true);
    });
  });

  test('handles empty results gracefully', async () => {
    // Clear all data
    const snapshot = await getDocs(collection(db, 'experience_packages'));
    for (const doc of snapshot.docs) {
      await deleteDoc(doc.ref);
    }

    const emptySnapshot = await getDocs(collection(db, 'experience_packages'));
    expect(emptySnapshot.empty).toBe(true);
  });
});