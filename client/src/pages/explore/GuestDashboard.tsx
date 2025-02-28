import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YachtCarousel } from "@/components/YachtCarousel";
import { ArrowRight, Compass, Anchor, Star, Map, Calendar } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import type { YachtExperience } from "@shared/firestore-schema";
import { Badge } from "@/components/ui/badge";

// Sample data for guest dashboard
const featuredDestinations = [
  {
    id: "dubai-marina",
    name: "Dubai Marina",
    description: "Explore the magnificent Dubai Marina with its stunning skyline and crystal clear waters.",
    imageUrl: "/yacht-hero.jpg"
  },
  {
    id: "abu-dhabi-corniche",
    name: "Abu Dhabi Corniche",
    description: "Experience the beauty of Abu Dhabi's waterfront along the picturesque Corniche.",
    imageUrl: "/featured-yacht.jpg"
  },
  {
    id: "palm-jumeirah",
    name: "Palm Jumeirah",
    description: "Sail around the iconic Palm Jumeirah, an engineering marvel and luxury destination.",
    imageUrl: "/diving.jpg"
  }
];

const popularAddOns = [
  {
    id: "premium-catering",
    name: "Premium Catering",
    description: "5-star dining experience with a personal chef",
    price: 299,
    imageUrl: "/resort.jpg"
  },
  {
    id: "water-sports-package",
    name: "Water Sports Package",
    description: "Jet skis, paddleboards, and water toys",
    price: 199,
    imageUrl: "/diving.jpg"
  },
  {
    id: "photography-service",
    name: "Professional Photography",
    description: "Capture your luxury experience with a pro photographer",
    price: 149,
    imageUrl: "/yacht-hero.jpg"
  }
];

const upcomingEvents = [
  {
    id: "yacht-show-2025",
    title: "Dubai International Yacht Show 2025",
    date: "March 15-19, 2025",
    location: "Dubai Harbour",
    description: "The region's premier yacht show featuring the latest luxury vessels"
  },
  {
    id: "sunset-cruise-festival",
    title: "Sunset Cruise Festival",
    date: "April 5-7, 2025",
    location: "Abu Dhabi Corniche",
    description: "A weekend celebration of luxury yachting with special sunset cruises"
  }
];

export default function GuestDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("discover");
  const [featuredExperiences, setFeaturedExperiences] = useState<YachtExperience[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch featured yacht experiences from Firestore
  useEffect(() => {
    async function fetchFeaturedExperiences() {
      setLoading(true);
      try {
        const experiencesRef = collection(db, "experience_packages");
        const featuredQuery = query(
          experiencesRef,
          where("featured", "==", true),
          where("published_status", "==", true),
          limit(6)
        );

        const snapshot = await getDocs(featuredQuery);
        if (!snapshot.empty) {
          const experiences = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as YachtExperience[];
          setFeaturedExperiences(experiences);
        }
      } catch (error) {
        console.error("Error fetching featured experiences:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchFeaturedExperiences();
  }, []);

  const handleSignUpPrompt = () => {
    setLocation("/register");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto p-4 md:p-8">
        {/* Guest Banner */}
        <div className="bg-primary/10 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Exploring as Guest</h2>
            <p className="text-sm text-muted-foreground">
              Create an account to save favorites and make bookings
            </p>
          </div>
          <Button onClick={handleSignUpPrompt}>Sign Up</Button>
        </div>

        {/* Main Dashboard Content */}
        <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="trending">Trending</TabsTrigger>
            <TabsTrigger value="events">Events</TabsTrigger>
          </TabsList>

          {/* Discover Tab */}
          <TabsContent value="discover" className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Featured Experience Packages</h2>
                <Link href="/explore/search">
                  <Button variant="ghost" className="flex items-center gap-1">
                    View All <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
              
              <YachtCarousel 
                yachts={featuredExperiences} 
                isLoading={loading} 
              />
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Popular Destinations</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {featuredDestinations.map(destination => (
                  <Card key={destination.id} className="overflow-hidden">
                    <div className="h-48 relative">
                      <img 
                        src={destination.imageUrl} 
                        alt={destination.name}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end">
                        <div className="p-4 text-white">
                          <h3 className="font-semibold text-lg">{destination.name}</h3>
                        </div>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <p className="text-sm text-muted-foreground">{destination.description}</p>
                    </CardContent>
                    <CardFooter>
                      <Link href="/explore/search">
                        <Button variant="outline" className="w-full">Explore Packages</Button>
                      </Link>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Trending Tab */}
          <TabsContent value="trending" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Trending Add-Ons</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {popularAddOns.map(addon => (
                  <Card key={addon.id}>
                    <div className="h-40 overflow-hidden">
                      <img 
                        src={addon.imageUrl} 
                        alt={addon.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold">{addon.name}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{addon.description}</p>
                      <Badge variant="outline" className="bg-primary/10">
                        ${addon.price}
                      </Badge>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" onClick={handleSignUpPrompt} className="w-full">
                        Sign Up to Add
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Most Viewed Experiences</h2>
              <YachtCarousel 
                yachts={featuredExperiences.slice(0, 3)} 
                isLoading={loading} 
              />
            </div>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-8">
            <div>
              <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {upcomingEvents.map(event => (
                  <Card key={event.id}>
                    <CardHeader>
                      <CardTitle>{event.title}</CardTitle>
                      <CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span>{event.date}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <Map className="h-4 w-4 text-muted-foreground" />
                          <span>{event.location}</span>
                        </div>
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                    </CardContent>
                    <CardFooter>
                      <Button variant="outline" onClick={handleSignUpPrompt} className="w-full">
                        Sign Up for Notifications
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </div>

            <div>
              <h2 className="text-2xl font-bold mb-4">Special Promotions</h2>
              <Card className="bg-primary/5 border-primary/20">
                <CardHeader>
                  <CardTitle className="text-lg">Early Bird Summer Discount</CardTitle>
                  <CardDescription>Book now for summer 2025 and save 15%</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">
                    Reserve your luxury yacht experience for Summer 2025 in advance and receive a 15% discount on all bookings made before May 31st, 2025.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <Badge className="bg-primary/20 text-primary border-primary/20">15% OFF</Badge>
                    <span className="text-sm text-muted-foreground">Valid until: May 31, 2025</span>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button onClick={handleSignUpPrompt} className="w-full">
                    Sign Up to Claim
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        {/* Call to Action Section */}
        <div className="mt-12 bg-muted rounded-lg p-6 text-center">
          <h2 className="text-2xl font-bold mb-2">Ready to book your luxury yacht experience?</h2>
          <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
            Create an account to access exclusive offers, save your favorite experiences, and make seamless bookings.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button onClick={handleSignUpPrompt} size="lg">
              Sign Up Now
            </Button>
            <Link href="/explore">
              <Button variant="outline" size="lg">
                Continue Exploring
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}