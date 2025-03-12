import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck, ShieldQuestion } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface EmulatorConfig {
  hosts: {
    firestore: string;
    auth: string;
    storage: string;
    functions: string;
    rtdb: string;
  };
  connected: boolean;
  timestamp: number;
  status?: {
    firestore?: boolean;
    auth?: boolean;
    storage?: boolean;
    functions?: boolean;
    rtdb?: boolean;
  }
}

export function ConnectionStatus() {
  const [config, setConfig] = useState<EmulatorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [clientStatus, setClientStatus] = useState<{
    firestore: boolean;
    auth: boolean;
    storage: boolean;
    functions: boolean;
    rtdb: boolean;
  }>({
    firestore: false,
    auth: false,
    storage: false,
    functions: false,
    rtdb: false
  });

  // Check for known Firebase connection errors in the console
  useEffect(() => {
    const checkConsoleForErrors = () => {
      // Use a regex pattern to check for typical Firebase connection errors
      const hasFirestoreError = (window as any).__FIREBASE_ERRORS?.some?.(
        (err: any) => err?.toString?.().includes('Firestore') && err?.code === 'failed-precondition'
      );
      
      if (hasFirestoreError) {
        console.warn('[ConnectionStatus] Detected Firebase connection errors in console');
        setClientStatus(prev => ({ ...prev, firestore: false }));
      }
    };

    // Check immediately and then every 5 seconds
    checkConsoleForErrors();
    const interval = setInterval(checkConsoleForErrors, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/emulator-config');
        if (!response.ok) {
          throw new Error(`Failed to fetch emulator config: ${response.status}`);
        }
        const data = await response.json();
        setConfig(data);
        
        // Try to detect client-side connection status
        if (data && data.connected) {
          // Gather connection status
          const clientConnectionStatus = {
            firestore: true, // Assume connections are working
            auth: true,
            storage: true,
            functions: true,
            rtdb: true
          };
          
          // Check for known error patterns in the global window object
          const globalErrors = (window as any).__FIREBASE_ERRORS || [];
          if (Array.isArray(globalErrors) && globalErrors.length > 0) {
            // Check for Firestore errors
            if (globalErrors.some((err: any) => 
                String(err).includes('Firestore') && String(err).includes('failed'))) {
              clientConnectionStatus.firestore = false;
            }
            
            // Check for RTDB errors
            if (globalErrors.some((err: any) => 
                String(err).includes('database') && String(err).includes('failed'))) {
              clientConnectionStatus.rtdb = false;
            }
          }
          
          setClientStatus(clientConnectionStatus);
        }
        
        setError(null);
      } catch (err) {
        console.error('Error fetching emulator config:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    
    // Refresh config every 30 seconds
    const interval = setInterval(fetchConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Badge variant="outline" className="gap-1 h-7">
        <Shield className="h-3.5 w-3.5 text-yellow-500" />
        <span className="text-xs">Checking connection...</span>
      </Badge>
    );
  }

  if (error || !config) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="destructive" className="gap-1 h-7">
              <ShieldAlert className="h-3.5 w-3.5" />
              <span className="text-xs">Emulator Error</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{error || 'Failed to get emulator configuration'}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Extract just the hostname part for display, without port
  const firestoreHost = config.hosts.firestore.split(':')[0];
  
  // Determine connection status from a combination of server and client checks
  const allConnected = config.connected;
  const hasConnectionIssues = !allConnected || 
    !clientStatus.firestore || 
    !clientStatus.auth || 
    !clientStatus.rtdb;

  // Render the appropriate badge based on connection status
  if (hasConnectionIssues) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" className="gap-1 h-7 bg-yellow-50 border-yellow-200">
              <ShieldQuestion className="h-3.5 w-3.5 text-yellow-600" />
              <span className="text-xs text-yellow-700">Emulator: Limited</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <p className="font-semibold text-yellow-600">Limited Emulator Connection</p>
              <p className="text-xs">Some Firebase emulators might be unavailable.</p>
              <ul className="text-xs">
                <li>Firestore: {config.hosts.firestore}</li>
                <li>Auth: {config.hosts.auth}</li>
                <li>Storage: {config.hosts.storage}</li>
                <li>Functions: {config.hosts.functions}</li>
              </ul>
              <p className="text-xs text-yellow-600">
                Configure Firebase emulators locally and use <code>localhost.run</code> or <code>ngrok</code> for tunneling.
              </p>
              <p className="text-xs text-muted-foreground">
                Last updated: {new Date(config.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Connected successfully
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant="outline" className="gap-1 h-7 bg-green-50 border-green-200">
            <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
            <span className="text-xs text-green-700">Emulator: {firestoreHost}</span>
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold text-green-600">Firebase Emulator Connected</p>
            <ul className="text-xs">
              <li>Firestore: {config.hosts.firestore}</li>
              <li>Auth: {config.hosts.auth}</li>
              <li>Storage: {config.hosts.storage}</li>
              <li>Functions: {config.hosts.functions}</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Last updated: {new Date(config.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}