import { auth } from './firebase';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  type User as FirebaseUser 
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
  setUser: (user: UserProfile | null) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
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
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  const profile = createUserProfile(userCredential.user);
  useAuthStore.getState().setUser(profile);
  return profile;
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

export function useAuth() {
  return useAuthStore();
}