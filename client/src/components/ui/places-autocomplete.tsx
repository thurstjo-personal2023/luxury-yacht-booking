import { useRef, useEffect } from "react";
import { Input } from "./input";
import { useLoadScript } from "@react-google-maps/api";

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
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries,
  });

  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  useEffect(() => {
    if (!isLoaded || !inputRef.current) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(
      inputRef.current,
      {
        types: ["geocode"],
        fields: ["formatted_address", "geometry"],
      }
    );

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace();

      if (place?.geometry?.location) {
        onPlaceSelect({
          address: place.formatted_address || "",
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      }
    });

    return () => {
      if (google.maps.event) {
        google.maps.event.clearInstanceListeners(autocompleteRef.current!);
      }
    };
  }, [isLoaded, onPlaceSelect]);

  if (loadError) {
    return <Input className={className} placeholder="Error loading Google Maps" disabled />;
  }

  if (!isLoaded) {
    return <Input className={className} placeholder="Loading..." disabled />;
  }

  return (
    <Input
      ref={inputRef}
      type="text"
      placeholder={placeholder}
      className={className}
    />
  );
}