import { useRef, useEffect, useState } from "react";
import { Input } from "./input";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "./alert";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useGeolocation } from "@/hooks/use-geolocation";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "@/lib/firebase";
import { getDocs, query, where, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./select";

interface PlacesAutocompleteProps {
  onPlaceSelect: (place: {
    address: string;
    latitude: number;
    longitude: number;
    port_marina?: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

const REGIONS = [
  { id: "dubai", name: "Dubai", coords: { lat: 25.2048, lng: 55.2708 } },
  { id: "abu-dhabi", name: "Abu Dhabi", coords: { lat: 24.4539, lng: 54.3773 } }
];

const MARINA_OPTIONS = {
  'dubai': [
    "Dubai Marina Yacht Club",
    "Dubai Creek Marina",
    "Port Rashid Marina",
    "Bulgari Yacht Club & Marina",
    "Dubai Harbour Marina"
  ],
  'abu-dhabi': [
    "Yas Marina",
    "Emirates Palace Marina",
    "Saadiyat Island Marina",
    "Al Bateen Marina",
    "Eastern Mangroves Marina",
    "Ghantoot Marina"
  ]
};

export function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Select location...",
  className,
}: PlacesAutocompleteProps) {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedMarina, setSelectedMarina] = useState<string>("");
  const [marinas, setMarinas] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, error: geoError } = useGeolocation();

  // Fetch marinas for selected region
  useEffect(() => {
    if (!selectedRegion) return;

    setIsLoading(true);
    setError(null);
    try {
      // Get marinas from predefined options
      const regionMarinas = MARINA_OPTIONS[selectedRegion as keyof typeof MARINA_OPTIONS] || [];
      setMarinas(regionMarinas);

      if (regionMarinas.length === 0) {
        setError("No marinas found in this region");
      }
    } catch (err) {
      console.error("Error setting marina options:", err);
      setError("Failed to load marina options");
      toast({
        title: "Error",
        description: "Failed to load marina options",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [selectedRegion]);

  // Auto-select region based on geolocation
  useEffect(() => {
    if (location?.address) {
      const address = location.address.toLowerCase();
      if (address.includes("dubai")) {
        setSelectedRegion("dubai");
      } else if (address.includes("abu dhabi")) {
        setSelectedRegion("abu-dhabi");
      }
    }
  }, [location]);

  const handleRegionChange = (region: string) => {
    setSelectedRegion(region);
    setSelectedMarina("");
    setError(null);

    const regionData = REGIONS.find(r => r.id === region);
    if (regionData) {
      onPlaceSelect({
        address: regionData.name,
        latitude: regionData.coords.lat,
        longitude: regionData.coords.lng
      });
    }
  };

  const handleMarinaChange = (marina: string) => {
    setSelectedMarina(marina);
    const regionData = REGIONS.find(r => r.id === selectedRegion);
    if (regionData) {
      onPlaceSelect({
        address: `${marina}, ${regionData.name}, UAE`,
        latitude: regionData.coords.lat,
        longitude: regionData.coords.lng,
        port_marina: marina
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {geoError && (
          <Alert variant="default" className="mb-4">
            <AlertDescription>
              {geoError} Please select your region manually.
            </AlertDescription>
          </Alert>
        )}

        <Select
          value={selectedRegion}
          onValueChange={handleRegionChange}
        >
          <SelectTrigger className={className}>
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map(region => (
              <SelectItem key={region.id} value={region.id}>
                {region.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRegion && (
        <div className="space-y-2">
          <Select
            value={selectedMarina}
            onValueChange={handleMarinaChange}
            disabled={isLoading || marinas.length === 0}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder="Select Port/Marina" />
            </SelectTrigger>
            <SelectContent>
              {marinas.map(marina => (
                <SelectItem key={marina} value={marina}>
                  {marina}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {isLoading && (
        <Alert>
          <AlertDescription className="flex items-center gap-2">
            <ReloadIcon className="h-4 w-4 animate-spin" />
            Loading available ports/marinas...
          </AlertDescription>
        </Alert>
      )}

      {error && !isLoading && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}