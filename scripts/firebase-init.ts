import { initializeApp } from "firebase/app";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";

const firebaseConfig = {
  projectId: "etoile-yachts",
  // We don't need other config options when using emulators
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Connect to Firebase emulator
connectFirestoreEmulator(db, "127.0.0.1", 8080);

export { db };
