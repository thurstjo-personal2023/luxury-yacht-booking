import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ChevronDown, Pencil } from "lucide-react";
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
import { PlacesAutocomplete } from "@/components/ui/places-autocomplete";
import { YachtCarousel } from "@/components/YachtCarousel";
import axios from 'axios';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Switch } from '@/components/ui/switch';
import { useAuthService } from '@/hooks/useAuthService';

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
  const [user] = useAuthState(auth);
  const [location, setLocation] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [selectedActivities, setSelectedActivities] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 10000]);
  const [duration, setDuration] = useState<string>("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationOption | null>(null);
  const { user: authUser, profileData } = useAuthService();


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

  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: '',
    nationality: '',
    language: 'English',
    currency: 'USD',
    dietaryRestrictions: '',
    accessibility: '',
    loyaltyPoints: 0
  });

  useEffect(() => {
    if (profileData) {
      setFormData({
        name: profileData.name || '',
        email: profileData.email || '',
        phone: profileData.phone || '',
        dateOfBirth: profileData.dateOfBirth || '',
        gender: profileData.gender || '',
        nationality: profileData.nationality || '',
        language: profileData.language || 'English',
        currency: profileData.currency || 'USD',
        dietaryRestrictions: profileData.dietaryRestrictions || '',
        accessibility: profileData.accessibility || '',
        loyaltyPoints: profileData.loyaltyPoints || 0
      });
    }
  }, [profileData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implement save functionality
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    }
  };

  const updateProfileField = async (field: string, value: any) => {
    try {
      if (!user?.uid) return;

      const response = await axios.post('/api/user/update-profile', {
        [field]: value
      });

      if (response.data.success) {
        // Refresh profile data
        //refreshUserData(); //This function is not defined in the original code.  Removed for now.
      }
    } catch (error) {
      console.error('Error updating profile field:', error);
      toast({
        title: "Update Failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive"
      });
    }
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
                              <h3 className="font-semibold">{booking.packageId}</h3>
                              <p className="text-sm text-gray-500">
                                {new Date(booking.startDate).toLocaleDateString()} -
                                {new Date(booking.endDate).toLocaleDateString()}
                              </p>
                              <div className="mt-2">
                                <span className={`px-2 py-1 text-xs rounded ${
                                  booking.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                    booking.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                      'bg-red-100 text-red-800'
                                }`}>
                                  {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="font-semibold">${booking.totalPrice}</div>
                              <Button size="sm" variant="outline" className="mt-2">View Details</Button>
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
            <div className="container mx-auto px-4 py-6 space-y-6">
              {/* Profile Header with Image */}
              <div className="relative bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg p-6 mb-8">
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="relative group">
                    <Avatar className="h-24 w-24 ring-2 ring-offset-2 ring-primary">
                      <AvatarImage src={profileData?.profilePhoto} />
                      <AvatarFallback>{formData.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <label htmlFor="profile-photo" className="cursor-pointer p-2">
                        <Pencil className="h-5 w-5 text-white" />
                      </label>
                      <input 
                        id="profile-photo" 
                        type="file" 
                        className="hidden" 
                        accept="image/*"
                        onChange={(e) => updateProfileField('profilePhoto', e.target.files?.[0])} 
                      />
                    </div>
                  </div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{formData.name || 'Your Profile'}</h2>
                    <p className="text-muted-foreground">Member since {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                  <Badge variant="outline" className="bg-primary/10">
                    {profileData?.membershipTier || 'Standard'} Member
                  </Badge>
                </div>
              </div>

              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Basic Information</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Full Name</label>
                      <Input
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Email</label>
                      <Input
                        name="email"
                        value={formData.email}
                        disabled
                        className="bg-muted"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Phone Number</label>
                      <Input
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        className="bg-background"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Demographics */}
              <Collapsible defaultOpen>
                <CollapsibleTrigger className="w-full">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                      <CardTitle>Demographics</CardTitle>
                      <ChevronDown className="h-6 w-6 transition-transform ui-expanded:rotate-180" />
                    </CardHeader>
                  </Card>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="mt-2">
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Date of Birth</label>
                          <Input
                            name="dateOfBirth"
                            type="date"
                            value={formData.dateOfBirth}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="bg-background"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Gender</label>
                          <Select 
                            disabled={!isEditing}
                            value={formData.gender}
                            onValueChange={(value) => handleInputChange({ target: { name: 'gender', value }})}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="male">Male</SelectItem>
                              <SelectItem value="female">Female</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                              <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nationality</label>
                          <Input
                            name="nationality"
                            value={formData.nationality}
                            onChange={handleInputChange}
                            disabled={!isEditing}
                            className="bg-background"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              {/* Preferences */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Preferences</CardTitle>
                    <Button variant="ghost" size="icon" onClick={() => setIsEditing(!isEditing)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preferred Language</label>
                      <Select 
                        disabled={!isEditing}
                        value={formData.language}
                        onValueChange={(value) => handleInputChange({ target: { name: 'language', value }})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="english">English</SelectItem>
                          <SelectItem value="arabic">Arabic</SelectItem>
                          <SelectItem value="french">French</SelectItem>
                          <SelectItem value="spanish">Spanish</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Preferred Currency</label>
                      <Select 
                        disabled={!isEditing}
                        value={formData.currency}
                        onValueChange={(value) => handleInputChange({ target: { name: 'currency', value }})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD</SelectItem>
                          <SelectItem value="EUR">EUR</SelectItem>
                          <SelectItem value="GBP">GBP</SelectItem>
                          <SelectItem value="AED">AED</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Dietary Restrictions</label>
                      <Input
                        name="dietaryRestrictions"
                        value={formData.dietaryRestrictions}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter any dietary restrictions"
                        className="bg-background"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Accessibility Requirements</label>
                      <Input
                        name="accessibility"
                        value={formData.accessibility}
                        onChange={handleInputChange}
                        disabled={!isEditing}
                        placeholder="Enter any accessibility requirements"
                        className="bg-background"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Loyalty Program */}
              <Card className="bg-gradient-to-r from-primary/5 to-primary/10">
                <CardHeader>
                  <CardTitle>Loyalty Program</CardTitle>
                  <CardDescription>Track your rewards and membership status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Current Points</p>
                        <p className="text-2xl font-bold">{formData.loyaltyPoints}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Next Tier</p>
                        <p className="text-sm">{profileData?.nextTier || 'Gold'}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress to next tier</span>
                        <span>45%</span>
                      </div>
                      <Progress value={45} className="h-2" />
                    </div>
                    <div className="bg-primary/5 rounded-lg p-4">
                      <p className="text-sm text-muted-foreground">
                        Earn 500 more points to reach Gold tier and unlock exclusive benefits
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {isEditing && (
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSave}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}