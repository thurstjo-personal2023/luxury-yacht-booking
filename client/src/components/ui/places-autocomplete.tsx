import { useRef, useEffect, useState } from "react";
import { Input } from "./input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { ReloadIcon } from "@radix-ui/react-icons";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";

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
  const functions = getFunctions(app);
  const getLocation = httpsCallable(functions, 'getLocation');

  const handleLocationSearch = async () => {
    if (!inputValue.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      console.log("[PlacesAutocomplete] Calling getLocation with:", { address: inputValue });

      // Call the Cloud Function with the address
      const result = await getLocation({ address: inputValue });
      console.log("[PlacesAutocomplete] Cloud Function response:", result);

      // Extract the location data from the nested response
      const locationData = result.data as {
        lat: number;
        lng: number;
        address: string;
      };

      console.log("[PlacesAutocomplete] Extracted location data:", locationData);

      // Validate the response data
      if (!locationData || !locationData.lat || !locationData.lng) {
        throw new Error("Invalid location data received from server");
      }

      // Call the onPlaceSelect callback with the formatted data
      onPlaceSelect({
        address: locationData.address || inputValue,
        latitude: locationData.lat,
        longitude: locationData.lng,
      });

      // Show success toast
      toast({
        title: "Location Found",
        description: `Successfully found coordinates for ${locationData.address || inputValue}`,
      });

    } catch (err: any) {
      console.error("[PlacesAutocomplete] Error details:", {
        message: err.message,
        name: err.name,
        code: err.code,
        stack: err.stack,
      });

      // Set error state and show error toast
      setError("Failed to fetch location data. Please try again.");
      toast({
        title: "Location Search Error",
        description: err.message || "Failed to fetch location data. Please try again later.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Debounce the search
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (inputValue.trim().length >= 3) {
        handleLocationSearch();
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [inputValue]);

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
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}