import { useRef, useEffect, useState } from "react";
import { Input } from "./input";
import { useLoadScript } from "@react-google-maps/api";
import { useToast } from "@/hooks/use-toast";

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

  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
    version: "weekly"
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    try {
      autocompleteRef.current = new google.maps.places.Autocomplete(
        inputRef.current,
        {
          types: ["geocode"],
          fields: ["formatted_address", "geometry", "name"],
        }
      );

      autocompleteRef.current.addListener("place_changed", () => {
        const place = autocompleteRef.current?.getPlace();

        if (!place?.geometry?.location) {
          toast({
            title: "Location Error",
            description: "Please select a location from the dropdown list",
            variant: "destructive",
          });
          return;
        }

        onPlaceSelect({
          address: place.formatted_address || place.name || "",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      });

      return () => {
        if (google.maps.event && autocompleteRef.current) {
          google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
      };
    } catch (error) {
      console.error("Error initializing Google Places Autocomplete:", error);
      toast({
        title: "Error",
        description: "Failed to initialize location search. Please try again later.",
        variant: "destructive",
      });
    }
  }, [isLoaded, onPlaceSelect, toast]);

  if (loadError) {
    console.error("Error loading Google Maps:", loadError);
    return (
      <Input 
        className={className} 
        placeholder="Error loading location search" 
        disabled 
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
    );
  }

  if (!isLoaded) {
    return (
      <Input 
        className={className} 
        placeholder="Loading..." 
        disabled 
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
      />
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