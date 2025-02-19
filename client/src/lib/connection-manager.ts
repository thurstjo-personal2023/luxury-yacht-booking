import { db, rtdb } from './firebase';
import { enableNetwork, disableNetwork } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { create } from 'zustand';

interface ConnectionState {
  isOnline: boolean;
  isFirestoreConnected: boolean;
  setOnline: (status: boolean) => void;
  setFirestoreConnected: (status: boolean) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  isOnline: navigator.onLine,
  isFirestoreConnected: true,
  setOnline: (status) => set({ isOnline: status }),
  setFirestoreConnected: (status) => set({ isFirestoreConnected: status }),
}));

export function initializeConnectionManager() {
  const { setOnline, setFirestoreConnected } = useConnectionStore.getState();
  
  // Monitor online/offline status
  const handleOnline = async () => {
    setOnline(true);
    try {
      await enableNetwork(db);
    } catch (error) {
      console.error('Error enabling network:', error);
    }
  };

  const handleOffline = async () => {
    setOnline(false);
    try {
      await disableNetwork(db);
    } catch (error) {
      console.error('Error disabling network:', error);
    }
  };

  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Monitor Firebase connection state
  const connectedRef = ref(rtdb, '.info/connected');
  onValue(connectedRef, (snap) => {
    setFirestoreConnected(!!snap.val());
  });

  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  };
}
