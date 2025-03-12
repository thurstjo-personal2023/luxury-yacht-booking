import { useEffect, useState } from 'react';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
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
}

export function ConnectionStatus() {
  const [config, setConfig] = useState<EmulatorConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
            <p className="font-semibold">Firebase Emulator Connection</p>
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