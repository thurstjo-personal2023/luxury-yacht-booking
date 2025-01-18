import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { useState } from 'react';

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

export default function YachtDetails({ id }: { id: string }) {
  const [, setLocation] = useLocation();
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});

  const { data: yacht, isLoading } = useQuery({
    queryKey: ['/api/yachts', id],
    queryFn: async () => {
      // In production, fetch from Firestore
      // For now, return sample data
      return SAMPLE_YACHT_DETAILS;
    }
  });

  const handleImageError = (index: number) => {
    setImageErrors(prev => ({
      ...prev,
      [index]: true
    }));
  };

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

  const averageRating = yacht.reviews.reduce((acc, review) => acc + review.rating, 0) / yacht.reviews.length;

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
                    <Button size="sm">Add</Button>
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

      {/* Book Now Section */}
      <Card className="mt-8">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                AED {yacht.price.toLocaleString()}
              </h2>
              <p className="text-sm text-muted-foreground">
                Base price, excluding add-ons
              </p>
            </div>
            <Button size="lg">Book Now</Button>
          </div>
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
const SAMPLE_YACHT_DETAILS: YachtDetails = {
  id: "1",
  name: "Ocean Paradise",
  description: "Experience luxury at its finest aboard our flagship yacht. Features include a helipad, infinity pool, and state-of-the-art entertainment systems.",
  price: 50000,
  location: "Dubai Marina",
  capacity: 12,
  activities: ["yacht-cruise", "party", "corporate"],
  duration: "full-day",
  gallery: [
    "https://images.unsplash.com/photo-1544140708-514b7837e6b5?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", // Luxury yacht front view
    "https://images.unsplash.com/photo-1569263916174-97a5a552b0c9?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", // Yacht interior
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", // Deck view
    "https://images.unsplash.com/photo-1569261995036-701b8f3c4cf8?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80", // Yacht amenities
    "https://images.unsplash.com/photo-1569262835711-5c127354f5fb?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80"  // Sunset view
  ],
  addOns: [
    {
      id: "addon1",
      name: "Private Chef Service",
      description: "Enjoy gourmet meals prepared by our expert chef",
      price: 5000
    },
    {
      id: "addon2",
      name: "Water Sports Package",
      description: "Access to jet skis, paddleboards, and snorkeling gear",
      price: 3000
    },
    {
      id: "addon3",
      name: "Professional Photography",
      description: "2-hour photoshoot with our professional photographer",
      price: 2500
    }
  ],
  reviews: [
    {
      id: "review1",
      userName: "Ahmed K.",
      rating: 5,
      comment: "An unforgettable experience! The yacht was immaculate and the service was outstanding.",
      date: "2024-01-10"
    },
    {
      id: "review2",
      userName: "Sarah M.",
      rating: 4,
      comment: "Beautiful yacht and great crew. The water sports package was worth every penny.",
      date: "2024-01-05"
    },
    {
      id: "review3",
      userName: "James L.",
      rating: 5,
      comment: "Perfect for our corporate event. The facilities exceeded our expectations.",
      date: "2023-12-28"
    }
  ]
};