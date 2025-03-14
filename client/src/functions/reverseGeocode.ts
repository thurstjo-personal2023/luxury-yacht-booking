import axios from 'axios';

/**
 * Performs reverse geocoding using the server-side proxy to Google Maps API
 * This server-side proxy helps prevent CORS issues and securely manages the API key
 * 
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
    
    console.log("Calling reverse geocode proxy with coordinates:", { formattedLat, formattedLng });
    
    // Use our server-side proxy endpoint instead of calling Firebase Function directly
    const response = await axios.get(`/api/geocode/reverse`, {
      params: {
        lat: formattedLat,
        lng: formattedLng
      }
    });
    
    // Extract address from Google Maps API response
    if (response.data && response.data.results && response.data.results.length > 0) {
      const formattedAddress = response.data.results[0].formatted_address;
      console.log("Successfully retrieved address:", formattedAddress);
      return { address: formattedAddress };
    } else {
      console.warn("No address results found in Google Maps API response:", response.data);
      return { address: null };
    }
  } catch (error) {
    console.error("Error in reverseGeocode proxy call:", error);
    
    // Return a fallback for UAE coordinates
    // This is a workaround for when the geocoding service fails
    if (latitude >= 22.0 && latitude <= 27.0 && longitude >= 51.0 && longitude <= 56.5) {
      return { address: "United Arab Emirates" };
    }
    return { address: null };
  }
}
