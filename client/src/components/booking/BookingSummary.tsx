import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface BookingSummaryProps {
  packageDetails: {
    name: string;
    price: number;
    duration: string;
    location: string;
  };
  addOns: Array<{
    id: string;
    name: string;
    price: number;
    quantity: number;
  }>;
  onProceedToPayment: () => void;
}

export default function BookingSummary({
  packageDetails,
  addOns,
  onProceedToPayment
}: BookingSummaryProps) {
  const calculateTotal = () => {
    const basePrice = packageDetails.price;
    const addOnsTotal = addOns.reduce(
      (sum, addon) => sum + (addon.price * addon.quantity),
      0
    );
    return basePrice + addOnsTotal;
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardContent className="p-6">
        <h2 className="text-2xl font-semibold mb-6">Booking Summary</h2>
        
        <div className="space-y-6">
          {/* Package Details */}
          <div>
            <h3 className="text-lg font-medium mb-3">Package Details</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <span className="text-muted-foreground">Package:</span>
              <span>{packageDetails.name}</span>
              
              <span className="text-muted-foreground">Duration:</span>
              <span>{packageDetails.duration}</span>
              
              <span className="text-muted-foreground">Location:</span>
              <span>{packageDetails.location}</span>
              
              <span className="text-muted-foreground">Base Price:</span>
              <span>AED {packageDetails.price.toLocaleString()}</span>
            </div>
          </div>
          
          <Separator />
          
          {/* Add-ons */}
          <div>
            <h3 className="text-lg font-medium mb-3">Selected Add-ons</h3>
            <ScrollArea className="h-[200px] w-full rounded-md border p-4">
              <div className="space-y-4">
                {addOns.map((addon) => (
                  <div key={addon.id} className="flex justify-between items-center">
                    <div>
                      <span>{addon.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        (x{addon.quantity})
                      </span>
                    </div>
                    <span>AED {(addon.price * addon.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          
          <Separator />
          
          {/* Total */}
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total Amount</span>
            <span>AED {calculateTotal().toLocaleString()}</span>
          </div>
          
          <Button 
            size="lg" 
            className="w-full mt-6"
            onClick={onProceedToPayment}
          >
            Proceed to Payment
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
