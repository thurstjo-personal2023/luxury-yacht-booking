import { useEffect, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, CheckCircle, Clock, CalendarRange, CreditCard } from "lucide-react";
import { StripePayment } from "@/components/ui/stripe-payment";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { YachtExperience } from "@shared/firestore-schema";
import { BookingPayment, PaymentMethod } from "@shared/payment-schema";
import { auth, db } from "@/lib/firebase";
import { collection, addDoc, doc, setDoc, serverTimestamp } from "firebase/firestore";
import { useAuthState } from "react-firebase-hooks/auth";
import { sendBookingConfirmation } from "@/services/email-service";

interface BookingSummaryData {
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

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [user] = useAuthState(auth);
  const [bookingData, setBookingData] = useState<BookingSummaryData | null>(null);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [confirmationId, setConfirmationId] = useState<string | null>(null);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);

  useEffect(() => {
    // Retrieve booking data from session storage
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
        // If no booking data, redirect back to home
        toast({
          title: "No booking information found",
          description: "Please select a yacht experience first.",
          variant: "destructive"
        });
        setLocation("/");
      }
    } catch (error) {
      console.error("Error loading booking data:", error);
      toast({
        title: "Error loading booking data",
        description: "Unable to load your booking details. Please try again.",
        variant: "destructive"
      });
      setLocation("/");
    }
  }, [toast, setLocation]);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handlePaymentComplete = async (paymentIntentId: string) => {
    if (!user || !bookingData || !bookingData.yacht) {
      toast({
        title: "Authentication required",
        description: "You must be logged in to complete a booking.",
        variant: "destructive"
      });
      return;
    }

    setIsProcessingBooking(true);

    try {
      const bookingDetails = {
        packageId: bookingData.yacht.package_id,
        startDate: bookingData.dateRange?.from.toISOString(),
        endDate: bookingData.dateRange?.to.toISOString(),
        timeSlot: bookingData.timeSlot,
        totalPrice: bookingData.totalPrice,
        addOns: bookingData.selectedAddOns || [],
      };
      
      // 1. Create a booking record using the API
      const bookingResponse: Response = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify(bookingDetails)
      });
      
      if (!bookingResponse.ok) {
        const errorData = await bookingResponse.json();
        throw new Error(`Booking creation failed: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const bookingResult: { bookingId: string; success: boolean } = await bookingResponse.json();
      const bookingId = bookingResult.bookingId;
      setBookingId(bookingId);
      
      console.log(`Successfully created booking with ID: ${bookingId}`);

      // 2. Create a payment record using the API
      const paymentResponse: Response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          bookingId: bookingId,
          amount: bookingData.totalPrice || 0,
          currency: "USD",
          paymentMethod: "credit_card", // Default to credit card
          transactionReference: paymentIntentId,
        })
      });
      
      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(`Payment record creation failed: ${errorData.error || errorData.message || 'Unknown error'}`);
      }
      
      const paymentResult: { paymentId: string; success: boolean } = await paymentResponse.json();
      const paymentId = paymentResult.paymentId;
      
      console.log(`Successfully created payment record with ID: ${paymentId}`);

      // 3. Create a booking confirmation using the API
      const confirmationResponse: Response = await fetch("/api/booking-confirmations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${await user.getIdToken()}`
        },
        body: JSON.stringify({
          bookingId: bookingId,
          packageId: bookingData.yacht.package_id,
          paymentId: paymentId,
        })
      });
      
      if (!confirmationResponse.ok) {
        const errorData = await confirmationResponse.json();
        console.warn(`Booking confirmation creation warning: ${errorData.error || errorData.message || 'Unknown error'}`);
        // Continue even if confirmation had issues
      } else {
        const confirmationResult: { confirmationId: string; success: boolean } = await confirmationResponse.json();
        setConfirmationId(confirmationResult.confirmationId);
        console.log(`Successfully created booking confirmation with ID: ${confirmationResult.confirmationId}`);
      }

      // 4. Send booking confirmation email
      try {
        await sendBookingConfirmation(user.email || '', user.displayName || 'Valued Customer', {
          bookingId: bookingId,
          yachtName: bookingData.yacht.title,
          startDate: formatDate(bookingData.dateRange?.from || new Date()),
          endDate: formatDate(bookingData.dateRange?.to || new Date()),
          totalPrice: bookingData.totalPrice || 0,
          location: bookingData.yacht.location?.address || 'Location not specified',
        });
        console.log('Booking confirmation email sent successfully');
      } catch (emailError) {
        console.warn('Failed to send booking confirmation email:', emailError);
        // Continue with booking process even if email fails
      }

      // 5. Clear booking data from session storage
      sessionStorage.removeItem('bookingSummaryData');

      // 6. Set payment as complete
      setPaymentComplete(true);
      setIsProcessingBooking(false);

      // 7. Show success toast
      toast({
        title: "Booking confirmed!",
        description: "Your booking has been successfully confirmed. Check your email for details.",
      });
    } catch (error: unknown) {
      console.error("Error creating booking:", error);
      setIsProcessingBooking(false);
      toast({
        title: "Error creating booking",
        description: `There was an error processing your booking: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again.`,
        variant: "destructive"
      });
    }
  };

  const handlePaymentCancel = () => {
    toast({
      title: "Payment cancelled",
      description: "Your payment has been cancelled. You can try again later.",
    });
    setLocation("/booking-summary");
  };

  if (!bookingData || !bookingData.yacht) {
    return (
      <DashboardLayout>
        <div className="container mx-auto p-4 md:p-8">
          <div className="flex items-center mb-6">
            <div className="h-6 w-24 bg-muted animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="h-10 w-2/3 bg-muted animate-pulse rounded mb-4"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
              <div className="h-4 w-full bg-muted animate-pulse rounded"></div>
            </div>
            <div className="h-[400px] bg-muted animate-pulse rounded"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const { yacht, dateRange, timeSlot, totalPrice = 0, days = 0 } = bookingData;
  const grandTotal = days * totalPrice;

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        {!paymentComplete && (
          <Button 
            variant="ghost" 
            className="mb-6 hover:bg-transparent p-0 flex items-center"
            onClick={() => setLocation("/booking-summary")}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span>Back to Booking Summary</span>
          </Button>
        )}

        <h1 className="text-3xl font-bold mb-6">
          {paymentComplete ? "Booking Confirmation" : "Complete Payment"}
        </h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left column - Payment or Confirmation */}
          <div>
            {paymentComplete ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-green-600">
                    <CheckCircle className="h-5 w-5" />
                    Booking Confirmed
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Thank you for your booking! Your experience with {yacht.title} has been confirmed.
                  </p>
                  
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 my-4">
                    <p className="font-medium text-green-800">Confirmation Number</p>
                    <p className="text-green-600 font-mono text-lg">{confirmationId || "CONF-" + Math.random().toString(36).substring(2, 10).toUpperCase()}</p>
                  </div>
                  
                  <div className="space-y-4 pt-2">
                    <h3 className="font-medium">Booking Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{dateRange ? formatDate(dateRange.from) : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Time</p>
                        <p className="font-medium">{timeSlot ? timeSlot.label : "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Amount</p>
                        <p className="font-medium">${grandTotal.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Status</p>
                        <p className="font-medium text-green-600">Paid</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="border-t pt-4 mt-4">
                    <p className="text-sm text-muted-foreground">
                      A confirmation email has been sent to your registered email address.
                      You can also view your booking details in your dashboard.
                    </p>
                  </div>

                  <div className="pt-4">
                    <Button 
                      className="w-full" 
                      onClick={() => setLocation("/dashboard/consumer")}
                    >
                      Go to My Bookings
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <StripePayment 
                amount={grandTotal} 
                onPaymentComplete={handlePaymentComplete} 
                onPaymentCancel={handlePaymentCancel}
              />
            )}
          </div>
          
          {/* Right column - Booking Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">Booking Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{yacht.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{yacht.description}</p>
                </div>
                
                <div className="grid grid-cols-1 gap-3 mt-4">
                  <div className="flex items-center">
                    <CalendarRange className="h-5 w-5 mr-2 text-primary" />
                    <div>
                      <p className="font-medium">Booking Date</p>
                      <p className="text-sm text-muted-foreground">
                        {dateRange ? formatDate(dateRange.from) : "Date not selected"}
                      </p>
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
                </div>
                
                <Separator className="my-4" />
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Base Package</span>
                    <span className="font-medium">${yacht.pricing.toLocaleString()}</span>
                  </div>
                  
                  {bookingData.selectedAddOns && bookingData.selectedAddOns.length > 0 && (
                    <div className="space-y-1">
                      {bookingData.selectedAddOns.map((addon) => (
                        <div key={addon.uniqueId} className="flex justify-between text-sm">
                          <span>{addon.name}</span>
                          <span>${addon.price.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <Separator />
                  
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total</span>
                    <span>${grandTotal.toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}