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
  const reverseGeocode = httpsCallable<{ latitude: number; longitude: number }, ReverseGeocodeResponse>(
    functions, 
    'reverseGeocode'
  );

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

        // First update state with coordinates
        setState(prev => ({
          location: {
            latitude,
            longitude
          },
          error: null,
          isLoading: true
        }));

        // Then try to get the address
        const result = await reverseGeocode({ 
          latitude: Number(latitude.toFixed(6)), 
          longitude: Number(longitude.toFixed(6))
        });

        if (result.data.address) {
          setState(prev => ({
            location: {
              ...prev.location!,
              address: result.data.address
            },
            error: null,
            isLoading: false
          }));

          if (result.data.address.includes("United Arab Emirates")) {
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
          error: "Unable to determine your exact location",
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
        timeout: 5000,
        maximumAge: 0
      }
    );
  }, []);

  return state;
}