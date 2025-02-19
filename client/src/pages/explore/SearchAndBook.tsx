import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker";
import type { Yacht } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";

const activityTypes = [
  { id: "yacht-cruise", label: "Yacht Cruise" },
  { id: "water-sports", label: "Water Sports" },
  { id: "fishing", label: "Fishing" },
  { id: "diving", label: "Diving" },
];

const durations = [
  { value: "half-day", label: "Half Day" },
  { value: "full-day", label: "Full Day" },
  { value: "multi-day", label: "Multi Day" },
];

const locations = [
  "Miami, FL",
  "San Francisco, CA",
  "Los Angeles, CA",
  "New York, NY",
  "Seattle, WA",
];

export default function SearchAndBook() {
  const { toast } = useToast();
  const [location, setLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [duration, setDuration] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);

  // Fetch available yachts based on filters
  const { data: yachts, isLoading, refetch } = useQuery<Yacht[]>({
    queryKey: [
      "/api/yachts/search",
      {
        location,
        dateRange,
        activities: selectedActivities,
        priceRange,
        duration,
      },
    ],
    enabled: isSearching, // Only fetch when search button is clicked
  });

  const handleActivityToggle = (activityId: string) => {
    setSelectedActivities((current) =>
      current.includes(activityId)
        ? current.filter((id) => id !== activityId)
        : [...current, activityId]
    );
  };

  const handleSearch = () => {
    if (!location) {
      toast({
        title: "Location Required",
        description: "Please select a location to search.",
        variant: "destructive",
      });
      return;
    }
    setIsSearching(true);
    refetch();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Search & Book</h1>

      {/* Filters Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Find the perfect yacht experience for your needs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Location Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Select
                value={location}
                onValueChange={setLocation}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {locations.map((loc) => (
                    <SelectItem key={loc} value={loc}>
                      {loc}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <CalendarDateRangePicker
                date={dateRange}
                setDate={setDateRange}
              />
            </div>

            {/* Duration Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Select
                value={duration}
                onValueChange={setDuration}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {durations.map((d) => (
                    <SelectItem key={d.value} value={d.value}>
                      {d.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Activity Types Filter */}
            <div className="space-y-2 col-span-full md:col-span-2">
              <label className="text-sm font-medium">Activity Types</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {activityTypes.map((activity) => (
                  <div key={activity.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={activity.id}
                      checked={selectedActivities.includes(activity.id)}
                      onCheckedChange={() => handleActivityToggle(activity.id)}
                    />
                    <label
                      htmlFor={activity.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {activity.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Price Range Filter */}
            <div className="space-y-2 col-span-full">
              <label className="text-sm font-medium">
                Price Range: ${priceRange[0]} - ${priceRange[1]}
              </label>
              <Slider
                min={0}
                max={10000}
                step={100}
                value={[priceRange[0], priceRange[1]]}
                onValueChange={(value) => setPriceRange(value as [number, number])}
              />
            </div>
          </div>

          <Button className="mt-6 w-full" onClick={handleSearch}>
            Search Experiences
          </Button>
        </CardContent>
      </Card>

      {/* Results Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="w-full">
              <CardContent className="p-4">
                <div className="h-48 bg-muted animate-pulse rounded-lg mb-4" />
                <div className="space-y-2">
                  <div className="h-4 bg-muted animate-pulse rounded w-2/3" />
                  <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : !isSearching ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">
              Use the filters above to search for your perfect yacht experience.
            </p>
          </div>
        ) : yachts?.length === 0 ? (
          <div className="col-span-full text-center py-8">
            <p className="text-muted-foreground">
              No experiences match your criteria. Please adjust your filters and try
              again.
            </p>
          </div>
        ) : (
          yachts?.map((yacht) => (
            <Card key={yacht.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              <CardContent className="p-0">
                <img
                  src={yacht.imageUrl}
                  alt={yacht.name}
                  className="w-full h-48 object-cover"
                />
                <div className="p-4">
                  <h3 className="font-semibold mb-2">{yacht.name}</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    {yacht.description}
                  </p>
                  <div className="flex justify-between items-center">
                    <span className="font-medium">
                      ${yacht.price}/day
                    </span>
                    <Button variant="outline">View Details</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}