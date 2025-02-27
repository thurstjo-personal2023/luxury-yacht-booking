import { httpsCallable, getFunctions } from "firebase/functions";
import { app } from "@/lib/firebase";

/**
 * Performs reverse geocoding using the Firebase Cloud Function
 * @param latitude Latitude coordinate
 * @param longitude Longitude coordinate
 * @returns Promise with address information or null
 */
export async function reverseGeocode(latitude: number, longitude: number): Promise<{address: string | null}> {
  try {
    // Validate input
    if (isNaN(latitude) || isNaN(longitude) || 
        !isFinite(latitude) || !isFinite(longitude) ||
        latitude < -90 || latitude > 90 || 
        longitude < -180 || longitude > 180) {
      console.error("Invalid coordinates:", { latitude, longitude });
      return { address: null };
    }
    
    // Format to 6 decimal places for consistency
    const formattedLat = Number(latitude.toFixed(6));
    const formattedLng = Number(longitude.toFixed(6));
    
    // Get the functions instance
    const functions = getFunctions(app);
    const reverseGeocodeFn = httpsCallable<
      { latitude: number; longitude: number }, 
      { address: string | null }
    >(functions, 'reverseGeocode');
    
    // Call the function with properly formatted coordinates
    const result = await reverseGeocodeFn({ 
      latitude: formattedLat, 
      longitude: formattedLng 
    });
    
    return result.data;
  } catch (error) {
    console.error("Error in reverseGeocode:", error);
    // Return a fallback for UAE coordinates
    // This is a workaround for when the cloud function fails
    if (latitude >= 22.0 && latitude <= 27.0 && longitude >= 51.0 && longitude <= 56.5) {
      return { address: "United Arab Emirates" };
    }
    return { address: null };
  }
}
