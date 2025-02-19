import { useConnectionStore } from '@/lib/connection-manager';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

export function ConnectionStatus() {
  const { isOnline, isFirestoreConnected } = useConnectionStore();

  if (isOnline && isFirestoreConnected) {
    return null;
  }

  return (
    <Alert variant="destructive" className="fixed bottom-4 right-4 w-auto max-w-md animate-in fade-in slide-in-from-bottom-4">
      <Loader2 className="h-4 w-4 animate-spin" />
      <AlertDescription>
        {!isOnline 
          ? 'You are offline. Reconnecting...' 
          : !isFirestoreConnected 
            ? 'Connection to server lost. Retrying...'
            : 'Connecting to server...'}
      </AlertDescription>
    </Alert>
  );
}