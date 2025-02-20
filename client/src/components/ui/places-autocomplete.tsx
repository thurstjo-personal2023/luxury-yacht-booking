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
      console.log("Calling getLocation function with address:", inputValue);
      const result = await getLocation({ address: inputValue });
      const data = result.data as { lat: number; lng: number; error?: { message: string; details: string } };

      console.log("Location function response:", data);

      if (data.error) {
        throw new Error(data.error.message || 'Failed to fetch location data');
      }

      onPlaceSelect({
        address: inputValue,
        latitude: data.lat,
        longitude: data.lng,
      });
    } catch (err) {
      console.error("Error fetching location:", err);
      setError("Failed to fetch location data. Please try again.");
      toast({
        title: "Error",
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