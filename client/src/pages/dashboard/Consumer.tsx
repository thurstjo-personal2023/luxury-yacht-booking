import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
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
import { db } from "@/lib/firebase";
import { useAuthService } from "@/services/auth/use-auth-service";
import { DateRange } from "react-day-picker";
import { Progress } from "@/components/ui/progress";
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { YachtCarousel } from "@/components/YachtCarousel";
import axios from 'axios';

interface LocationOption {
  address: string;
  latitude: number;
  longitude: number;
  port_marina?: string;
}

interface Booking {
  id: string;
  userId: string;
  packageId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: string;
  paymentStatus?: string;
  confirmationId?: string;
  yacht?: {
    id: string;
    title: string;
    description: string;
    mainImage?: string;
    location?: {
      address?: string;
      latitude?: number;
      longitude?: number;
    };
  };
  [key: string]: any;
}

// Collection references for direct Firestore access (only used for profile and bookings)
const collectionRefs = {
  touristProfiles: collection(db, "user_profiles_tourist"),
  bookings: collection(db, "bookings")
};

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
  const { user, profileData } = useAuthService();
  const userRole = profileData?.harmonizedUser?.role || 'consumer';
  
  // Role verification - ensure user has consumer role
  useEffect(() => {
    if (user && userRole !== 'consumer') {
      toast({
        title: "Access Restricted",
        description: "You don't have permission to access the consumer dashboard.",
        variant: "destructive"
      });
      
      // Redirect to appropriate dashboard based on role
      if (userRole === 'producer') {
        window.location.href = '/dashboard/producer';
      } else if (userRole === 'partner') {
        window.location.href = '/dashboard/partner';
      } else {
        window.location.href = '/';
      }
    }
  }, [user, userRole, toast]);
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

  // Updated to use the server-side API endpoint for bookings
  const { data: bookings, isLoading: bookingsLoading } = useQuery({
    queryKey: ["bookings", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      
      console.log("=== Fetching User Bookings via API ===");
      try {
        // Get the authentication token from localStorage
        const token = localStorage.getItem('authToken');
        
        // Call the API endpoint with authentication
        const response = await axios.get('/api/user/bookings', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        console.log("API bookings response:", response.data);
        
        // Return the bookings array from the response
        return response.data.bookings || [];
      } catch (error) {
        console.error("Error fetching bookings from API:", error);
        // Fallback to direct Firestore query if API fails
        console.log("Falling back to direct Firestore query for bookings");
        const q = query(collectionRefs.bookings, where("userId", "==", user.uid));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
      }
    },
    enabled: !!user
  });

  // Using the new server-side API for recommended yachts
  const { data: recommendedYachts, isLoading: recommendedYachtsLoading } = useQuery<YachtExperience[]>({
    queryKey: ["yachts", "recommended"],
    queryFn: async () => {
      try {
        console.log("=== Fetching Recommended Yachts via API ===");
        
        // Get recommended yachts from the server-side API
        const response = await axios.get('/api/yachts/recommended', {
          params: {
            limit: 6
          }
        });
        
        console.log("API response:", response.data);
        
        // Transform the data as needed to match expected format
        const recommendedPackages = response.data.map((yacht: any) => ({
          id: yacht.id,
          name: yacht.title || "Unnamed Package",
          title: yacht.title || yacht.name || "Unnamed Package",
          description: yacht.description || "No description available",
          price: yacht.pricing || 0,
          pricing: yacht.pricing || yacht.price || 0,
          imageUrl: yacht.mainImage || (yacht.media && yacht.media[0]?.url) || 
                   "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800",
          ...yacht
        }));
        
        console.log("Transformed recommended packages:", recommendedPackages);
        return recommendedPackages;
      } catch (error) {
        console.error("Error fetching recommended yachts from API:", error);
        throw error;
      }
    }
  });

  // Using the new server-side API for yacht search
  const { data: yachts, isLoading: yachtsLoading, refetch: refetchYachts } = useQuery<YachtExperience[]>({
    queryKey: ["yachts", "search", { location, dateRange, activities: selectedActivities, priceRange, duration }],
    queryFn: async () => {
      try {
        console.log("=== Search Yachts via API ===");
        console.log("Search parameters:", {
          location,
          dateRange,
          activities: selectedActivities,
          priceRange,
          duration
        });
        
        // Prepare the query parameters
        const params: any = {
          q: location || "yacht", // Use location as the search query, or default to "yacht"
          type: duration || undefined,
          region: selectedLocation?.address,
          min_price: priceRange[0],
          max_price: priceRange[1]
        };
        
        // Add tags if activities are selected
        if (selectedActivities.length > 0) {
          params.tags = JSON.stringify(selectedActivities);
        }
        
        console.log("Search API request parameters:", params);
        
        // Call the search API endpoint
        const response = await axios.get('/api/yachts/search', { params });
        console.log("Search API response:", response.data);
        
        // Extract yachts from the paginated response
        const searchResults = response.data.yachts || [];
        
        // Transform the data as needed to match expected format
        const transformedResults = searchResults.map((yacht: any) => ({
          id: yacht.id,
          name: yacht.title || "Unnamed Package",
          title: yacht.title || yacht.name || "Unnamed Package",
          description: yacht.description || "No description available",
          price: yacht.pricing || 0,
          pricing: yacht.pricing || yacht.price || 0,
          imageUrl: yacht.mainImage || (yacht.media && yacht.media[0]?.url) || 
                   "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800",
          featured: yacht.isFeatured || yacht.featured || false,
          media: yacht.media || [],
          ...yacht
        }));
        
        console.log("Transformed search results:", transformedResults);
        return transformedResults;
      } catch (error) {
        console.error("Error in search API:", error);
        throw error;
      } finally {
        setIsSearching(false);
      }
    },
    enabled: isSearching
  });

  const handleSearch = () => {
    setIsSearching(true);
    refetchYachts();
  };

  const toggleActivity = (activityId: string) => {
    setSelectedActivities(prev => 
      prev.includes(activityId) 
        ? prev.filter(id => id !== activityId)
        : [...prev, activityId]
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Welcome, {profile?.name || user?.displayName || "Guest"}</h1>
      
        <Tabs defaultValue="explore" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="explore">Explore Yachts</TabsTrigger>
            <TabsTrigger value="bookings">My Bookings</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="explore" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle>Find Your Perfect Yacht</CardTitle>
                    <CardDescription>Filter by preferences</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Location</label>
                      <PlacesAutocomplete
                        onPlaceSelect={(place) => {
                          if (place) {
                            setLocation(place.formatted_address || "");
                            setSelectedLocation({
                              address: place.formatted_address || "",
                              latitude: place.geometry?.location?.lat() || 0,
                              longitude: place.geometry?.location?.lng() || 0
                            });
                          }
                        }}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Date Range</label>
                      <CalendarDateRangePicker 
                        date={dateRange} 
                        setDate={setDateRange} 
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Activities</label>
                      <div className="grid grid-cols-2 gap-2">
                        {activityTypes.map(activity => (
                          <div key={activity.id} className="flex items-center space-x-2">
                            <Checkbox 
                              id={activity.id} 
                              checked={selectedActivities.includes(activity.id)}
                              onCheckedChange={() => toggleActivity(activity.id)}
                            />
                            <label htmlFor={activity.id} className="text-sm cursor-pointer">
                              {activity.label}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium">Price Range</label>
                        <span className="text-sm text-gray-500">
                          ${priceRange[0]} - ${priceRange[1]}
                        </span>
                      </div>
                      <Slider
                        min={0}
                        max={10000}
                        step={100}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Duration</label>
                      <Select value={duration} onValueChange={setDuration}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select duration" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="any">Any Duration</SelectItem>
                          {durations.map(d => (
                            <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      className="w-full" 
                      onClick={handleSearch}
                      disabled={isSearching}
                    >
                      {isSearching ? "Searching..." : "Search Yachts"}
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="md:col-span-2 space-y-6">
                {isSearching ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
                      <Progress value={30} className="w-full" />
                      <p>Searching for your perfect yacht experience...</p>
                    </CardContent>
                  </Card>
                ) : yachts && yachts.length > 0 ? (
                  <>
                    <h2 className="text-2xl font-semibold">Search Results</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {yachts.map((yacht) => (
                        <Card key={yacht.id} className="overflow-hidden">
                          <div className="aspect-video relative">
                            <img 
                              src={(yacht.media && yacht.media[0]?.url) || yacht.imageUrl || "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800"} 
                              alt={yacht.title} 
                              className="w-full h-full object-cover"
                            />
                            {(yacht.featured || yacht.isFeatured) && (
                              <div className="absolute top-2 right-2 bg-primary text-white text-xs px-2 py-1 rounded">
                                Featured
                              </div>
                            )}
                          </div>
                          <CardContent className="p-4">
                            <h3 className="font-semibold text-lg">{yacht.title || yacht.name}</h3>
                            <p className="text-sm text-gray-500 line-clamp-2">{yacht.description}</p>
                            <div className="flex justify-between items-center mt-2">
                              <div className="font-semibold">${yacht.pricing || yacht.price}</div>
                              <Button size="sm">View Details</Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : isSearching === false && (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-6">
                      <p>Use the filters to find your perfect yacht experience</p>
                    </CardContent>
                  </Card>
                )}

                {/* Recommended Yachts Section */}
                <div className="space-y-4">
                  <h2 className="text-2xl font-semibold">Recommended for You</h2>
                  {recommendedYachtsLoading ? (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <Progress value={60} className="w-full" />
                        <p className="mt-2">Loading recommendations...</p>
                      </CardContent>
                    </Card>
                  ) : recommendedYachts && recommendedYachts.length > 0 ? (
                    <YachtCarousel yachts={recommendedYachts} />
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center p-6">
                        <p>No recommended experiences available at the moment</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>My Bookings</CardTitle>
                <CardDescription>Your upcoming and past yacht experiences</CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="flex flex-col items-center justify-center p-6">
                    <Progress value={60} className="w-full" />
                    <p className="mt-2">Loading your bookings...</p>
                  </div>
                ) : bookings && bookings.length > 0 ? (
                  <div className="space-y-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div>
                              <h3 className="font-semibold">
                                {booking.yacht?.title || `Booking: ${booking.packageId}`}
                              </h3>
                              <p className="text-sm text-gray-500">
                                {new Date(booking.startDate).toLocaleDateString()} - 
                                {new Date(booking.endDate).toLocaleDateString()}
                              </p>
                              <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                  booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                                
                                <span className={`px-2 py-1 text-xs rounded ${
                                  booking.paymentStatus === 'completed' ? 'bg-green-100 text-green-800' :
                                  booking.paymentStatus === 'processing' ? 'bg-blue-100 text-blue-800' :
                                  booking.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {booking.paymentStatus ? 
                                    booking.paymentStatus.charAt(0).toUpperCase() + booking.paymentStatus.slice(1) : 
                                    'Payment Status Unknown'}
                                </span>
                              </div>
                              
                              {booking.yacht?.location?.address && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {booking.yacht.location.address}
                                </p>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${booking.totalPrice}</div>
                              {booking.yacht && (
                                <div className="w-16 h-16 rounded overflow-hidden mb-2 ml-auto">
                                  <img 
                                    src={booking.yacht.mainImage || 
                                      "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800"} 
                                    alt="Yacht" 
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <Button size="sm" variant="outline">View Details</Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p>You don't have any bookings yet</p>
                    <Button className="mt-4" variant="outline">Explore Yachts</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>My Profile</CardTitle>
                <CardDescription>Your personal information and preferences</CardDescription>
              </CardHeader>
              <CardContent>
                {profile ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="font-semibold mb-2">Personal Information</h3>
                        <div className="space-y-2">
                          <div className="flex">
                            <span className="font-medium w-32">Name:</span>
                            <span>{profile.name}</span>
                          </div>
                          <div className="flex">
                            <span className="font-medium w-32">Email:</span>
                            <span>{user?.email}</span>
                          </div>
                          <div className="flex">
                            <span className="font-medium w-32">Phone:</span>
                            <span>{profile.phoneNumber || "Not provided"}</span>
                          </div>
                          <div className="flex">
                            <span className="font-medium w-32">Loyalty Tier:</span>
                            <span>{profile.loyaltyTier || "Standard"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h3 className="font-semibold mb-2">Preferences</h3>
                        <div className="flex flex-wrap gap-2">
                          {profile.preferences && profile.preferences.length > 0 ? (
                            profile.preferences.map((pref, index) => (
                              <span key={index} className="bg-primary/10 text-primary text-sm px-2 py-1 rounded">
                                {pref}
                              </span>
                            ))
                          ) : (
                            <p className="text-gray-500">No preferences set</p>
                          )}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h3 className="font-semibold mb-2">Account Activity</h3>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="bg-background p-4 rounded border">
                          <div className="text-2xl font-bold">{bookings?.length || 0}</div>
                          <div className="text-sm text-gray-500">Bookings</div>
                        </div>
                        <div className="bg-background p-4 rounded border">
                          <div className="text-2xl font-bold">{profile.reviewsProvided?.length || 0}</div>
                          <div className="text-sm text-gray-500">Reviews</div>
                        </div>
                        <div className="bg-background p-4 rounded border">
                          <div className="text-2xl font-bold">{profile.wishlist?.length || 0}</div>
                          <div className="text-sm text-gray-500">Wishlist</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button>Edit Profile</Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p>Loading profile information...</p>
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