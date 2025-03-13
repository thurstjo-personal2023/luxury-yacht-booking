/**
 * Environment Toggle Component
 * 
 * A UI component to switch between Firebase emulator and production environments
 * Note: Changing this setting requires a page refresh to take effect
 */

import { useState, useEffect } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Cloud, Database } from "lucide-react";
import { USE_FIREBASE_EMULATORS } from "@/lib/env-config";

export function EnvironmentToggle() {
  const [isEmulator, setIsEmulator] = useState(USE_FIREBASE_EMULATORS);

  const handleToggle = (enabled: boolean) => {
    setIsEmulator(enabled);
    
    // Store the preference in localStorage
    localStorage.setItem('useFirebaseEmulators', enabled ? 'true' : 'false');
    
    // Display confirmation with reload option
    if (window.confirm(`Switching to ${enabled ? 'EMULATOR' : 'PRODUCTION'} mode requires a page reload. Reload now?`)) {
      window.location.reload();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center p-2 hover:bg-accent rounded-md cursor-pointer">
          <Badge variant={isEmulator ? "outline" : "default"} className="gap-1">
            {isEmulator ? 
              <><Database className="h-3.5 w-3.5" /> Emulator</> : 
              <><Cloud className="h-3.5 w-3.5" /> Production</>
            }
          </Badge>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-2">
        <div className="flex flex-col space-y-4">
          <div className="text-sm font-medium">Firebase Environment</div>
          
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <Label htmlFor="environment-toggle" className="text-sm">
                Use Firebase Emulators
              </Label>
              <span className="text-xs text-muted-foreground">
                {isEmulator ? 'Using local emulator suite' : 'Using production services'}
              </span>
            </div>
            <Switch
              id="environment-toggle"
              checked={isEmulator}
              onCheckedChange={handleToggle}
            />
          </div>
          
          <div className="text-xs text-muted-foreground border-t pt-2">
            <p>
              {isEmulator
                ? "Running in development mode with emulators"
                : "Running in production mode with Firebase services"}
            </p>
            <p className="mt-1">
              Changing this setting requires a page reload to take effect.
            </p>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}