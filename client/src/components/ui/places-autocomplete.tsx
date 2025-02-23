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
    pier?: string;
  }) => void;
  placeholder?: string;
  className?: string;
}

const REGIONS = [
  { id: "dubai", name: "Dubai", coords: { lat: 25.2048, lng: 55.2708 } },
  { id: "abu-dhabi", name: "Abu Dhabi", coords: { lat: 24.4539, lng: 54.3773 } }
];

export function PlacesAutocomplete({
  onPlaceSelect,
  placeholder = "Select location...",
  className,
}: PlacesAutocompleteProps) {
  const { toast } = useToast();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedPier, setSelectedPier] = useState<string>("");
  const [piers, setPiers] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, error: geoError } = useGeolocation();

  // Fetch piers for selected region
  useEffect(() => {
    async function fetchPiers() {
      if (!selectedRegion) return;

      setIsLoading(true);
      setError(null);
      try {
        const experiencesRef = collection(db, "experience_packages");
        const q = query(
          experiencesRef,
          where("location.region", "==", selectedRegion)
        );

        const snapshot = await getDocs(q);
        const uniquePiers = new Set<string>();

        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.location?.pier) {
            uniquePiers.add(data.location.pier);
          }
        });

        const piersArray = Array.from(uniquePiers);
        setPiers(piersArray);

        if (piersArray.length === 0) {
          setError("No piers found in this region");
        }
      } catch (err) {
        console.error("Error fetching piers:", err);
        setError("Failed to fetch available piers");
        toast({
          title: "Error",
          description: "Failed to fetch available piers",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchPiers();
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
    setSelectedPier("");
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

  const handlePierChange = (pier: string) => {
    setSelectedPier(pier);
    const regionData = REGIONS.find(r => r.id === selectedRegion);
    if (regionData) {
      onPlaceSelect({
        address: `${pier}, ${regionData.name}`,
        latitude: regionData.coords.lat,
        longitude: regionData.coords.lng,
        pier
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
            value={selectedPier}
            onValueChange={handlePierChange}
            disabled={isLoading || piers.length === 0}
          >
            <SelectTrigger className={className}>
              <SelectValue placeholder="Select pier" />
            </SelectTrigger>
            <SelectContent>
              {piers.map(pier => (
                <SelectItem key={pier} value={pier}>
                  {pier}
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
            Loading available piers...
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