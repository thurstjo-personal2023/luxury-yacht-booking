import { useState, useEffect } from "react";
import { useToast } from "./use-toast";
import { reverseGeocode } from "@/functions/reverseGeocode";

interface GeolocationState {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  error: string | null;
  isLoading: boolean;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: true
  });

  const { toast } = useToast();

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        isLoading: false
      }));
      return;
    }

    const successHandler = async (position: GeolocationPosition) => {
      try {
        const { latitude, longitude } = position.coords;
        console.log("Got coordinates:", { latitude, longitude });

        // Validate coordinates
        if (isNaN(latitude) || isNaN(longitude) || !isFinite(latitude) || !isFinite(longitude)) {
          throw new Error("Invalid coordinates received from geolocation");
        }

        // Ensure coordinates are within valid ranges
        if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
          throw new Error("Coordinates out of valid range");
        }

        // First update state with coordinates
        setState(prev => ({
          location: {
            latitude,
            longitude
          },
          error: null,
          isLoading: true
        }));

        // Then try to get the address using our improved function
        const result = await reverseGeocode(latitude, longitude);

        console.log("Reverse geocode result:", result);

        const address = result.address;
        if (address) {
          setState(prev => ({
            location: {
              ...prev.location!,
              address
            },
            error: null,
            isLoading: false
          }));

          if (address.includes("United Arab Emirates")) {
            toast({
              title: "Location Detected",
              description: "We've detected your location in the UAE",
            });
          }
        } else {
          setState(prev => ({
            ...prev,
            isLoading: false
          }));
        }
      } catch (error: any) {
        console.error("Error getting location:", error);
        setState(prev => ({
          location: prev.location, // Keep the coordinates if we have them
          error: error.message || "Unable to determine your exact location",
          isLoading: false
        }));
      }
    };

    const errorHandler = (error: GeolocationPositionError) => {
      console.error("Geolocation error:", error);
      setState({
        location: null,
        error: "Failed to detect your location. Please allow location access or select your region manually.",
        isLoading: false
      });
    };

    navigator.geolocation.getCurrentPosition(
      successHandler,
      errorHandler,
      {
        enableHighAccuracy: true,
        timeout: 10000, // 10 second timeout
        maximumAge: 0
      }
    );
  }, []);

  return state;
}