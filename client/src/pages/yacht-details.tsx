import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Star, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from 'react';
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

interface YachtDetails {
  id: string;
  name: string;
  description: string;
  price: number;
  location: string;
  capacity: number;
  activities: string[];
  duration: string;
  gallery: string[];
  addOns: {
    id: string;
    name: string;
    description: string;
    price: number;
  }[];
  reviews: {
    id: string;
    userName: string;
    rating: number;
    comment: string;
    date: string;
  }[];
}

interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function YachtDetails({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOn[]>([]);

  const { data: yacht, isLoading } = useQuery({
    queryKey: ['/api/yachts', id],
    queryFn: async () => {
      // Return the specific yacht details based on ID
      const yachtData = SAMPLE_YACHT_DETAILS[id];
      if (!yachtData) {
        throw new Error('Yacht not found');
      }
      return yachtData;
    }
  });

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({
      ...prev,
      [index]: true
    }));
  };

  const handleAddOn = (addOn: { id: string; name: string; price: number }) => {
    setSelectedAddOns(prev => {
      const existing = prev.find(item => item.id === addOn.id);
      if (existing) {
        return prev.map(item =>
          item.id === addOn.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...addOn, quantity: 1 }];
    });
  };

  const handleRemoveAddOn = (addOnId: string) => {
    setSelectedAddOns(prev => {
      const existing = prev.find(item => item.id === addOnId);
      if (existing && existing.quantity > 1) {
        return prev.map(item =>
          item.id === addOnId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        );
      }
      return prev.filter(item => item.id !== addOnId);
    });
  };

  const calculateTotal = () => {
    const basePrice = yacht?.price || 0;
    const addOnsTotal = selectedAddOns.reduce(
      (sum, addon) => sum + (addon.price * addon.quantity),
      0
    );
    return basePrice + addOnsTotal;
  };

  const averageRating = yacht?.reviews.reduce((acc, review) => acc + review.rating, 0) / (yacht?.reviews.length || 1);


  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!yacht) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-4"
          onClick={() => setLocation("/yacht-listing")}
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Search Results
        </Button>
        <Card>
          <CardContent className="p-6">
            <p className="text-center text-muted-foreground">
              Yacht details not found
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => setLocation("/yacht-listing")}
      >
        <ChevronLeft className="h-4 w-4 mr-2" />
        Back to Search Results
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Info */}
        <div className="space-y-6">
          <h1 className="text-3xl font-bold">{yacht.name}</h1>
          <div className="flex items-center gap-2">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-5 w-5 ${
                    i < Math.round(averageRating)
                      ? "text-yellow-400 fill-current"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              ({yacht.reviews.length} reviews)
            </span>
          </div>
          <p className="text-lg text-muted-foreground">{yacht.description}</p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="font-medium">Location</h3>
              <p className="text-muted-foreground">{yacht.location}</p>
            </div>
            <div>
              <h3 className="font-medium">Duration</h3>
              <p className="text-muted-foreground">{yacht.duration}</p>
            </div>
            <div>
              <h3 className="font-medium">Capacity</h3>
              <p className="text-muted-foreground">{yacht.capacity} guests</p>
            </div>
            <div>
              <h3 className="font-medium">Price</h3>
              <p className="text-muted-foreground">
                AED {yacht.price.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Gallery */}
        <div className="grid grid-cols-2 gap-4">
          {yacht.gallery.map((image, index) => (
            <div
              key={index}
              className={`relative aspect-[4/3] overflow-hidden rounded-lg ${
                index === 0 ? "col-span-2 row-span-2" : ""
              }`}
            >
              <img
                src={imageErrors[index]
                  ? "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80" // Fallback image
                  : image
                }
                alt={`${yacht.name} - Image ${index + 1}`}
                className="absolute inset-0 h-full w-full object-cover"
                onError={() => handleImageError(index)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Tabs for Add-ons and Reviews */}
      <Tabs defaultValue="addons" className="mt-8">
        <TabsList>
          <TabsTrigger value="addons">Available Add-ons</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
        </TabsList>
        <TabsContent value="addons" className="mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {yacht.addOns.map((addon) => (
              <Card key={addon.id}>
                <CardContent className="p-4">
                  <h3 className="font-semibold">{addon.name}</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    {addon.description}
                  </p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-medium">
                      AED {addon.price.toLocaleString()}
                    </span>
                    <div className="flex items-center gap-2">
                      {selectedAddOns.find(item => item.id === addon.id) ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRemoveAddOn(addon.id)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="mx-2">
                            {selectedAddOns.find(item => item.id === addon.id)?.quantity || 0}
                          </span>
                        </>
                      ) : null}
                      <Button
                        size="sm"
                        onClick={() => handleAddOn(addon)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
        <TabsContent value="reviews" className="mt-6">
          <div className="space-y-6">
            {yacht.reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{review.userName}</h3>
                      <p className="text-sm text-muted-foreground">
                        {new Date(review.date).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${
                            i < review.rating
                              ? "text-yellow-400 fill-current"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <p className="mt-2">{review.comment}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Booking Summary */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <h2 className="text-xl font-semibold mb-4">Booking Summary</h2>
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span>Base Price</span>
                <span>AED {yacht.price.toLocaleString()}</span>
              </div>
              {selectedAddOns.map((addon) => (
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
              <Separator />
              <div className="flex justify-between font-bold">
                <span>Total</span>
                <span>AED {calculateTotal().toLocaleString()}</span>
              </div>
            </div>
          </ScrollArea>
          <Button size="lg" className="w-full mt-4">
            Proceed to Book
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" className="mb-4" disabled>
        <Skeleton className="h-4 w-4 mr-2" />
        Back to Search Results
      </Button>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-20 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i}>
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton
              key={i}
              className={`aspect-[4/3] ${i === 1 ? "col-span-2 row-span-2" : ""}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Sample data for development
const SAMPLE_YACHT_DETAILS: Record<string, YachtDetails> = {
  "1": {
    id: "1",
    name: "Ocean Paradise",
    description: "Experience luxury at its finest aboard our flagship yacht. Features include a helipad, infinity pool, and state-of-the-art entertainment systems.",
    price: 50000,
    location: "Dubai Marina",
    capacity: 12,
    activities: ["yacht-cruise", "party", "corporate"],
    duration: "full-day",
    gallery: [
      "https://images.unsplash.com/photo-1544140708-514b7837e6b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1569263916174-97a5a552b0c9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1569261995036-701b8f3c4cf8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1569262835711-5c127354f5fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    ],
    addOns: [
      {
        id: "addon1-1",
        name: "Private Chef Service",
        description: "Enjoy gourmet meals prepared by our expert Michelin-starred chef",
        price: 5000
      },
      {
        id: "addon1-2",
        name: "Premium Bar Package",
        description: "Top-shelf spirits, fine wines, and craft cocktails with professional bartender",
        price: 3500
      },
      {
        id: "addon1-3",
        name: "Helicopter Transfer",
        description: "Luxury helicopter transfer to and from the yacht",
        price: 8000
      }
    ],
    reviews: [
      {
        id: "review1-1",
        userName: "Ahmed K.",
        rating: 5,
        comment: "An unforgettable experience! The yacht was immaculate and the service was outstanding.",
        date: "2024-01-10"
      },
      {
        id: "review1-2",
        userName: "Sarah M.",
        rating: 4,
        comment: "Beautiful yacht and great crew. The helicopter transfer was worth every penny.",
        date: "2024-01-05"
      }
    ]
  },
  "2": {
    id: "2",
    name: "Azure Dreams",
    description: "Modern yacht perfect for intimate gatherings and romantic excursions, featuring sleek design and cutting-edge technology.",
    price: 35000,
    location: "Palm Jumeirah",
    capacity: 8,
    activities: ["yacht-cruise", "water-sports"],
    duration: "half-day",
    gallery: [
      "https://images.unsplash.com/photo-1562281302-809d10c4c831?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1562281303-a1e5c4817b79?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1562281301-39fb54f9a917?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1562281298-c807ef4a0291?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    ],
    addOns: [
      {
        id: "addon2-1",
        name: "Water Sports Package",
        description: "Access to jet skis, paddleboards, and snorkeling gear with instructor",
        price: 2500
      },
      {
        id: "addon2-2",
        name: "Sunset Photography",
        description: "2-hour professional photography session during golden hour",
        price: 1800
      },
      {
        id: "addon2-3",
        name: "Romantic Dinner Setup",
        description: "Private candlelit dinner with personal butler service",
        price: 2000
      }
    ],
    reviews: [
      {
        id: "review2-1",
        userName: "Michael R.",
        rating: 5,
        comment: "Perfect for our anniversary celebration. The romantic dinner setup was magical!",
        date: "2024-01-15"
      },
      {
        id: "review2-2",
        userName: "Lisa P.",
        rating: 5,
        comment: "Incredible water sports experience. The instructors were very professional.",
        date: "2024-01-08"
      }
    ]
  },
  "3": {
    id: "3",
    name: "Royal Voyager",
    description: "Classic luxury yacht with timeless elegance, perfect for corporate events and family celebrations.",
    price: 45000,
    location: "Abu Dhabi",
    capacity: 10,
    activities: ["yacht-cruise", "fishing", "corporate"],
    duration: "multi-day",
    gallery: [
      "https://images.unsplash.com/photo-1565538810643-b5bdb714032a?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1565538810632-a500abdaa8c4?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1565538810622-7d7c861a8e5c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1565538810612-33c1a2127c0c?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"
    ],
    addOns: [
      {
        id: "addon3-1",
        name: "Deep Sea Fishing",
        description: "Full fishing equipment and experienced guide for deep sea fishing",
        price: 3000
      },
      {
        id: "addon3-2",
        name: "Business Conference Setup",
        description: "Complete AV equipment setup with technical support",
        price: 4000
      },
      {
        id: "addon3-3",
        name: "Wellness Package",
        description: "On-board massage therapist and yoga instructor",
        price: 2800
      }
    ],
    reviews: [
      {
        id: "review3-1",
        userName: "James L.",
        rating: 5,
        comment: "Perfect for our corporate event. The conference setup was professional.",
        date: "2023-12-28"
      },
      {
        id: "review3-2",
        userName: "David W.",
        rating: 4,
        comment: "Great fishing experience! Caught some impressive fish with the guide.",
        date: "2024-01-02"
      }
    ]
  }
};