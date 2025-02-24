import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator, collection, addDoc, getDocs, deleteDoc } from "firebase/firestore";
import { beforeEach, afterAll } from '@jest/globals';
import { Timestamp } from "firebase/firestore";
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

// Mock data for testing
const mockExperiences: Partial<YachtExperience>[] = [
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

// Clean up function to reset the test database
export async function cleanupDatabase() {
  const collections = ['experience_packages'];

  for (const collectionName of collections) {
    const snapshot = await getDocs(collection(db, collectionName));
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  }
}

// Set up function to initialize test data
export async function setupTestData() {
  const experiencesRef = collection(db, 'experience_packages');
  for (const exp of mockExperiences) {
    await addDoc(experiencesRef, exp);
  }
  console.log('Test data initialized');
}

beforeEach(async () => {
  await cleanupDatabase();
  await setupTestData();
});

afterAll(async () => {
  await cleanupDatabase();
});

export { db, mockExperiences };