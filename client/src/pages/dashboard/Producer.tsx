import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart, 
  Calendar, 
  Calendar as CalendarIcon, 
  CheckCircle, 
  Clock, 
  DollarSign, 
  FileText, 
  Image, 
  Sailboat, 
  Settings, 
  Star, 
  Upload, 
  Users
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { YachtCarousel } from "@/components/YachtCarousel";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { Yacht, Booking } from "@shared/schema";
import { ServiceProviderProfile, YachtExperience, Review, ProducerBooking } from "@shared/firestore-schema";

// Producer Dashboard Main Page
export default function ProducerDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [profileCompletion, setProfileCompletion] = useState(0);
  const [producerProfile, setProducerProfile] = useState<ServiceProviderProfile | null>(null);

  // Queries for producer data
  const { data: yachts, isLoading: yachtsLoading } = useQuery<YachtExperience[]>({
    queryKey: ["/api/yachts/producer"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<ProducerBooking[]>({
    queryKey: ["/api/bookings/producer"],
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ["/api/reviews/producer"],
  });

  // Get producer profile data
  useEffect(() => {
    const fetchProducerProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profileDocRef = doc(db, "user_profiles_service_provider", user.uid);
        try {
          const profileDoc = await getDoc(profileDocRef);
          if (profileDoc.exists()) {
            const profileData = profileDoc.data() as ServiceProviderProfile;
            setProducerProfile(profileData);
            
            // Calculate profile completion percentage
            const requiredFields = [
              'businessName', 
              'contactInformation', 
              'profilePhoto',
              'servicesOffered',
              'certifications'
            ];
            
            const optionalFields = [
              'yearsOfExperience',
              'industryAffiliations',
              'professionalDescription',
              'communicationPreferences',
              'complianceDocuments'
            ];
            
            let completedRequired = 0;
            let completedOptional = 0;
            
            requiredFields.forEach(field => {
              if (profileData[field as keyof ServiceProviderProfile]) {
                completedRequired++;
              }
            });
            
            optionalFields.forEach(field => {
              if (profileData[field as keyof ServiceProviderProfile]) {
                completedOptional++;
              }
            });
            
            const requiredWeight = 0.7; // 70% weight for required fields
            const optionalWeight = 0.3; // 30% weight for optional fields
            
            const requiredScore = (completedRequired / requiredFields.length) * requiredWeight;
            const optionalScore = (completedOptional / optionalFields.length) * optionalWeight;
            
            setProfileCompletion(Math.round((requiredScore + optionalScore) * 100));
          }
        } catch (error) {
          console.error("Error fetching producer profile:", error);
        }
      }
    };
    
    fetchProducerProfile();
  }, []);
  
  // Calculate dashboard statistics
  const totalBookings = bookings?.length || 0;
  const confirmedBookings = bookings?.filter(b => b.status === 'confirmed').length || 0;
  const pendingBookings = bookings?.filter(b => b.status === 'pending').length || 0;
  
  const currentMonthBookings = bookings?.filter(booking => {
    const bookingDate = new Date(booking.startDate);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && 
           bookingDate.getFullYear() === now.getFullYear();
  }).length || 0;
  
  const currentMonthRevenue = bookings?.filter(booking => {
    const bookingDate = new Date(booking.startDate);
    const now = new Date();
    return bookingDate.getMonth() === now.getMonth() && 
           bookingDate.getFullYear() === now.getFullYear() &&
           booking.status !== 'cancelled';
  }).reduce((sum, booking) => sum + booking.totalPrice, 0) || 0;
  
  const upcomingBookings = bookings?.filter(booking => {
    const bookingDate = new Date(booking.startDate);
    const now = new Date();
    return bookingDate > now && booking.status !== 'cancelled';
  }).slice(0, 5) || [];
  
  const averageRating = reviews?.length 
    ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) 
    : 'N/A';

  // Navigation functions
  const navigateToProfile = () => setLocation("/dashboard/producer/profile");
  const navigateToAssets = () => setLocation("/dashboard/producer/assets");
  const navigateToAvailability = () => setLocation("/dashboard/producer/availability");
  const navigateToCompliance = () => setLocation("/dashboard/producer/compliance");
  const navigateToReviews = () => setLocation("/dashboard/producer/reviews");

  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-bold">Producer Dashboard</h1>
            <p className="text-muted-foreground">
              Manage your yacht profiles, bookings, and business details
            </p>
          </div>
          
          <Card className="w-full md:w-auto">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="text-sm font-medium">Profile Completion</div>
                  <Progress value={profileCompletion} className="h-2 mt-2" />
                </div>
                <div className="font-bold text-lg">{profileCompletion}%</div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="yachts">My Yachts</TabsTrigger>
            <TabsTrigger value="earnings">Earnings</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Bookings
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalBookings}</div>
                  <p className="text-xs text-muted-foreground">
                    {confirmedBookings} confirmed, {pendingBookings} pending
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Month
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentMonthBookings}</div>
                  <p className="text-xs text-muted-foreground">
                    Bookings in {new Date().toLocaleString('default', { month: 'long' })}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">${currentMonthRevenue.toLocaleString()}</div>
                  <p className="text-xs text-muted-foreground">
                    This month's earnings
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">
                    Rating
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1">
                    <div className="text-2xl font-bold">{averageRating}</div>
                    {averageRating !== 'N/A' && <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {reviews?.length || 0} reviews
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Quick Links */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={navigateToProfile}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Users className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="font-medium">Profile</h3>
                  <p className="text-sm text-muted-foreground">Manage your business profile</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={navigateToAssets}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Sailboat className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="font-medium">Yachts & Services</h3>
                  <p className="text-sm text-muted-foreground">Manage your assets and offerings</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={navigateToAvailability}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <Calendar className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="font-medium">Availability & Pricing</h3>
                  <p className="text-sm text-muted-foreground">Set availability and pricing</p>
                </CardContent>
              </Card>
              
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={navigateToCompliance}>
                <CardContent className="p-6 flex flex-col items-center justify-center text-center">
                  <FileText className="h-8 w-8 mb-2 text-primary" />
                  <h3 className="font-medium">Compliance Documents</h3>
                  <p className="text-sm text-muted-foreground">Manage certifications and licenses</p>
                </CardContent>
              </Card>
            </div>
            
            {/* Upcoming Bookings */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
                <CardDescription>
                  Your next {upcomingBookings.length} scheduled bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bookingsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : upcomingBookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                    <h3 className="font-medium text-lg mb-1">No Upcoming Bookings</h3>
                    <p className="text-sm text-muted-foreground">
                      You don't have any upcoming bookings at the moment
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {upcomingBookings.map((booking) => (
                      <div
                        key={booking.id}
                        className="p-4 border rounded-lg flex justify-between items-center gap-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Calendar className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium">
                              {booking.customerDetails?.name || `Customer #${booking.userId.substring(0, 5)}`}
                            </p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              <CalendarIcon className="mr-1 h-3 w-3" />
                              {new Date(booking.startDate).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-medium">
                              ${booking.totalPrice}
                            </p>
                            <Badge variant={booking.status === 'confirmed' ? 'default' : 'outline'}>
                              {booking.status}
                            </Badge>
                          </div>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <Button variant="outline" className="w-full" onClick={() => setActiveTab("bookings")}>
                  View All Bookings
                </Button>
              </CardFooter>
            </Card>
            
            {/* Featured Yachts */}
            <Card>
              <CardHeader>
                <CardTitle>My Yachts</CardTitle>
                <CardDescription>
                  Your yacht listings ({yachts?.length || 0} total)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <YachtCarousel 
                  yachts={yachts || []} 
                  isLoading={yachtsLoading} 
                />
              </CardContent>
              <CardFooter className="border-t px-6 py-4">
                <div className="flex w-full gap-4">
                  <Button variant="outline" className="flex-1" onClick={navigateToAssets}>
                    Manage Yachts
                  </Button>
                  <Button className="flex-1" onClick={() => setLocation("/dashboard/producer/assets/new")}>
                    Add New Yacht
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </TabsContent>

          {/* Other tabs will be implemented separately */}
          <TabsContent value="bookings">
            <Card>
              <CardHeader>
                <CardTitle>All Bookings</CardTitle>
                <CardDescription>
                  Manage your bookings and reservations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center py-10">
                  Navigate to the Bookings Management page to view and manage all your bookings
                </p>
                <Button className="w-full" onClick={() => setLocation("/dashboard/producer/bookings")}>
                  Go to Bookings Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="yachts">
            <Card>
              <CardHeader>
                <CardTitle>My Yachts</CardTitle>
                <CardDescription>
                  Manage all your yacht listings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center py-10">
                  Navigate to the Yachts Management page to add, edit, or remove yacht listings
                </p>
                <Button className="w-full" onClick={navigateToAssets}>
                  Go to Yacht Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="earnings">
            <Card>
              <CardHeader>
                <CardTitle>Earnings Dashboard</CardTitle>
                <CardDescription>
                  Track your earnings, payouts, and financial performance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center py-10">
                  Navigate to the Earnings Dashboard to view detailed financial analytics
                </p>
                <Button className="w-full" onClick={() => setLocation("/dashboard/producer/earnings")}>
                  Go to Earnings Dashboard
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="reviews">
            <Card>
              <CardHeader>
                <CardTitle>Customer Reviews</CardTitle>
                <CardDescription>
                  View and respond to your customer reviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-center py-10">
                  Navigate to the Reviews Management page to view and respond to customer feedback
                </p>
                <Button className="w-full" onClick={navigateToReviews}>
                  Go to Reviews Management
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
