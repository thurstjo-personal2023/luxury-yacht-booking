/**
 * Connection Status Component
 * 
 * Displays the current connection status to the Firebase Emulator
 * Used as a compact indicator in the UI.
 */

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { isDevelopment } from "@/lib/env-config";

type ConnectionStatus = "connected" | "disconnected" | "checking";

export function ConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("checking");
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  const checkConnection = async () => {
    if (!isDevelopment) {
      // In production, always show connected
      setStatus("connected");
      return;
    }
    
    try {
      const response = await fetch('/api/emulator-config');
      if (response.ok) {
        const data = await response.json();
        setStatus(data.connected ? "connected" : "disconnected");
      } else {
        setStatus("disconnected");
      }
    } catch (error) {
      console.error('Error checking connection:', error);
      setStatus("disconnected");
    } finally {
      setLastChecked(new Date());
    }
  };

  // Check connection status on component mount
  useEffect(() => {
    checkConnection();
    
    // Set up interval to periodically check connection
    const interval = setInterval(checkConnection, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  // Determine the appropriate badge variant and content based on status
  const getBadgeContent = () => {
    switch (status) {
      case "connected":
        return {
          variant: "success" as const,
          icon: <Wifi className="h-3.5 w-3.5 mr-1" />,
          text: "Emulator Connected"
        };
        
      case "disconnected":
        return {
          variant: "destructive" as const,
          icon: <WifiOff className="h-3.5 w-3.5 mr-1" />,
          text: "Emulator Disconnected"
        };
        
      case "checking":
      default:
        return {
          variant: "outline" as const,
          icon: <div className="h-3 w-3 rounded-full bg-yellow-500 mr-1.5" />,
          text: "Checking Connection..."
        };
    }
  };

  const { variant, icon, text } = getBadgeContent();

  // If we're not in development, don't show the indicator
  if (!isDevelopment && status === "connected") {
    return null;
  }

  return (
    <Badge variant={variant} className="flex items-center px-2 py-0.5">
      {icon}
      <span className="text-xs">{text}</span>
    </Badge>
  );
}