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
      // 1. Create a booking record
      const bookingRef = await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        packageId: bookingData.yacht.package_id,
        startDate: bookingData.dateRange?.from.toISOString(),
        endDate: bookingData.dateRange?.to.toISOString(),
        timeSlot: bookingData.timeSlot,
        totalPrice: bookingData.totalPrice,
        status: "confirmed",
        addOns: bookingData.selectedAddOns || [],
        createdAt: serverTimestamp(),
      });

      setBookingId(bookingRef.id);

      // 2. Create a payment record
      const paymentRef = await addDoc(collection(db, "payments"), {
        bookingId: bookingRef.id,
        userId: user.uid,
        amount: bookingData.totalPrice || 0,
        currency: "USD",
        paymentMethod: "credit_card", // Default to credit card
        status: "completed",
        transactionReference: paymentIntentId,
        createdDate: serverTimestamp(),
        lastUpdatedDate: serverTimestamp(),
      });

      // 3. Create a booking confirmation
      const confirmationRef = await addDoc(collection(db, "booking_confirmations"), {
        bookingId: bookingRef.id,
        userId: user.uid,
        packageId: bookingData.yacht.package_id,
        paymentId: paymentRef.id,
        confirmationDate: serverTimestamp(),
        emailSent: true,
        notificationSent: true,
      });

      setConfirmationId(confirmationRef.id);

      // 4. Create a notification for the user
      await addDoc(collection(db, "notifications"), {
        title: "Booking Confirmed",
        message: `Your booking for ${bookingData.yacht.title} on ${formatDate(bookingData.dateRange?.from || new Date())} at ${bookingData.timeSlot?.label} has been confirmed.`,
        type: "Booking Confirmation",
        recipientId: user.uid,
        sentDate: serverTimestamp(),
        readStatus: false,
      });

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
    } catch (error) {
      console.error("Error creating booking:", error);
      setIsProcessingBooking(false);
      toast({
        title: "Error creating booking",
        description: "There was an error processing your booking. Please try again.",
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