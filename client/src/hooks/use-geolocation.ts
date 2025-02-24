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

        // Validate coordinates
        if (isNaN(latitude) || isNaN(longitude) || !isFinite(latitude) || !isFinite(longitude)) {
          throw new Error("Invalid coordinates received from geolocation");
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

        // Format coordinates to 6 decimal places and ensure they're numbers
        const formattedLat = parseFloat(latitude.toFixed(6));
        const formattedLng = parseFloat(longitude.toFixed(6));

        console.log("Calling reverseGeocode with coordinates:", { formattedLat, formattedLng });

        // Then try to get the address
        const result = await reverseGeocode({ 
          latitude: formattedLat,
          longitude: formattedLng
        });

        console.log("Reverse geocode result:", result);

        const address = result.data.address;
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
        timeout: 10000, // Increased timeout to 10 seconds
        maximumAge: 0
      }
    );
  }, []);

  return state;
}