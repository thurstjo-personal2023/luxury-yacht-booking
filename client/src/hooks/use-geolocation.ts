import { useState, useEffect } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useToast } from "./use-toast";

interface GeolocationState {
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  } | null;
  error: string | null;
  isLoading: boolean;
}

interface ReverseGeocodeResponse {
  address: string | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    location: null,
    error: null,
    isLoading: true
  });
  const { toast } = useToast();
  const functions = getFunctions();
  const reverseGeocode = httpsCallable<{ latitude: number; longitude: number }, ReverseGeocodeResponse>(functions, 'reverseGeocode');

  useEffect(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        isLoading: false
      }));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          console.log("Got coordinates:", { latitude, longitude });

          // Call the reverse geocoding Cloud Function
          const result = await reverseGeocode({ latitude, longitude });

          setState({
            location: {
              latitude,
              longitude,
              address: result.data.address || undefined
            },
            error: null,
            isLoading: false
          });

          // If we got a location in UAE, show a success message
          if (result.data.address?.includes("United Arab Emirates")) {
            toast({
              title: "Location Detected",
              description: "We've detected your location in the UAE",
            });
          }
        } catch (error) {
          console.error("Error getting location:", error);
          setState(prev => ({
            ...prev,
            error: "Failed to get your location details",
            isLoading: false
          }));
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        setState({
          location: null,
          error: error.message,
          isLoading: false
        });
      }
    );
  }, []);

  return state;
}