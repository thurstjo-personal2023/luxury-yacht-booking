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

export async function signInWithEmail(email: string, password: string) {
  // TODO: Implement actual authentication later
  const mockUser: UserProfile = {
    id: '1',
    email,
    role: 'consumer',
    displayName: email.split('@')[0],
  };
  useAuthStore.getState().setUser(mockUser);
  return mockUser;
}

export async function signUpWithEmail(email: string, password: string, role: UserRole) {
  // TODO: Implement actual registration later
  const mockUser: UserProfile = {
    id: '1',
    email,
    role,
    displayName: email.split('@')[0],
  };
  useAuthStore.getState().setUser(mockUser);
  return mockUser;
}

export async function signInWithGoogle() {
  // TODO: Implement Google authentication later
  const mockUser: UserProfile = {
    id: '1',
    email: 'google@example.com',
    role: 'consumer',
    displayName: 'Google User',
  };
  useAuthStore.getState().setUser(mockUser);
  return mockUser;
}

export async function signOut() {
  useAuthStore.getState().setUser(null);
}

export function useAuth() {
  return useAuthStore();
}