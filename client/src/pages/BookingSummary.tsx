import { useEffect, useState } from "react";
import { useLocation, Link } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Check, CalendarRange, Clock, Anchor } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { YachtExperience } from "@shared/firestore-schema";

interface BookingSummaryProps {
  yacht?: YachtExperience;
  selectedAddOns?: Array<{
    uniqueId: string;
    productId: string;
    name: string;
    price: number;
  }>;
  dateRange?: {
    from: Date;
    to: Date;
  };
  timeSlot?: {
    id: string;
    startTime: string;
    endTime: string;
    label: string;
    available: boolean;
  };
  totalPrice?: number;
  days?: number;
}

export default function BookingSummary() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // State to hold booking information
  const [bookingData, setBookingData] = useState<BookingSummaryProps | null>(null);
  
  useEffect(() => {
    // In a real application, this would be fetched from a state management store
    // or passed via props/context. For testing, we'll look for data in sessionStorage
    try {
      const storedBookingData = sessionStorage.getItem('bookingSummaryData');
      if (storedBookingData) {
        const parsedData = JSON.parse(storedBookingData);
        
        // Parse dates back to Date objects
        if (parsedData.dateRange) {
          parsedData.dateRange.from = new Date(parsedData.dateRange.from);
          parsedData.dateRange.to = new Date(parsedData.dateRange.to);
        }
        
        setBookingData(parsedData);
      } else {
        // For demo/testing, create sample data if none exists
        setBookingData({
          yacht: {
            id: "sample-yacht-id",
            package_id: "sample-package",
            title: "Luxury Yacht Experience",
            description: "A premium yacht experience in Dubai Marina",
            category: "Luxury",
            location: {
              latitude: 25.0657,
              longitude: 55.1403,
              address: "Dubai Marina, Dubai",
              region: "dubai",
              port_marina: "Dubai Marina"
            },
            duration: 4,
            capacity: 12,
            pricing: 5000,
            pricing_model: "Fixed",
            customization_options: [],
            media: [],
            availability_status: true,
            featured: true,
            tags: ["luxury", "yacht", "dubai"],
            created_date: new Date() as any,
            last_updated_date: new Date() as any,
            published_status: true
          },
          selectedAddOns: [
            {
              uniqueId: "addon-1",
              productId: "catering-service",
              name: "Premium Catering Service",
              price: 1200
            },
            {
              uniqueId: "addon-2",
              productId: "jet-ski",
              name: "Jet Ski Rental",
              price: 800
            }
          ],
          dateRange: {
            from: new Date(Date.now() + 86400000), // Tomorrow
            to: new Date(Date.now() + 86400000) // Same day booking for single time slot
          },
          timeSlot: {
            id: "morning",
            startTime: "09:00",
            endTime: "13:00",
            label: "Morning (9:00 AM - 1:00 PM)",
            available: true
          },
          totalPrice: 7000,
          days: 1
        });
      }
    } catch (error) {
      console.error("Error loading booking summary data:", error);
      toast({
        title: "Error loading booking data",
        description: "Unable to load your booking details. Please try again.",
        variant: "destructive"
      });
    }
  }, [toast]);

  const handleProceedToPayment = () => {
    if (bookingData) {
      // Store the current booking data in session storage for the payment page
      sessionStorage.setItem('bookingSummaryData', JSON.stringify(bookingData));
      
      toast({
        title: "Proceeding to payment",
        description: "Redirecting to payment gateway...",
      });
      
      // Ensure the tab state is preserved for returning to dashboard after payment
      const returnTab = sessionStorage.getItem('returnToTab');
      if (!returnTab) {
        // If no tab is set, default to the bookings tab after payment
        sessionStorage.setItem('returnToTab', 'bookings');
      }
      
      // Redirect to the payment page which will handle the Stripe payment process
      setLocation("/payment");
    } else {
      toast({
        title: "Error",
        description: "Booking information is missing. Please try again.",
        variant: "destructive"
      });
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  if (!bookingData || !bookingData.yacht) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4 md:p-8">
          <div className="flex items-center mb-6">
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2 space-y-4">
              <div className="h-10 w-2/3 bg-muted animate-pulse rounded mb-4"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-[300px] bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { yacht, selectedAddOns = [], dateRange, timeSlot, totalPrice = 0, days = 0 } = bookingData;
  const grandTotal = days * totalPrice;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        {/* Back button */}
        <Button 
          variant="ghost" 
          className="mb-6 hover:bg-transparent p-0 flex items-center"
          onClick={() => {
            // Maintain tab state when returning to yacht details
            const returnTab = sessionStorage.getItem('returnToTab');
            if (returnTab) {
              // Keep the returnToTab in sessionStorage for later use
              setLocation(`/yacht/${yacht.id}`);
            } else {
              // Default to storing 'explore' tab if no previous tab was set
              sessionStorage.setItem('returnToTab', 'explore');
              setLocation(`/yacht/${yacht.id}`);
            }
          }}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          <span>Back to Package Details</span>
        </Button>

        <h1 className="text-3xl font-bold mb-6">Booking Summary</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Main booking details */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Package Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-xl font-semibold">{yacht.title}</h3>
                  <p className="text-muted-foreground mt-1">{yacht.description}</p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="flex items-center">
                    <CalendarRange className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">Booking Date</p>
                      {dateRange ? (
                        <p className="text-sm text-muted-foreground">
                          {formatDate(dateRange.from)}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">Date not selected</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">Time Slot</p>
                      <p className="text-sm text-muted-foreground">
                        {timeSlot ? timeSlot.label : "No time slot selected"}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Clock className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">Experience Duration</p>
                      <p className="text-sm text-muted-foreground">
                        {yacht.duration} hours
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    <Anchor className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">Departure</p>
                      <p className="text-sm text-muted-foreground">
                        {yacht.location?.port_marina || yacht.location?.address}
                      </p>
                    </div>
                  </div>
                </div>
                
                <Separator className="my-4" />
                
                {/* Selected Add-ons */}
                <div className="space-y-3">
                  <h4 className="font-semibold">Selected Add-ons</h4>
                  
                  {selectedAddOns.length > 0 ? (
                    <div className="space-y-2">
                      {selectedAddOns.map((addon) => (
                        <div 
                          key={addon.uniqueId} 
                          className="flex justify-between items-center p-3 rounded-lg bg-background border"
                        >
                          <div className="flex items-center">
                            <Check className="h-4 w-4 mr-2 text-primary" />
                            <span>{addon.name}</span>
                          </div>
                          <span className="font-medium">${addon.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No add-ons selected</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Price summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Price Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>Base Package</span>
                  <span className="font-medium">${yacht.pricing.toLocaleString()}</span>
                </div>
                
                {selectedAddOns.length > 0 && (
                  <div className="space-y-2">
                    {selectedAddOns.map((addon) => (
                      <div key={addon.uniqueId} className="flex justify-between text-sm">
                        <span>{addon.name}</span>
                        <span>${addon.price.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                <Separator />
                
                <div className="flex justify-between">
                  <span>Daily Total</span>
                  <span className="font-medium">${totalPrice.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between">
                  <span>Duration</span>
                  <span>{days} day{days !== 1 ? 's' : ''}</span>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-lg font-bold">
                  <span>Grand Total</span>
                  <span>${grandTotal.toLocaleString()}</span>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full"
                  size="lg"
                  onClick={handleProceedToPayment}
                >
                  Proceed to Payment
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}