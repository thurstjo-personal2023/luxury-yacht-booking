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
import type { YachtExperience } from "@shared/firestore-schema";
import { getDocs, query, where, limit, collection } from "firebase/firestore";
import { auth, db } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { DateRange } from "react-day-picker";
import { Progress } from "@/components/ui/progress";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";


interface LocationOption {
  address: string;
  latitude: number;
  longitude: number;
}

// Existing activity types and durations arrays remain unchanged...

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

export default function ConsumerDashboard() {
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [location, setLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [duration, setDuration] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
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

  const { data: recommendedYachts, isLoading: recommendedYachtsLoading } = useQuery<YachtExperience[]>({
    queryKey: ["yachts", "recommended"],
    queryFn: async () => {
      try {
        console.log("=== Recommended Yachts Query Start ===");
        console.log("Firestore DB instance:", db);

        const experiencesRef = collection(db, "experience_packages");
        console.log("Collection reference:", experiencesRef);

        const snapshot = await getDocs(experiencesRef);
        console.log("Raw snapshot:", {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.map(doc => doc.id)
        });

        if (snapshot.empty) {
          console.log("No documents found in experience_packages collection");
          return [];
        }

        const allPackages = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`Document ${doc.id} data:`, data);
          return {
            id: doc.id,
            ...data
          };
        }) as YachtExperience[];

        console.log("All packages after mapping:", allPackages);

        const recommended = allPackages
          .filter(pkg => {
            const hasHighRating = pkg.reviews?.some(review => review.rating >= 4.5);
            const isRecommended = pkg.featured || hasHighRating;
            console.log(`Package ${pkg.id} recommendation check:`, {
              featured: pkg.featured,
              hasHighRating,
              isRecommended
            });
            return isRecommended;
          })
          .slice(0, 6);

        console.log("Final recommended packages:", recommended);
        console.log("=== Recommended Yachts Query End ===");
        return recommended;
      } catch (error) {
        console.error("Error in recommended yachts query:", error);
        throw error;
      }
    }
  });

  const { data: yachts, isLoading: yachtsLoading, refetch: refetchYachts } = useQuery<YachtExperience[]>({
    queryKey: ["yachts", { location, dateRange, activities: selectedActivities, priceRange, duration }],
    queryFn: async () => {
      try {
        console.log("=== Search Yachts Query Start ===");
        console.log("Search parameters:", {
          location,
          dateRange,
          activities: selectedActivities,
          priceRange,
          duration
        });

        const experiencesRef = collection(db, "experience_packages");
        console.log("Collection reference:", experiencesRef);

        const snapshot = await getDocs(experiencesRef);
        console.log("Raw snapshot:", {
          empty: snapshot.empty,
          size: snapshot.size,
          docs: snapshot.docs.map(doc => doc.id)
        });

        if (snapshot.empty) {
          console.log("No documents found in experience_packages collection");
          return [];
        }

        const allPackages = snapshot.docs.map(doc => {
          const data = doc.data();
          console.log(`Document ${doc.id} data:`, data);
          return {
            id: doc.id,
            ...data
          };
        }) as YachtExperience[];

        console.log("All packages before filtering:", allPackages);
        console.log("=== Search Yachts Query End ===");
        return allPackages;
      } catch (error) {
        console.error("Error in search yachts query:", error);
        throw error;
      }
    },
    enabled: isSearching
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
    console.log("Selected location:", place);
    setSelectedLocation({
      address: place.address,
      latitude: place.latitude,
      longitude: place.longitude
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
              ) : !yachts?.length && isSearching ? (
                <div className="col-span-full text-center py-8">
                  <div className="max-w-md mx-auto space-y-4">
                    <p className="text-lg text-muted-foreground">
                      No experiences match your criteria. Please adjust your filters and try again.
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setIsSearching(false);
                        setPriceRange([0, 10000]);
                        setSelectedActivities([]);
                        setDuration("");
                      }}
                    >
                      Reset Filters
                    </Button>
                  </div>
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