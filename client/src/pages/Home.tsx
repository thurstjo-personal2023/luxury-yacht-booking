import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase";
import type { Yacht } from "@shared/schema";
import { YachtCarousel } from "@/components/YachtCarousel";

export default function Home() {
  const [user] = useAuthState(auth);
  const { data: featuredYachts, isLoading } = useQuery<Yacht[]>({
    queryKey: ["/api/yachts/featured"],
  });

  return (
    <div>
      {/* Hero Section */}
      <div 
        className="relative h-[600px]"
        style={{ 
          backgroundImage: 'url("/yacht-hero.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center 70%'
        }}
      >
        <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white p-4">
          <h1 className="text-5xl font-bold mb-4 text-center">
            Welcome to Etoile Yachts
          </h1>
          <p className="text-xl mb-8 max-w-2xl text-center">
            Experience luxury water sports, integrated packages, and hybrid adventures
          </p>
          <div className="flex gap-4">
            <Link href="/register">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8">
                Get Started
              </Button>
            </Link>
            <Link href="/explore">
              <Button 
                size="lg" 
                variant="outline" 
                className="bg-white/10 hover:bg-white/20 text-white border-white px-8"
              >
                Explore as Guest
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Guest Banner */}
      {!user && (
        <div className="bg-muted py-3 text-center">
          <p className="text-sm text-muted-foreground">
            Browsing as guest. 
            <Link href="/register" className="text-primary hover:underline ml-1">
              Sign up to access full features and make bookings
            </Link>
          </p>
        </div>
      )}

      {/* Feature Blocks */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Featured Experience Packages */}
          <Card className="overflow-hidden">
            <div className="h-48">
              <img 
                src="/featured-yacht.jpg" 
                alt="Featured Experience Packages"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">
                Featured Experience Packages
              </h3>
              <p className="text-muted-foreground mb-4">
                Discover our curated collection of luxury yacht experiences.
              </p>
              <Link href="/experiences">
                <Button variant="outline" className="w-full">View Featured Experiences</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Recommended Products */}
          <Card className="overflow-hidden">
            <div className="h-48">
              <img 
                src="/diving.jpg" 
                alt="Recommended Products"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">
                Recommended Products
              </h3>
              <p className="text-muted-foreground mb-4">
                Premium add-ons to enhance your yacht experience.
              </p>
              <Link href="/products">
                <Button variant="outline" className="w-full">View Products</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Special Promotions */}
          <Card className="overflow-hidden">
            <div className="h-48">
              <img 
                src="/resort.jpg" 
                alt="Special Promotions"
                className="w-full h-full object-cover"
              />
            </div>
            <CardContent className="p-6">
              <h3 className="text-xl font-semibold mb-2">
                Special Promotions
              </h3>
              <p className="text-muted-foreground mb-4">
                Exclusive offers and limited-time deals.
              </p>
              <Link href="/promotions">
                <Button variant="outline" className="w-full">View Offers</Button>
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Featured Yachts Section - Now using YachtCarousel */}
        <YachtCarousel 
          yachts={featuredYachts} 
          isLoading={isLoading} 
          title="Featured Luxury Yachts"
          description="Discover our most exclusive and sought-after yacht experiences"
        />
      </div>
    </div>
  );
}