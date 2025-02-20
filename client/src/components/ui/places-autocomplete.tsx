import { useRef, useEffect, useState } from "react";
import { Input } from "./input";
import { useLoadScript } from "@react-google-maps/api";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { ReloadIcon } from "@radix-ui/react-icons";

const libraries: ("places")[] = ["places"];

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
  const [showError, setShowError] = useState(false);

  // Log the API key status (masked for security)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  console.log("Google Maps API Key status:", {
    exists: !!apiKey,
    length: apiKey?.length || 0,
    startsWithAIza: apiKey?.startsWith('AIza'),
    format: apiKey ? 'Valid format' : 'Invalid format'
  });

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
    libraries,
    version: "weekly"
  });

  // Log loading status
  useEffect(() => {
    console.log("Google Maps script loading status:", {
      isLoaded,
      hasLoadError: !!loadError,
      errorDetails: loadError ? loadError.message : null
    });
  }, [isLoaded, loadError]);

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) {
      console.log("Skipping Autocomplete initialization:", {
        isLoaded,
        hasInputRef: !!inputRef.current
      });
      return;
    }

    try {
      console.log("Initializing Google Places Autocomplete...");

      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["geocode"],
          fields: ["formatted_address", "geometry", "name"],
        }
      );

      console.log("Autocomplete initialized successfully");

      autocompleteRef.current.addListener("place_changed", () => {
        console.log("Place selection triggered");
        const place = autocompleteRef.current?.getPlace();

        console.log("Selected place details:", {
          hasPlace: !!place,
          hasGeometry: !!place?.geometry,
          hasLocation: !!place?.geometry?.location,
          address: place?.formatted_address || place?.name,
        });

        if (!place?.geometry?.location) {
          console.error("Invalid place selection: Missing geometry or location");
          toast({
            title: "Location Error",
            description: "Please select a location from the dropdown list",
            variant: "destructive",
          });
          return;
        }

        const placeData = {
          address: place.formatted_address || place.name || "",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        };

        console.log("Sending place data to parent:", placeData);
        onPlaceSelect(placeData);
        setShowError(false);
      });

      return () => {
        if (google.maps.event && autocompleteRef.current) {
          console.log("Cleaning up event listeners");
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", {
        error,
        errorMessage: error instanceof Error ? error.message : "Unknown error",
        errorStack: error instanceof Error ? error.stack : undefined
      });

      setShowError(true);
      toast({
        title: "Error",
        description: "Failed to initialize location search. Please try again later.",
        variant: "destructive",
      });
    }
  }, [isLoaded, onPlaceSelect, toast]);

  // Early validation of API key
  useEffect(() => {
    if (!apiKey) {
      console.error("Google Maps API key is missing");
      setShowError(true);
      toast({
        title: "Configuration Error",
        description: "Location search is currently unavailable. Please try again later or contact support.",
        variant: "destructive",
      });
    } else if (!apiKey.startsWith('AIza')) {
      console.error("Google Maps API key appears to be in invalid format");
      setShowError(true);
      toast({
        title: "Configuration Error",
        description: "Location search is currently unavailable. Please try again later or contact support.",
        variant: "destructive",
      });
    }
  }, [apiKey, toast]);

  if (loadError || showError) {
    console.error("Google Maps loading error:", {
      error: loadError,
      message: loadError?.message,
      stack: loadError?.stack
    });

    return (
      <div className="space-y-2">
        <Input 
          className={className}
          placeholder="Location search unavailable"
          disabled
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Alert variant="destructive" className="my-2">
          <AlertDescription className="flex items-center gap-2">
            <ReloadIcon className="h-4 w-4 animate-spin" />
            Location search is temporarily unavailable. Please try again later.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!isLoaded) {
    console.log("Waiting for Google Maps to load...");
    return (
      <div className="space-y-2">
        <Input 
          className={className}
          placeholder="Loading location search..."
          disabled
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
        />
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <ReloadIcon className="h-4 w-4 animate-spin" />
            Initializing location search...
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={className}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
    />
  );
}