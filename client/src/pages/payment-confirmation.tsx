import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

export default function PaymentConfirmation() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    // In a real application, you would:
    // 1. Verify the payment status with your backend
    // 2. Send confirmation email
    // 3. Send push notification
    // 4. Update booking status in the database
  }, []);

  const handleViewBookings = () => {
    setLocation("/dashboard");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-2xl font-bold">Payment Confirmation</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle>Payment Successful!</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="rounded-lg bg-muted p-6">
              <h3 className="font-semibold mb-4">Booking Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Booking ID</span>
                  <span>#123456</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Package</span>
                  <span>Ocean Paradise</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Date</span>
                  <span>January 20, 2025</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span>AED 55,000</span>
                </div>
              </div>
            </div>

            <div className="text-center space-y-4">
              <p className="text-muted-foreground">
                A confirmation email has been sent to your registered email address.
              </p>
              <Button onClick={handleViewBookings}>
                View My Bookings
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}