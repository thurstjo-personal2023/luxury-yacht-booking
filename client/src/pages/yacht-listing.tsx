import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger 
} from "@/components/ui/popover";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";

interface YachtPackage {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  location: string;
  capacity: number;
  activities: string[];
  duration: string;
}

const ACTIVITY_TYPES = [
  { id: "yacht-cruise", label: "Yacht Cruise" },
  { id: "water-sports", label: "Water Sports" },
  { id: "fishing", label: "Fishing Trip" },
  { id: "party", label: "Party Cruise" },
  { id: "corporate", label: "Corporate Event" },
];

const DURATIONS = [
  { value: "half-day", label: "Half Day (4-6 hours)" },
  { value: "full-day", label: "Full Day (8-10 hours)" },
  { value: "multi-day", label: "Multi Day" },
];

const LOCATIONS = [
  "Dubai Marina",
  "Palm Jumeirah",
  "Abu Dhabi",
  "Muscat",
  "Doha"
];

export default function YachtListing() {
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([5000, 100000]);
  const [location, setLocationState] = useState("all");
  const [duration, setDuration] = useState("all");

  const { data: yachts, isLoading } = useQuery({
    queryKey: ['/api/yachts'],
    queryFn: async () => {
      try {
        // In production, this would fetch from Firestore
        // For now, return sample data
        return SAMPLE_YACHTS;
      } catch (error) {
        console.error("Error fetching yachts:", error);
        throw error;
      }
    }
  });

  const filteredYachts = yachts?.filter(yacht => {
    const matchesSearch = yacht.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         yacht.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = yacht.price >= priceRange[0] && yacht.price <= priceRange[1];
    const matchesLocation = location === "all" || yacht.location === location;
    const matchesDuration = duration === "all" || yacht.duration === duration;
    const matchesActivities = selectedActivities.length === 0 || 
                            selectedActivities.some(activity => yacht.activities.includes(activity));

    return matchesSearch && matchesPrice && matchesLocation && matchesDuration && matchesActivities;
  });

  const handleViewDetails = (yachtId: string) => {
    setLocation(`/yacht/${yachtId}`);
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Search & Book</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Search Filters */}
        <div className="bg-card rounded-lg p-6 mb-8 space-y-6">
          <h2 className="text-xl font-semibold mb-4">Filters</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <Input
                placeholder="Search yachts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {/* Date Picker */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={setSelectedDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Location Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select value={location} onValueChange={setLocationState}>
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Locations</SelectItem>
                  {LOCATIONS.map(loc => (
                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Duration Select */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Durations</SelectItem>
                  {DURATIONS.map(({ value, label }) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price Range Slider */}
            <div className="space-y-4 col-span-full">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Price Range (AED)</label>
                <span className="text-sm text-muted-foreground">
                  {priceRange[0].toLocaleString()} - {priceRange[1].toLocaleString()}
                </span>
              </div>
              <Slider
                defaultValue={[5000, 100000]}
                max={100000}
                min={5000}
                step={1000}
                value={priceRange}
                onValueChange={(value) => setPriceRange(value as [number, number])}
              />
            </div>

            {/* Activity Types */}
            <div className="col-span-full space-y-4">
              <label className="text-sm font-medium">Activity Types</label>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {ACTIVITY_TYPES.map(({ id, label }) => (
                  <div key={id} className="flex items-center space-x-2">
                    <Checkbox
                      id={id}
                      checked={selectedActivities.includes(id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedActivities([...selectedActivities, id]);
                        } else {
                          setSelectedActivities(selectedActivities.filter(a => a !== id));
                        }
                      }}
                    />
                    <label
                      htmlFor={id}
                      className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {label}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">
            Search Results ({filteredYachts?.length ?? 0} yachts found)
          </h2>

          {filteredYachts?.length === 0 ? (
            <div className="text-center py-12 bg-muted/20 rounded-lg">
              <p className="text-lg text-muted-foreground mb-4">
                No experiences match your criteria. Please adjust your filters and try again.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedDate(undefined);
                  setSelectedActivities([]);
                  setPriceRange([5000, 100000]);
                  setLocationState("all");
                  setDuration("all");
                }}
              >
                Reset Filters
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredYachts?.map((yacht) => (
                <div key={yacht.id} className="group relative">
                  <div className="aspect-h-1 aspect-w-1 w-full overflow-hidden rounded-lg bg-gray-200">
                    <img
                      src={yacht.imageUrl}
                      alt={yacht.name}
                      className="h-full w-full object-cover object-center group-hover:opacity-75"
                    />
                  </div>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between">
                      <h3 className="text-lg font-medium">{yacht.name}</h3>
                      <p className="text-lg font-semibold">
                        AED {yacht.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground">{yacht.description}</p>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">
                        Capacity: {yacht.capacity} guests
                      </span>
                      <Button
                        onClick={() => handleViewDetails(yacht.id)}
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <nav className="container mx-auto px-4">
          <div className="flex justify-around py-2">
            <Button variant="ghost" className="flex-1">Home</Button>
            <Button variant="ghost" className="flex-1">Explore</Button>
            <Button variant="ghost" className="flex-1">Bookings</Button>
            <Button variant="ghost" className="flex-1">Profile</Button>
          </div>
        </nav>
      </footer>
    </div>
  );
}

// Sample data for development
const SAMPLE_YACHTS: YachtPackage[] = [
  {
    id: "1",
    name: "Ocean Paradise",
    description: "Luxurious megayacht with helipad and infinity pool",
    price: 50000,
    imageUrl: "https://images.unsplash.com/photo-1469796466635-455ede028aca",
    location: "Dubai Marina",
    capacity: 12,
    activities: ["yacht-cruise", "party", "corporate"],
    duration: "full-day"
  },
  {
    id: "2",
    name: "Azure Dreams",
    description: "Modern yacht perfect for Mediterranean cruising",
    price: 35000,
    imageUrl: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd",
    location: "Palm Jumeirah",
    capacity: 8,
    activities: ["yacht-cruise", "water-sports"],
    duration: "half-day"
  },
  {
    id: "3",
    name: "Royal Voyager",
    description: "Classic luxury yacht with timeless elegance",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1549439602-43ebca2327af",
    location: "Abu Dhabi",
    capacity: 10,
    activities: ["yacht-cruise", "fishing", "corporate"],
    duration: "multi-day"
  }
];

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-12 w-64 mb-8" />
      <div className="bg-card rounded-lg p-6 mb-8">
        <Skeleton className="h-8 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}