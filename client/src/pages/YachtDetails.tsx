import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { doc, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
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
import { DateTimePicker, TimeSlot } from "@/components/ui/date-time-picker";
import { useToast } from "@/hooks/use-toast";
import { DateRange } from "react-day-picker";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Anchor, Users, Clock, Map, CalendarRange, Star, Check, ExternalLink, Play, X } from "lucide-react";
import type { YachtExperience } from "@shared/firestore-schema";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { VirtualTourViewer } from "@/components/VirtualTourViewer";

// Add-on type
interface AddOn {
  id: string;
  product_id: string;
  name: string;
  description: string;
  category: string;
  pricing: number;
  media?: {
    type: string;
    url: string;
  }[];
  availability: boolean;
  tags: string[];
}

// Selected add-on interface for tracking
interface SelectedAddOn {
  uniqueId: string;
  productId: string;
  name: string;
  price: number;
}

export default function YachtDetails() {
  const [, params] = useRoute("/yacht/:id");
  const yachtId = params?.id;
  const [yacht, setYacht] = useState<YachtExperience | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>();
  const [availableTimeSlots, setAvailableTimeSlots] = useState<TimeSlot[]>([]);
  const [relatedYachts, setRelatedYachts] = useState<YachtExperience[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const { toast } = useToast();
  const [activeVideoUrl, setActiveVideoUrl] = useState<string | null>(null);

  useEffect(() => {
    async function fetchYachtDetails() {
      if (!yachtId) return;

      setLoading(true);
      try {
        const yachtRef = doc(db, "experience_packages", yachtId);
        const yachtDoc = await getDoc(yachtRef);

        if (yachtDoc.exists()) {
          const yachtData = { id: yachtDoc.id, ...yachtDoc.data() } as YachtExperience;
          setYacht(yachtData);

          // Set initial total price
          setTotalPrice(yachtData.pricing || 0);

          // Fetch add-ons if any customization options are present
          if (yachtData.customization_options && yachtData.customization_options.length > 0) {
            const productIds = yachtData.customization_options.map(option => option.product_id);
            console.log("Product IDs to fetch:", productIds);

            try {
              const addOnsRef = collection(db, "products_add_ons");
              const q = query(addOnsRef, where("product_id", "in", productIds));
              const addOnsSnapshot = await getDocs(q);

              if (!addOnsSnapshot.empty) {
                const addOnsData = addOnsSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as AddOn[];
                console.log("Fetched add-ons:", addOnsData);
                setAddOns(addOnsData);
              }
            } catch (error) {
              console.error("Error fetching add-ons:", error);
            }
          }

          // Fetch related yachts
          try {
            const experiencesRef = collection(db, "experience_packages");
            let relatedQuery;

            // First try to find yachts in the same category
            if (yachtData.category) {
              relatedQuery = query(
                experiencesRef, 
                where("category", "==", yachtData.category),
                where("id", "!=", yachtId),
                limit(3)
              );
            } else if (yachtData.location && yachtData.location.address) {
              // If no category, try to find yachts in the same region
              const regionTerms = ["Dubai", "Abu Dhabi"];
              let region = "";

              for (const term of regionTerms) {
                if (yachtData.location.address.includes(term)) {
                  region = term;
                  break;
                }
              }

              if (region) {
                relatedQuery = query(
                  experiencesRef,
                  where("location.address", "array-contains", region),
                  where("id", "!=", yachtId),
                  limit(3)
                );
              }
            }

            if (relatedQuery) {
              const relatedSnapshot = await getDocs(relatedQuery);
              if (!relatedSnapshot.empty) {
                const relatedData = relatedSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as YachtExperience[];
                setRelatedYachts(relatedData);
              }
            }

            // If no related yachts found by category or location, get random ones
            if (!relatedYachts.length) {
              const randomQuery = query(
                experiencesRef,
                where("published_status", "==", true),
                where("id", "!=", yachtId),
                limit(3)
              );

              const randomSnapshot = await getDocs(randomQuery);
              if (!randomSnapshot.empty) {
                const randomData = randomSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data()
                })) as YachtExperience[];
                setRelatedYachts(randomData);
              }
            }
          } catch (error) {
            console.error("Error fetching related yachts:", error);
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

  // Calculate total price based on base price and selected add-ons
  useEffect(() => {
    if (!yacht) return;

    let price = yacht.pricing || 0;

    // Add prices for selected add-ons
    if (selectedAddOns.length > 0) {
      const addOnTotal = selectedAddOns.reduce((sum, addon) => sum + addon.price, 0);
      price += addOnTotal;
    }

    console.log("Updated total price:", price, "Selected add-ons:", selectedAddOns);
    setTotalPrice(price);
  }, [yacht, selectedAddOns]);

  const handleBooking = () => {
    if (!selectedDate) {
      toast({
        title: "Date selection required",
        description: "Please select a date for your booking.",
        variant: "destructive"
      });
      return;
    }
    
    if (!selectedTimeSlot) {
      toast({
        title: "Time slot required",
        description: "Please select a time slot for your booking.",
        variant: "destructive"
      });
      return;
    }

    // For our simplified booking model, we'll consider it a single-day booking
    // In a more complex system, we would support multi-day bookings
    const days = 1;
    const grandTotal = totalPrice * days;

    toast({
      title: "Booking initiated",
      description: `Your booking for ${selectedTimeSlot.label} on ${selectedDate.toLocaleDateString()} is being processed. Redirecting to checkout...`,
    });

    // Create a date range object for compatibility with the existing booking summary page
    const dateRange = {
      from: selectedDate,
      to: selectedDate,  // For single-day bookings, from and to are the same
    };

    // Save booking data to sessionStorage so the BookingSummary page can access it
    const bookingData = {
      yacht,
      selectedAddOns,
      dateRange,
      timeSlot: selectedTimeSlot,
      totalPrice,
      days
    };
    
    try {
      sessionStorage.setItem('bookingSummaryData', JSON.stringify(bookingData));
      // Redirect to the booking summary page
      window.location.href = '/booking-summary';
    } catch (error) {
      console.error("Error saving booking data:", error);
      toast({
        title: "Error processing booking",
        description: "There was an error processing your booking. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleAddOnToggle = (uniqueId: string, productId: string, name: string, price: number) => {
    console.log("Toggling add-on:", { uniqueId, productId, name, price });

    setSelectedAddOns(current => {
      // Check if this specific add-on is already selected by its unique ID
      const isSelected = current.some(addon => addon.uniqueId === uniqueId);

      if (isSelected) {
        // Remove this specific add-on
        console.log("Removing add-on:", uniqueId);
        return current.filter(addon => addon.uniqueId !== uniqueId);
      } else {
        // Add this specific add-on
        console.log("Adding add-on:", uniqueId);
        return [...current, { uniqueId, productId, name, price }];
      }
    });
  };

  // Helper function to ensure tags are in array format
  const getTagsArray = (): string[] => {
    if (!yacht) return [];

    if (Array.isArray(yacht.tags)) {
      return yacht.tags as string[];
    } else if (typeof yacht.tags === 'string') {
      return (yacht.tags as string).split(',').map((tag: string) => tag.trim());
    } else if (yacht.tags) {
      // If it's some other non-null value, try to convert to string and split
      return String(yacht.tags).split(',').map((tag: string) => tag.trim());
    }

    return [];
  };

  // Function to check available time slots for a given date
  const getAvailableTimeSlots = async (date: Date): Promise<TimeSlot[]> => {
    if (!yacht) return [];
    
    // In a real app, this would query a backend API to get available time slots based on bookings
    // For our demo, we'll generate time slots based on the yacht's duration
    
    // Format the date for logging
    const formattedDate = date.toLocaleDateString();
    console.log(`Checking available time slots for ${formattedDate}`);
    
    // If yacht is not available at all, return empty array
    if (!yacht.availability_status) {
      return [];
    }
    
    // If date is in the past, no slots available
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date < today) {
      return [];
    }
    
    // If date is more than 90 days in the future, no slots available
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
    if (date > ninetyDaysFromNow) {
      return [];
    }
    
    // Standard time slots
    const timeSlots: TimeSlot[] = [];
    const duration = yacht.duration || 4; // default to 4 hours if no duration specified
    
    // Generate standard time slots based on duration
    if (duration <= 4) {
      // For short experiences (up to 4 hours), offer multiple slots per day
      timeSlots.push(
        {
          id: "morning",
          startTime: "09:00",
          endTime: `${9 + duration}:00`,
          label: `Morning (9:00 AM - ${9 + duration}:00 PM)`,
          available: true
        },
        {
          id: "afternoon",
          startTime: "13:00",
          endTime: `${13 + duration}:00`,
          label: `Afternoon (1:00 PM - ${(13 + duration) % 12 || 12}:00 ${13 + duration >= 12 ? 'PM' : 'AM'})`,
          available: true
        }
      );
      
      // Add evening slot if it would end by 9 PM
      if (17 + duration <= 21) {
        timeSlots.push({
          id: "evening",
          startTime: "17:00",
          endTime: `${17 + duration}:00`,
          label: `Evening (5:00 PM - ${(17 + duration) % 12 || 12}:00 ${17 + duration >= 12 ? 'PM' : 'AM'})`,
          available: true
        });
      }
    } else if (duration <= 8) {
      // For medium-length experiences (5-8 hours), offer two slots per day
      timeSlots.push(
        {
          id: "morning-extended",
          startTime: "09:00",
          endTime: `${9 + duration}:00`,
          label: `Morning to ${(9 + duration) >= 12 ? 'Afternoon' : 'Evening'} (9:00 AM - ${(9 + duration) % 12 || 12}:00 ${9 + duration >= 12 ? 'PM' : 'AM'})`,
          available: true
        }
      );
      
      // Add afternoon slot only if it would end by 10 PM
      if (13 + duration <= 22) {
        timeSlots.push({
          id: "afternoon-extended",
          startTime: "13:00",
          endTime: `${13 + duration}:00`,
          label: `Afternoon to Evening (1:00 PM - ${(13 + duration) % 12 || 12}:00 ${13 + duration >= 12 ? 'PM' : 'AM'})`,
          available: true
        });
      }
    } else {
      // For full-day or multi-day experiences, offer a single "full day" slot
      timeSlots.push({
        id: "full-day",
        startTime: "09:00",
        endTime: "17:00",
        label: "Full Day (9:00 AM - 5:00 PM)",
        available: true
      });
    }
    
    // In a real app, we would check against existing bookings here
    // and mark time slots as unavailable accordingly
    
    // For demo purposes, let's randomly make some slots unavailable
    // This simulates some slots being already booked
    const simulateRandomAvailability = (slot: TimeSlot) => {
      // Ensure slots for today and tomorrow are always available for demo purposes
      const isToday = date.getDate() === today.getDate() && 
                      date.getMonth() === today.getMonth() && 
                      date.getFullYear() === today.getFullYear();
      
      const isTomorrow = date.getDate() === new Date(today.getTime() + 86400000).getDate() && 
                         date.getMonth() === today.getMonth() && 
                         date.getFullYear() === today.getFullYear();
      
      if (isToday || isTomorrow) {
        return { ...slot, available: true };
      }
      
      // For other dates, randomly make some slots unavailable
      return { 
        ...slot, 
        available: Math.random() > 0.3 // 70% chance of being available
      };
    };
    
    return timeSlots.map(simulateRandomAvailability);
  };
  
  // Generate initial time slots when yacht data is loaded
  useEffect(() => {
    if (yacht) {
      const today = new Date();
      getAvailableTimeSlots(today).then(slots => {
        setAvailableTimeSlots(slots);
      });
    }
  }, [yacht]);

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

  // Sample virtual tour data for testing if none exists in the yacht data
  const sampleVirtualTourScenes = [
    {
      id: "deck",
      title: "Yacht Main Deck",
      imageUrl: "https://pannellum.org/images/alma.jpg",
      hotspots: [
        {
          id: "info-1",
          pitch: -12,
          yaw: 34,
          text: "Spacious sun deck with premium lounge furniture",
          type: "info" as const
        },
        {
          id: "scene-to-cabin",
          pitch: -28,
          yaw: 174,
          text: "Enter Cabin",
          type: "scene" as const,
          sceneId: "cabin"
        }
      ],
      initialViewParameters: {
        pitch: -3,
        yaw: 117,
        hfov: 110
      }
    },
    {
      id: "cabin",
      title: "Luxury Cabin",
      imageUrl: "https://pannellum.org/images/bma-1.jpg",
      hotspots: [
        {
          id: "info-2",
          pitch: -9,
          yaw: 40,
          text: "Queen-size bed with premium linens",
          type: "info" as const
        },
        {
          id: "scene-to-deck",
          pitch: 0,
          yaw: -120,
          text: "Return to Main Deck",
          type: "scene" as const,
          sceneId: "deck"
        }
      ],
      initialViewParameters: {
        pitch: 0,
        yaw: 5,
        hfov: 110
      }
    },
    {
      id: "lounge",
      title: "VIP Lounge Area",
      imageUrl: "https://pannellum.org/images/cerro-toco-0.jpg",
      hotspots: [
        {
          id: "info-3",
          pitch: 5,
          yaw: 60,
          text: "Exclusive VIP seating with panoramic views",
          type: "info" as const
        },
        {
          id: "scene-to-deck",
          pitch: -5,
          yaw: -60,
          text: "Back to Main Deck",
          type: "scene" as const,
          sceneId: "deck"
        }
      ],
      initialViewParameters: {
        pitch: 0,
        yaw: 0,
        hfov: 100
      }
    }
  ];

  // Use yacht's virtual tour data if available, otherwise use sample data for testing
  const virtualTourScenes = (yacht.virtual_tour?.enabled && yacht.virtual_tour.scenes?.length > 0) 
    ? yacht.virtual_tour.scenes 
    : sampleVirtualTourScenes;

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

        {/* Image & Video Gallery */}
        <div className="mb-8">
          <Carousel className="w-full">
            <CarouselContent>
              {yacht.media && yacht.media.length > 0 ? (
                yacht.media.map((item, index) => (
                  <CarouselItem key={index} className="basis-full">
                    <div className="relative h-[400px] w-full overflow-hidden rounded-lg group">
                      {item.type === "video" ? (
                        <>
                          <img 
                            src={yacht.media?.find(m => m.type === "image")?.url || item.url} 
                            alt={`${yacht.title} - Video thumbnail`}
                            className="h-full w-full object-cover brightness-75"
                          />
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button 
                                className="absolute inset-0 m-auto h-16 w-16 rounded-full bg-black/30 backdrop-blur-sm hover:bg-black/50 transition-all group-hover:scale-110"
                                variant="ghost"
                              >
                                <Play className="h-8 w-8 text-white" fill="white" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl p-0 bg-black">
                              <div className="relative pt-[56.25%]">
                                <iframe
                                  src={item.url}
                                  className="absolute top-0 left-0 w-full h-full"
                                  allowFullScreen
                                ></iframe>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </>
                      ) : (
                        <img 
                          src={item.url} 
                          alt={`${yacht.title} - Photo ${index + 1}`}
                          className="h-full w-full object-cover"
                        />
                      )}
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
              {getTagsArray().map((tag, index) => (
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
                <TabsTrigger value="features">Features & Add-Ons</TabsTrigger>
                <TabsTrigger value="location">Location</TabsTrigger>
                <TabsTrigger value="virtual-tour">Virtual Tour</TabsTrigger>
              </TabsList>

              <TabsContent value="description" className="mt-4">
                <div className="prose max-w-none">
                  <p className="text-muted-foreground whitespace-pre-line">{yacht.description}</p>
                </div>
              </TabsContent>

              <TabsContent value="features" className="mt-4">
                <h3 className="text-lg font-semibold mb-2">✅ Included Features</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-6">
                  {yacht.category && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span>{yacht.category}</span>
                    </div>
                  )}

                  {/* Display yacht type as a feature */}
                  {yacht.yacht_type && (
                    <div className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span>{yacht.yacht_type} Yacht</span>
                    </div>
                  )}

                  {/* Display tags as features */}
                  {getTagsArray().map((tag, index) => (
                    <div key={index} className="flex items-center">
                      <Check className="h-4 w-4 mr-2 text-primary" />
                      <span>{tag}</span>
                    </div>
                  ))}

                  {/* Display standard amenities */}
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Professional Captain & Crew</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Fuel & Basic Refreshments</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Safety Equipment</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2 text-primary" />
                    <span>Towels & Basic Amenities</span>
                  </div>
                </div>

                {/* Optional Add-Ons */}
                <h3 className="text-lg font-semibold mb-2">✅ Optional Add-Ons</h3>
                {yacht.customization_options && yacht.customization_options.length > 0 ? (
                  <div className="space-y-3">
                    {yacht.customization_options.map((option, index) => {
                      // Find matching detailed add-on if available
                      const addOnDetails = addOns.find(addOn => addOn.product_id === option.product_id);
                      const uniqueId = `addon-${option.product_id}-${index}`; // Create a truly unique ID for each option

                      // Check if this specific add-on is selected by its unique ID
                      const isSelected = selectedAddOns.some(addon => addon.uniqueId === uniqueId);

                      return (
                        <div key={uniqueId} className="flex items-start p-3 border rounded-lg">
                          <Checkbox 
                            id={uniqueId}
                            checked={isSelected}
                            onCheckedChange={() => handleAddOnToggle(uniqueId, option.product_id, option.name, option.price)}
                            className="mt-1 mr-3"
                          />
                          <div className="flex-1">
                            <label 
                              htmlFor={uniqueId}
                              className="font-medium cursor-pointer"
                            >
                              {option.name}
                              <span className="ml-2 font-bold text-primary">+${option.price}</span>
                            </label>
                            {addOnDetails && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {addOnDetails.description || "Enhance your experience with this premium add-on."}
                              </p>
                            )}
                          </div>
                          {addOnDetails?.media && addOnDetails.media.length > 0 && (
                            <div className="w-16 h-16 rounded overflow-hidden ml-2 flex-shrink-0">
                              <img 
                                src={addOnDetails.media[0].url} 
                                alt={option.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground">No customization options available for this package.</p>
                )}
              </TabsContent>

              <TabsContent value="location" className="mt-4">
                {yacht.location && (
                  <div className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-semibold mb-2">Departure Location</h3>
                      <p className="text-muted-foreground mb-2">{yacht.location.address}</p>
                      <p className="text-sm text-muted-foreground mb-4">
                        {yacht.location.port_marina && <span className="font-medium">Port/Marina: </span>}
                        {yacht.location.port_marina || ""}
                      </p>

                      {yacht.location.latitude && yacht.location.longitude && (
                        <a 
                          href={`https://www.google.com/maps/search/?api=1&query=${yacht.location.latitude},${yacht.location.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center text-primary hover:underline"
                        >
                          View on Google Maps
                          <ExternalLink className="ml-1 h-3 w-3" />
                        </a>
                      )}
                    </div>

                    {/* Google Maps Preview */}
                    {yacht.location.latitude && yacht.location.longitude && (
                      <div className="rounded-lg overflow-hidden h-[300px] bg-muted">
                        <img 
                          src={`https://maps.googleapis.com/maps/api/staticmap?center=${yacht.location.latitude},${yacht.location.longitude}&zoom=14&size=800x300&markers=color:red%7C${yacht.location.latitude},${yacht.location.longitude}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`}
                          alt="Map location"
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = "https://placehold.co/800x300/e6e6e6/929292?text=Location+Map+Preview";
                          }}
                        />
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              {/* Virtual Tour tab content */}
              <TabsContent value="virtual-tour" className="mt-4">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-semibold">360° Virtual Tour</h3>
                    <Badge variant="outline">
                      {virtualTourScenes.length} scenes available
                    </Badge>
                  </div>

                  <p className="text-muted-foreground mb-4">
                    Explore this yacht in immersive 360° view. Navigate between different areas using hotspots or the control panel.
                  </p>

                  <div className="rounded-lg overflow-hidden border">
                    <VirtualTourViewer 
                      scenes={virtualTourScenes}
                      initialSceneId={virtualTourScenes[0]?.id}
                      height="500px"
                      width="100%"
                      className="rounded-lg"
                    />
                  </div>

                  <div className="p-4 bg-muted/30 rounded-lg mt-4">
                    <h4 className="font-medium mb-2">How to navigate:</h4>
                    <ul className="space-y-1 text-sm text-muted-foreground">
                      <li>• Click and drag to look around in 360 degrees</li>
                      <li>• Use mouse wheel to zoom in and out</li>
                      <li>• Click on hotspots (highlighted points) to view details or move to different areas</li>
                      <li>• Use the navigation controls to switch between different scenes</li>
                    </ul>
                  </div>
                </div>
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
                      <span className="text-muted-foreground">Base Price</span>
                      <div className="text-2xl font-bold">${yacht.pricing}/day</div>
                    </div>

                    {selectedAddOns.length > 0 && (
                      <div className="pt-2 space-y-2 border-t">
                        <p className="text-sm font-medium">Selected Add-Ons:</p>
                        {selectedAddOns.map(addon => (
                          <div key={addon.uniqueId} className="flex justify-between text-sm">
                            <span>{addon.name}</span>
                            <span>+${addon.price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedAddOns.length > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total Price</span>
                        <div className="text-xl font-bold text-primary">${totalPrice}/day</div>
                      </div>
                    )}

                    <div className="space-y-2 pt-4">
                      <label className="text-sm font-medium mb-1 block">Schedule Your Experience</label>
                      <p className="text-xs text-muted-foreground mb-4">
                        Select a date and available time slot for your booking.
                      </p>
                      <DateTimePicker
                        date={selectedDate}
                        setDate={setSelectedDate}
                        duration={yacht.duration || 4}
                        timeSlot={selectedTimeSlot}
                        setTimeSlot={setSelectedTimeSlot}
                        availableTimeSlots={availableTimeSlots}
                        onDateSelect={getAvailableTimeSlots}
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
                      <span className="text-muted-foreground">Base Price</span>
                      <div>
                        <span className="text-2xl font-bold">${yacht.pricing}</span>
                        <span className="text-muted-foreground text-sm ml-1">/day</span>
                      </div>
                    </div>

                    {selectedAddOns.length > 0 && (
                      <div className="pt-2 space-y-2 border-t">
                        <p className="text-sm font-medium">Selected Add-Ons:</p>
                        {selectedAddOns.map(addon => (
                          <div key={addon.uniqueId} className="flex justify-between text-sm">
                            <span>{addon.name}</span>
                            <span>+${addon.price}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {selectedAddOns.length > 0 && (
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="font-medium">Total Price</span>
                        <div className="text-xl font-bold text-primary">${totalPrice}/day</div>
                      </div>
                    )}
                    <Separator />
                    <div className="space-y-2">
                      <label className="text-sm font-medium mb-1 block">Schedule Your Experience</label>
                      <p className="text-xs text-muted-foreground mb-4">
                        Select a date and available time slot for your booking.
                      </p>
                      <DateTimePicker
                        date={selectedDate}
                        setDate={setSelectedDate}
                        duration={yacht.duration || 4}
                        timeSlot={selectedTimeSlot}
                        setTimeSlot={setSelectedTimeSlot}
                        availableTimeSlots={availableTimeSlots}
                        onDateSelect={getAvailableTimeSlots}
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
          <YachtCarousel 
            yachts={relatedYachts}
            title="Similar Experiences"
            description="You might also be interested in these yacht experiences"
          />
        )}
      </div>
    </DashboardLayout>
  );
}