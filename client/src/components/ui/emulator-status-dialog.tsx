/**
 * Emulator Status Dialog Component
 * 
 * Displays a comprehensive overview of Firebase Emulator connection status
 * with additional configuration details that can be shown in a dialog.
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, InfoIcon } from 'lucide-react';

// Import development configuration
import { FIREBASE_EMULATOR, isDevelopment } from '@/lib/env-config';

interface EmulatorConfig {
  hosts: {
    firestore: string;
    auth: string;
    storage: string;
    functions: string;
    rtdb: string;
    pubsub?: string;
    eventarc?: string;
    dataconnect?: string;
    tasks?: string;
    hub?: string;
    [key: string]: string | undefined;
  };
  connected: boolean;
  timestamp: number;
  status?: Record<string, boolean>;
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "success" | undefined;

export function EmulatorStatusDialog() {
  const [config, setConfig] = useState<EmulatorConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/emulator-config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error fetching emulator config:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch immediately when dialog is opened
    if (open) {
      fetchConfig();
    }
  }, [open]);

  // Fetch again when dialog stays open for a while
  useEffect(() => {
    if (!open) return;
    
    const interval = setInterval(fetchConfig, 10000);
    return () => clearInterval(interval);
  }, [open]);

  // Helper function to render status badges
  const renderStatusBadge = (isConnected: boolean) => {
    // Cast to any to satisfy TypeScript
    const variant = isConnected ? ("success" as BadgeVariant) : "destructive";
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        {isConnected ? 
          <><CheckCircle2 className="h-3.5 w-3.5" /> Connected</> : 
          <><XCircle className="h-3.5 w-3.5" /> Disconnected</>
        }
      </Badge>
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8">
          <ConnectionStatus />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Firebase Emulator Status</DialogTitle>
          <DialogDescription>
            Connection status for all Firebase emulator services in development environment.
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="py-6 flex justify-center">
            <div className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-primary rounded-full border-t-transparent"></div>
              <span>Loading emulator status...</span>
            </div>
          </div>
        ) : config ? (
          <div className="py-4 space-y-4">
            <div className="grid grid-cols-2 gap-y-2 gap-x-4">
              <div className="text-sm font-semibold">Service</div>
              <div className="text-sm font-semibold">Status</div>
              
              <div className="text-sm">Firestore</div>
              <div>{renderStatusBadge(config.connected)}</div>
              
              <div className="text-sm">Authentication</div>
              <div>{renderStatusBadge(config.connected)}</div>
              
              <div className="text-sm">Storage</div>
              <div>{renderStatusBadge(config.connected)}</div>
              
              <div className="text-sm">Functions</div>
              <div>{renderStatusBadge(config.connected)}</div>
              
              <div className="text-sm">Realtime DB</div>
              <div>{renderStatusBadge(config.connected)}</div>
              
              {config.hosts.pubsub && (
                <>
                  <div className="text-sm">Pub/Sub</div>
                  <div>{renderStatusBadge(config.connected)}</div>
                </>
              )}
            </div>
            
            <div className="border-t pt-2">
              <h4 className="text-sm font-medium mb-2">Connection Details</h4>
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Firestore: {config.hosts.firestore}</p>
                <p>Auth: {config.hosts.auth}</p>
                <p>Storage: {config.hosts.storage}</p>
                <p>Functions: {config.hosts.functions}</p>
                <p>Realtime DB: {config.hosts.rtdb}</p>
                {config.hosts.pubsub && <p>Pub/Sub: {config.hosts.pubsub}</p>}
                {config.hosts.eventarc && <p>Eventarc: {config.hosts.eventarc}</p>}
                {config.hosts.dataconnect && <p>Data Connect: {config.hosts.dataconnect}</p>}
                {config.hosts.tasks && <p>Cloud Tasks: {config.hosts.tasks}</p>}
                {config.hosts.hub && <p>Emulator Hub: {config.hosts.hub}</p>}
              </div>
            </div>
            
            <div className="border-t pt-2">
              <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
                <InfoIcon className="h-3.5 w-3.5" /> Development Configuration
              </h4>
              <div className="text-xs text-muted-foreground">
                <p>Currently using Firebase Emulator Suite with the following ports:</p>
                <ul className="mt-1 ml-4 list-disc space-y-1">
                  <li>Authentication: {FIREBASE_EMULATOR.auth.port}</li>
                  <li>Firestore: {FIREBASE_EMULATOR.firestore.port}</li>
                  <li>Functions: {FIREBASE_EMULATOR.functions.port}</li>
                  <li>Database: {FIREBASE_EMULATOR.database.port}</li>
                  <li>Storage: {FIREBASE_EMULATOR.storage.port}</li>
                  <li>Pub/Sub: {FIREBASE_EMULATOR.pubsub.port}</li>
                  <li>Eventarc: {FIREBASE_EMULATOR.eventarc.port}</li>
                  <li>Data Connect: {FIREBASE_EMULATOR.dataconnect.port}</li>
                  <li>Cloud Tasks: {FIREBASE_EMULATOR.cloudtasks.port}</li>
                  <li>Emulator Hub: {FIREBASE_EMULATOR.hub.port}</li>
                </ul>
                <p className="mt-2">Emulator UI available at port {FIREBASE_EMULATOR.ui.port}</p>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground border-t pt-2">
              <p>Last updated: {new Date(config.timestamp).toLocaleTimeString()}</p>
            </div>
          </div>
        ) : (
          <div className="py-6">
            <div className="text-center text-destructive">
              Failed to load emulator configuration
            </div>
          </div>
        )}
        
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
          <Button variant="default" onClick={fetchConfig}>Refresh</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}