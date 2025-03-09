import React, { useState, useEffect } from "react";
import { Link } from "wouter";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem,
  CarouselNext,
  CarouselPrevious 
} from "@/components/ui/carousel";
import { 
  HoverCard,
  HoverCardContent,
  HoverCardTrigger
} from "@/components/ui/hover-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Yacht as LegacyYacht } from "@shared/schema";
import type { YachtExperience } from "@shared/firestore-schema";
import type { Yacht as UnifiedYacht } from "@shared/unified-schema";

// Define a normalized yacht type that will work with both data structures
interface NormalizedYacht {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  location?: string;
  capacity?: number;
  activities?: string[];
}

interface YachtCarouselProps {
  yachts: LegacyYacht[] | YachtExperience[] | UnifiedYacht[] | undefined;
  isLoading?: boolean;
  title?: string;
  description?: string;
}

// Helper function to normalize yacht data from different sources
function normalizeYacht(yacht: any): NormalizedYacht {
  // Ensure activities is always an array
  let activities: string[] = [];

  // Handle activities/tags from any schema format
  if (yacht.activities && Array.isArray(yacht.activities)) {
    activities = yacht.activities;
  } else if (yacht.tags && Array.isArray(yacht.tags)) {
    activities = yacht.tags;
  } else if (typeof yacht.activities === 'string') {
    // Handle case where activities might be a comma-separated string
    activities = yacht.activities.split(',').map((item: string) => item.trim());
  } else if (typeof yacht.tags === 'string') {
    // Handle case where tags might be a comma-separated string
    activities = yacht.tags.split(',').map((item: string) => item.trim());
  }

  // Extract an image URL from any schema format
  let imageUrl = yacht.imageUrl; // legacy schema
  
  // Try media array from various schema formats
  if (!imageUrl && yacht.media && Array.isArray(yacht.media) && yacht.media.length > 0) {
    imageUrl = yacht.media[0].url;
  }
  
  // Default image if none found
  if (!imageUrl) {
    imageUrl = "https://images.unsplash.com/photo-1577032229840-33197764440d?w=800";
  }

  // Extract location string from any schema format
  let locationString = "Location unavailable";
  if (yacht.location) {
    if (typeof yacht.location === 'string') {
      locationString = yacht.location;
    } else if (yacht.location.address) {
      locationString = yacht.location.address;
    } else if (yacht.location.region) {
      // Handle unified schema location
      const port = yacht.location.portMarina || yacht.location.port_marina || '';
      locationString = `${yacht.location.region}${port ? ` - ${port}` : ''}`;
    }
  }

  return {
    // ID field - try all possible name variants
    id: yacht.id || yacht.yacht_id || yacht.yachtId || yacht.package_id || "",
    
    // Name/title field - try all possible name variants
    name: yacht.name || yacht.title || "Unnamed Package",
    
    // Description field
    description: yacht.description || "No description available",
    
    // Price field - try all possible price field variants
    price: yacht.price || yacht.pricing || 0,
    
    // Image URL
    imageUrl: imageUrl,
    
    // Location string
    location: locationString,
    
    // Capacity field - try all possible capacity field variants
    capacity: yacht.capacity || yacht.max_guests || 0,
    
    // Activities/tags array
    activities: activities
  };
}

export function YachtCarousel({ 
  yachts, 
  isLoading = false, 
  title = "Featured Yachts",
  description = "Explore our selection of luxury yachts"
}: YachtCarouselProps) {
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile view based on screen width
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIfMobile();
    window.addEventListener('resize', checkIfMobile);

    return () => {
      window.removeEventListener('resize', checkIfMobile);
    };
  }, []);

  // Display loading skeletons if data is loading
  if (isLoading) {
    return (
      <div className="my-10 px-4">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground mb-6">{description}</p>
        <div className="relative">
          <Carousel>
            <CarouselContent>
              {[1, 2, 3, 4].map((_, index) => (
                <CarouselItem key={index} className={isMobile ? "basis-full" : "basis-1/3"}>
                  <Card className="h-[450px] border shadow-sm">
                    <CardContent className="p-0">
                      <div className="h-64 bg-muted animate-pulse rounded-t-lg"></div>
                      <div className="p-4 space-y-3">
                        <div className="h-6 bg-muted animate-pulse rounded w-3/4"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-1/2"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-full"></div>
                        <div className="h-4 bg-muted animate-pulse rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
        </div>
      </div>
    );
  }

  // Return empty message if no yachts
  if (!yachts || yachts.length === 0) {
    return (
      <div className="my-10 px-4">
        <h2 className="text-2xl font-bold mb-2">{title}</h2>
        <p className="text-muted-foreground">No yachts available at this time.</p>
      </div>
    );
  }

  // Normalize yacht data - with safety check to ensure yachts is an array
  const normalizedYachts = Array.isArray(yachts) 
    ? yachts.map(normalizeYacht)
    : [];

  return (
    <div className="my-10 px-4">
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground mb-6">{description}</p>

      <div className="relative">
        <Carousel className="w-full" opts={{ align: "start" }}>
          <CarouselContent>
            {normalizedYachts.map((yacht) => (
              <CarouselItem key={yacht.id} className={isMobile ? "basis-full" : "basis-1/3"}>
                <HoverCard>
                  <HoverCardTrigger asChild>
                    <Card className="h-[450px] overflow-hidden border shadow-sm transition-all duration-300 hover:shadow-lg">
                      <CardContent className="p-0">
                        <div className="relative h-64 overflow-hidden">
                          <img 
                            src={yacht.imageUrl} 
                            alt={yacht.name} 
                            className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 right-4 text-white">
                            <h3 className="text-xl font-semibold truncate">{yacht.name}</h3>
                            <p className="text-sm opacity-90">{yacht.location || "Multiple locations"}</p>
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-lg">${yacht.price}/day</span>
                            <span className="text-sm text-muted-foreground">
                              {yacht.capacity} guests
                            </span>
                          </div>

                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {yacht.description}
                          </p>

                          <div className="pt-2">
                            <Link href={`/yacht/${yacht.id}`}>
                              <Button variant="outline" className="w-full hover:bg-primary hover:text-white transition-colors">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </HoverCardTrigger>
                  <HoverCardContent className="w-80 p-0">
                    <div className="p-4 space-y-2">
                      <h4 className="font-semibold">{yacht.name}</h4>
                      <p className="text-sm text-muted-foreground">{yacht.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {Array.isArray(yacht.activities) && yacht.activities.length > 0 && yacht.activities.map((activity) => (
                          <span 
                            key={activity} 
                            className="text-xs bg-muted px-2 py-1 rounded-full"
                          >
                            {typeof activity === 'string' ? activity.replace('-', ' ') : activity}
                          </span>
                        ))}
                      </div>
                    </div>
                  </HoverCardContent>
                </HoverCard>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="left-1 bg-white/80 hover:bg-primary hover:text-white" />
          <CarouselNext className="right-1 bg-white/80 hover:bg-primary hover:text-white" />
        </Carousel>
      </div>
    </div>
  );
}