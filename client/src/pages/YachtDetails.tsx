import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious 
} from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YachtCarousel } from "@/components/YachtCarousel";
import { Badge } from "@/components/ui/badge";
import { CalendarDateRangePicker } from "@/components/ui/date-range-picker";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Anchor, Users, Clock, Map, CalendarRange, Star, Check, ExternalLink } from "lucide-react";
import { Link } from "wouter";
import type { YachtExperience } from "@shared/firestore-schema";

export default function YachtDetails() {
  const [, params] = useRoute("/yacht/:id");
  const yachtId = params?.id;
  const [yacht, setYacht] = useState<YachtExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [relatedYachts, setRelatedYachts] = useState<YachtExperience[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    async function fetchYachtDetails() {
      if (!yachtId) return;

      setLoading(true);
      try {
        const yachtRef = doc(db, "experience_packages", yachtId);
        const yachtDoc = await getDoc(yachtRef);

        if (yachtDoc.exists()) {
          setYacht({ id: yachtDoc.id, ...yachtDoc.data() } as YachtExperience);

          // Fetch related yachts
          // TODO: Implement a more sophisticated recommendation algorithm
          // For now, just fetch packages with the same category or region
          const data = yachtDoc.data();
          if (data) {
            // We'll implement this in a future iteration
            setRelatedYachts([]);
          }
        } else {
          toast({
            title: "Yacht not found",
            description: "The yacht you're looking for doesn't exist or has been removed.",
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error("Error fetching yacht details:", error);
        toast({
          title: "Failed to load details",
          description: "There was an error loading the yacht details. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }

    fetchYachtDetails();
  }, [yachtId, toast]);

  const handleBooking = () => {
    if (!dateRange?.from || !dateRange?.to) {
      toast({
        title: "Date selection required",
        description: "Please select start and end dates for your booking.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Booking initiated",
      description: "Your booking request has been received. Redirecting to checkout...",
    });

    // In a real app, you would redirect to a checkout page
    // or open a booking modal with additional options
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4 md:p-8">
          <div className="flex items-center mb-6">
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="h-[400px] w-full bg-muted animate-pulse rounded-lg mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-10 w-2/3 bg-muted animate-pulse rounded mb-4"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-3/4 bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!yacht) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Yacht Not Found</h1>
          <p className="text-muted-foreground mb-6">
            The yacht experience you're looking for couldn't be found or has been removed.
          </p>
          <Link href="/dashboard/consumer">
            <Button>Return to Dashboard</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        {/* Back button */}
        <Link href="/dashboard/consumer">
          <Button variant="ghost" className="mb-6 hover:bg-transparent p-0 flex items-center">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to Search</span>
          </Button>
        </Link>

        {/* Image Gallery */}
        <div className="mb-8">
          <Carousel className="w-full">
            <CarouselContent>
              {yacht.media && yacht.media.length > 0 ? (
                yacht.media.map((item, index) => (
                  <CarouselItem key={index} className="basis-full">
                    <div className="relative h-[400px] w-full overflow-hidden rounded-lg">
                      <img 
                        src={item.url} 
                        alt={`${yacht.title} - Photo ${index + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="relative h-[400px] w-full overflow-hidden rounded-lg bg-muted flex items-center justify-center">
                    <p className="text-muted-foreground">No images available</p>
                  </div>
                </CarouselItem>
              )}
            </CarouselContent>
            <CarouselPrevious className="left-4" />
            <CarouselNext className="right-4" />
          </Carousel>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-3xl font-bold">{yacht.title}</h1>
              <div className="flex items-center">
                <Star className="h-5 w-5 text-yellow-500 mr-1" fill="currentColor" />
                <span className="font-medium">
                  {yacht.reviews && yacht.reviews.length > 0
                    ? (yacht.reviews.reduce((sum, review) => sum + review.rating, 0) / yacht.reviews.length).toFixed(1)
                    : "New"}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {yacht.tags && yacht.tags.map((tag, index) => (
                <Badge key={index} variant="secondary">{tag}</Badge>
              ))}
            </div>

            <div className="flex items-center text-muted-foreground mb-6">
              <Map className="h-4 w-4 mr-1" />
              <span>{yacht.location?.address || "Location unavailable"}</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Clock className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="font-medium">{yacht.duration} hours</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Users className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm text-muted-foreground">Capacity</span>
                <span className="font-medium">{yacht.capacity} people</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <Anchor className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm text-muted-foreground">Port</span>
                <span className="font-medium">{yacht.location?.port_marina || "Not specified"}</span>
              </div>
              <div className="flex flex-col items-center p-3 bg-muted/30 rounded-lg">
                <CalendarRange className="h-5 w-5 mb-1 text-primary" />
                <span className="text-sm text-muted-foreground">Available</span>
                <span className="font-medium">{yacht.availability_status ? "Yes" : "No"}</span>
              </div>
            </div>

            <Tabs defaultValue="description" className="mb-8">
              <TabsList>
                <TabsTrigger value="description">Description</TabsTrigger>
                <TabsTrigger value="features">Features</TabsTrigger>
                <TabsTrigger value="customization">Customization</TabsTrigger>
              </TabsList>
              <TabsContent value="description" className="mt-4">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground">{yacht.description}</p>
                </div>
              </TabsContent>
              <TabsContent value="features" className="mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {yacht.category && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span>{yacht.category}</span>
                    </div>
                  )}
                  {/* You would typically map through a features array here */}
                  {/* For now, let's display the tags as features */}
                  {yacht.tags && yacht.tags.map((tag, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span>{tag}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="customization" className="mt-4">
                {yacht.customization_options && yacht.customization_options.length > 0 ? (
                  <div className="space-y-2">
                    {yacht.customization_options.map((option, index) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-muted/30 rounded">
                        <span>{option.name}</span>
                        <span className="font-semibold">${option.price}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No customization options available for this package.</p>
                )}
              </TabsContent>
            </Tabs>

            {/* Call to action for mobile */}
            <div className="block md:hidden mb-8">
              <Card>
                <CardHeader>
                  <CardTitle>Book This Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Price</span>
                      <div className="text-2xl font-bold">${yacht.pricing}</div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Dates</label>
                      <CalendarDateRangePicker 
                        date={dateRange}
                        onDateRangeChange={setDateRange} 
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleBooking}
                    disabled={!yacht.availability_status}
                  >
                    {yacht.availability_status ? "Book Now" : "Currently Unavailable"}
                  </Button>
                </CardFooter>
              </Card>
            </div>

            {/* Location */}
            <div className="mb-8">
              <h2 className="text-xl font-bold mb-4">Location</h2>
              {yacht.location && (
                <div className="rounded-lg overflow-hidden h-[300px] bg-muted">
                  {/* In a real implementation, you would display a map here using Google Maps or similar */}
                  <div className="h-full w-full flex items-center justify-center">
                    <div className="text-center p-4">
                      <p className="font-medium mb-2">{yacht.location.port_marina}</p>
                      <p className="text-muted-foreground mb-4">{yacht.location.address}</p>
                      <a 
                        href={`https://www.google.com/maps/search/?api=1&query=${yacht.location.latitude},${yacht.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-primary hover:underline"
                      >
                        View on Google Maps
                        <ExternalLink className="ml-1 h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Reviews section could be added here */}
          </div>

          {/* Booking Widget - Desktop */}
          <div className="hidden md:block">
            <div className="sticky top-24">
              <Card>
                <CardHeader>
                  <CardTitle>Book This Experience</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Price</span>
                      <div>
                        <span className="text-2xl font-bold">${yacht.pricing}</span>
                        {yacht.pricing_model === "Variable" && 
                          <span className="text-muted-foreground text-sm ml-1">starting from</span>
                        }
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Select Dates</label>
                      <CalendarDateRangePicker 
                        date={dateRange}
                        onDateRangeChange={setDateRange} 
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg"
                    onClick={handleBooking}
                    disabled={!yacht.availability_status}
                  >
                    {yacht.availability_status ? "Book Now" : "Currently Unavailable"}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>

        {/* Similar Experiences */}
        {relatedYachts.length > 0 && (
          <div className="mt-12">
            <YachtCarousel 
              yachts={relatedYachts}
              title="Similar Experiences"
              description="You might also be interested in these yacht experiences"
            />
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}