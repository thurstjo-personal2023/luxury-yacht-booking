import { useRef, useEffect, useState } from "react";
import { Input } from "./input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { ReloadIcon } from "@radix-ui/react-icons";

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
  }) => void;
  placeholder?: string;
  className?: string;
}

export function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Enter location...",
  className,
}: PlacesAutocompleteProps) {
  const { toast } = useToast();
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cloud Function URL for the emulator
  const cloudFunctionURL = "http://127.0.0.1:5001/etoile-yachts/us-central1/getLocation";

  const handleLocationSearch = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("[PlacesAutocomplete] Sending request to:", cloudFunctionURL);
      console.log("[PlacesAutocomplete] Request payload:", { address: inputValue });

      const response = await fetch(cloudFunctionURL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address: inputValue }),
      });

      console.log("[PlacesAutocomplete] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        console.error("[PlacesAutocomplete] Error response:", errorData);
        throw new Error(errorData?.error?.message || "Failed to fetch location data");
      }

      const data = await response.json();
      console.log("[PlacesAutocomplete] Success response:", data);

      if (!data.lat || !data.lng) {
        throw new Error("Invalid location data received");
      }

      onPlaceSelect({
        address: inputValue,
        latitude: data.lat,
        longitude: data.lng,
      });
    } catch (err: any) {
      console.error("[PlacesAutocomplete] Error details:", {
        message: err.message,
        stack: err.stack,
      });

      setError("Failed to fetch location data. Please try again.");
      toast({
        title: "Location Search Error",
        description: "Failed to fetch location data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the search to avoid too many function calls
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.trim().length >= 3) {
        handleLocationSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  if (error) {
    return (
      <div className="space-y-2">
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={placeholder}
          className={className}
        />
        <Alert variant="destructive">
          <AlertDescription className="flex items-center gap-2">
            {error}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        placeholder={isLoading ? "Searching..." : placeholder}
        className={className}
        disabled={isLoading}
      />
      {isLoading && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <ReloadIcon className="h-4 w-4 animate-spin" />
            Searching for location...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}