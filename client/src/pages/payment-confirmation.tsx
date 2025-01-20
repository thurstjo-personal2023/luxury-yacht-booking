import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import ReviewForm from "@/components/reviews/ReviewForm";
import { useToast } from "@/hooks/use-toast";

export default function PaymentConfirmation() {
  const [, setLocation] = useLocation();
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const { toast } = useToast();

  // In a real application, we would get these from the booking context/state
  const bookingId = "123456";
  const yachtId = "1";

  useEffect(() => {
    // Show review dialog after 2 seconds
    const timer = setTimeout(() => {
      setShowReviewDialog(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  const handleReviewSubmit = async (data: { rating: number; comment?: string }) => {
    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookingId,
          yachtId,
          ...data,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit review');
      }

      toast({
        title: "Review submitted",
        description: "Thank you for your feedback!",
      });
      setShowReviewDialog(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to submit review. Please try again.",
      });
    }
  };

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
                  <span>#{bookingId}</span>
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

      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Your Experience</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <ReviewForm
              bookingId={bookingId}
              yachtId={yachtId}
              onSubmit={handleReviewSubmit}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}