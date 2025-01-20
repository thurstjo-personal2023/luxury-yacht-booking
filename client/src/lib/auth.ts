import { auth } from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser,
  onAuthStateChanged 
} from 'firebase/auth';
import { create } from 'zustand';

export type UserRole = 'consumer' | 'producer' | 'partner';

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  displayName?: string;
}

interface AuthState {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user }),
  setLoading: (isLoading) => set({ isLoading }),
}));

function createUserProfile(firebaseUser: FirebaseUser, role?: UserRole): UserProfile {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email!,
    role: role || 'consumer',
    displayName: firebaseUser.displayName || undefined,
  };
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const profile = createUserProfile(userCredential.user);
    useAuthStore.getState().setUser(profile);
    return profile;
  } catch (error: any) {
    // Map Firebase Auth emulator specific error messages to user-friendly messages
    if (error.code === 'auth/wrong-password') {
      throw new Error('Invalid password. Please try again.');
    } else if (error.code === 'auth/user-not-found') {
      throw new Error('No account found with this email.');
    } else if (error.code === 'auth/invalid-credential') {
      throw new Error('Invalid credentials. Please try again.');
    }
    throw error;
  }
}

export async function signUpWithEmail(email: string, password: string, role: UserRole) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  const profile = createUserProfile(userCredential.user, role);
  useAuthStore.getState().setUser(profile);
  return profile;
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  const userCredential = await signInWithPopup(auth, provider);
  const profile = createUserProfile(userCredential.user);
  useAuthStore.getState().setUser(profile);
  return profile;
}

export async function signOut() {
  await firebaseSignOut(auth);
  useAuthStore.getState().setUser(null);
}

// Initialize auth state listener
onAuthStateChanged(auth, (firebaseUser) => {
  useAuthStore.getState().setLoading(false);
  if (firebaseUser) {
    const profile = createUserProfile(firebaseUser);
    useAuthStore.getState().setUser(profile);
  } else {
    useAuthStore.getState().setUser(null);
  }
});

export function useAuth() {
  return useAuthStore();
}