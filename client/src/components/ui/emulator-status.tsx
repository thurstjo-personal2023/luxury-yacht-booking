import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { EMULATOR_CONFIG } from '@/lib/emulators';

interface EmulatorStatus {
  name: string;
  port: number;
  connected: boolean;
  url: string;
}

export function EmulatorStatusWidget() {
  const [statuses, setStatuses] = useState<EmulatorStatus[]>([]);
  const [checking, setChecking] = useState(false);

  const checkEmulatorConnections = async () => {
    setChecking(true);
    const host = 'localhost';

    try {
      const emulators: EmulatorStatus[] = [
        { 
          name: 'Auth', 
          port: EMULATOR_CONFIG.auth.port,
          connected: false,
          url: `http://${host}:${EMULATOR_CONFIG.auth.port}`
        },
        { 
          name: 'Firestore', 
          port: EMULATOR_CONFIG.firestore.port,
          connected: false,
          url: `http://${host}:${EMULATOR_CONFIG.firestore.port}`
        },
        { 
          name: 'Functions', 
          port: EMULATOR_CONFIG.functions.port,
          connected: false,
          url: `http://${host}:${EMULATOR_CONFIG.functions.port}`
        },
        { 
          name: 'Storage', 
          port: EMULATOR_CONFIG.storage.port,
          connected: false,
          url: `http://${host}:${EMULATOR_CONFIG.storage.port}`
        }
      ];

      // Check each emulator connection
      const statusChecks = await Promise.all(
        emulators.map(async (emulator) => {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000);

            const response = await fetch(emulator.url, { 
              method: 'HEAD',
              signal: controller.signal
            }).catch(() => null);

            clearTimeout(timeoutId);

            return {
              ...emulator,
              connected: response !== null
            };
          } catch (error) {
            console.log(`Error checking ${emulator.name} emulator:`, error);
            return {
              ...emulator,
              connected: false
            };
          }
        })
      );

      setStatuses(statusChecks);
    } catch (error) {
      console.error('Error checking emulator connections:', error);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkEmulatorConnections();
    // Set up periodic checks every 30 seconds
    const interval = setInterval(checkEmulatorConnections, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="w-[300px] shadow-lg fixed bottom-4 right-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Firebase Emulators</CardTitle>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={checkEmulatorConnections}
            disabled={checking}
          >
            <RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription className="text-xs">
          Local emulator connection status
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-2">
        {statuses.map((status) => (
          <div key={status.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {status.connected ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <span className="text-sm">{status.name}</span>
            </div>
            <Badge variant={status.connected ? "default" : "destructive"}>
              :{status.port}
            </Badge>
          </div>
        ))}
        <div className="mt-2 text-xs text-muted-foreground">
          UI: <a 
            href={`http://localhost:${EMULATOR_CONFIG.ui.port}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:underline"
          >
            http://localhost:{EMULATOR_CONFIG.ui.port}
          </a>
        </div>
      </CardContent>
    </Card>
  );
}