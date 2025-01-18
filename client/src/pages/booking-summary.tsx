import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import BookingSummary from "@/components/booking/BookingSummary";

export default function BookingSummaryPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // In a real application, this would come from your booking state management
  // For testing purposes, we'll use sample data
  const sampleBookingData = {
    packageDetails: {
      name: "Ocean Paradise",
      price: 50000,
      duration: "Full Day (8-10 hours)",
      location: "Dubai Marina"
    },
    addOns: [
      {
        id: "addon1-1",
        name: "Private Chef Service",
        price: 5000,
        quantity: 1
      },
      {
        id: "addon1-2",
        name: "Premium Bar Package",
        price: 3500,
        quantity: 2
      }
    ]
  };

  const calculateTotal = () => {
    const basePrice = sampleBookingData.packageDetails.price;
    const addOnsTotal = sampleBookingData.addOns.reduce(
      (sum, addon) => sum + (addon.price * addon.quantity),
      0
    );
    return basePrice + addOnsTotal;
  };

  const handleProceedToPayment = () => {
    const total = calculateTotal();
    // Pass the total amount to the payment page via URL state
    setLocation(`/payment?amount=${total}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center">
          <h1 className="text-2xl font-bold">Booking Summary</h1>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <BookingSummary
          packageDetails={sampleBookingData.packageDetails}
          addOns={sampleBookingData.addOns}
          onProceedToPayment={handleProceedToPayment}
        />
      </main>
    </div>
  );
}