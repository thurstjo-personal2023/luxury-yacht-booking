import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import type { Booking, Yacht } from "@shared/schema";
import { collectionRefs } from "@/lib/firestore-init";
import { getDocs, query, where, limit } from "firebase/firestore";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { DateRange } from "react-day-picker";
import { Progress } from "@/components/ui/progress";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check } from "lucide-react";
import cn from 'classnames';
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";

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

interface LocationOption {
  address: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
}


export default function ConsumerDashboard() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [location, setLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [duration, setDuration] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.uid],
    queryFn: async () => {
      if (!user) return null;
      const doc = await getDocs(query(
        collectionRefs.touristProfiles,
        where("userId", "==", user.uid),
        limit(1)
      ));
      return doc.docs[0]?.data();
    },
    enabled: !!user
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collectionRefs.bookings, where("userId", "==", user.uid));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
    },
    enabled: !!user
  });

  const { data: yachts, isLoading: yachtsLoading, refetch: refetchYachts } = useQuery({
    queryKey: ["yachts", { location, dateRange, activities: selectedActivities, priceRange, duration }],
    queryFn: async () => {
      const q = query(collectionRefs.yachtExperiences);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Yacht[];
    },
    enabled: isSearching
  });

  const { data: recommendedYachts, isLoading: recommendedYachtsLoading } = useQuery<Yacht[]>({
    queryKey: ["/api/yachts/featured"],
    staleTime: 1000 * 60 * 5, // 5 minutes
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
    refetchYachts();
  };

  const handleLocationSelect = (place: { address: string; latitude: number; longitude: number }) => {
    setSelectedLocation({
      address: place.address,
      coordinates: {
        latitude: place.latitude,
        longitude: place.longitude,
      }
    });
    setLocation(place.address);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            Welcome Back, {profile?.name || "Guest"}!
          </h1>
          <p className="text-muted-foreground mt-2">
            Explore your luxury yacht experiences
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings?.filter(b => b.status === 'confirmed').length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Active reservations</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Loyalty Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-2xl font-bold">{profile?.loyaltyTier || "Bronze"}</div>
                <Progress value={65} className="h-2" />
                <p className="text-sm text-muted-foreground">650/1000 points to next tier</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Total Trips</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {bookings?.length || 0}
              </div>
              <p className="text-sm text-muted-foreground">Lifetime bookings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Reward Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">650</div>
              <p className="text-sm text-muted-foreground">Available points</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="recommended" className="space-y-6">
          <TabsList>
            <TabsTrigger value="recommended">Recommended</TabsTrigger>
            <TabsTrigger value="search">Search & Book</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
          </TabsList>

          <TabsContent value="recommended" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6 pt-0">
              {recommendedYachtsLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
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
              ) : !recommendedYachts?.length ? (
                <div className="col-span-full text-center py-8">
                  <p className="text-muted-foreground">
                    No recommended experiences available at this time.
                  </p>
                </div>
              ) : (
                recommendedYachts.map((yacht) => (
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
          </TabsContent>

          <TabsContent value="search" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Find Your Perfect Yacht Experience</CardTitle>
                <CardDescription>
                  Use the filters below to discover your next luxury adventure
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Location</label>
                    <PlacesAutocomplete
                      onPlaceSelect={handleLocationSelect}
                      placeholder="Search for a location..."
                      className="w-full"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date Range</label>
                    <CalendarDateRangePicker
                      date={dateRange}
                      onDateRangeChange={setDateRange}
                    />
                  </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {yachtsLoading ? (
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
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-16 bg-muted animate-pulse rounded"
                      />
                    ))}
                  </div>
                ) : bookings?.length === 0 ? (
                  <p className="text-muted-foreground">No bookings yet</p>
                ) : (
                  <div className="space-y-4">
                    {bookings?.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg flex justify-between items-center"
                      >
                        <div>
                          <p className="font-medium">
                            Booking #{booking.id}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(booking.startDate).toLocaleDateString()} -
                            {new Date(booking.endDate).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            ${booking.totalPrice}
                          </p>
                          <p className="text-sm capitalize text-muted-foreground">
                            {booking.status}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}