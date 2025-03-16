import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getYachtImageProps } from "@/lib/image-utils";
import type { Yacht } from "@shared/unified-schema";

export default function FeaturedExperiences() {
  const [activeRegion, setActiveRegion] = useState<string>("all");
  
  // Fetch all featured yachts
  const { data: featuredYachts, isLoading } = useQuery<Yacht[]>({
    queryKey: ["/api/yachts/featured"],
  });

  // Filter yachts by region if a specific region is selected
  const filteredYachts = featuredYachts?.filter(yacht => 
    activeRegion === "all" || 
    (yacht.location?.region && yacht.location.region === activeRegion)
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold mb-4">Featured Experience Packages</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Discover our curated collection of luxury yacht experiences across the UAE.
          From relaxing sunset cruises to adventurous fishing trips, we offer 
          the perfect experience for every occasion.
        </p>
      </div>

      {/* Region Filter Tabs */}
      <Tabs 
        defaultValue="all" 
        value={activeRegion}
        onValueChange={setActiveRegion}
        className="w-full mb-8"
      >
        <div className="flex justify-center">
          <TabsList>
            <TabsTrigger value="all">All Regions</TabsTrigger>
            <TabsTrigger value="dubai">Dubai</TabsTrigger>
            <TabsTrigger value="abu-dhabi">Abu Dhabi</TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      {/* Loading State */}
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <Card key={index} className="overflow-hidden">
              <div className="h-52 bg-muted animate-pulse"></div>
              <CardContent className="p-4 space-y-3">
                <div className="h-6 bg-muted animate-pulse w-3/4"></div>
                <div className="h-4 bg-muted animate-pulse w-full"></div>
                <div className="h-4 bg-muted animate-pulse w-2/3"></div>
                <div className="h-10 bg-muted animate-pulse w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* No Results State */}
      {!isLoading && (!filteredYachts || filteredYachts.length === 0) && (
        <div className="text-center py-12">
          <h3 className="text-xl font-medium mb-2">No Featured Experiences Found</h3>
          <p className="text-muted-foreground mb-6">
            {activeRegion === "all" 
              ? "There are no featured experiences available at this time." 
              : `There are no featured experiences available in ${activeRegion} at this time.`}
          </p>
          {activeRegion !== "all" && (
            <Button variant="outline" onClick={() => setActiveRegion("all")}>
              View All Regions
            </Button>
          )}
        </div>
      )}

      {/* Yacht Cards */}
      {!isLoading && filteredYachts && filteredYachts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredYachts.map((yacht) => (
            <Card key={yacht.id} className="overflow-hidden">
              <div className="relative h-52 overflow-hidden">
                <img 
                  {...getYachtImageProps(yacht)}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h3 className="text-lg font-semibold">{yacht.title || yacht.name}</h3>
                  {yacht.location?.region && (
                    <div className="flex items-center text-sm">
                      <span className="capitalize">{yacht.location.region}</span>
                      {yacht.location.portMarina ? (
                        <span> - {yacht.location.portMarina}</span>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="font-medium">
                    ${yacht.pricing || yacht.price || 0}/day
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {yacht.capacity || yacht.max_guests || 0} guests
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                  {yacht.description}
                </p>
                <Link href={`/yacht/${yacht.id}`}>
                  <Button className="w-full" variant="outline">View Details</Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}