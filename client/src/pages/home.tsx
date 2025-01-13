import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";

const HERO_IMAGES = [
  'https://images.unsplash.com/photo-1549439602-43ebca2327af',
  'https://images.unsplash.com/photo-1469796466635-455ede028aca',
  'https://images.unsplash.com/photo-1507652313519-d4e9174996dd'
];

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[70vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center animate-fade-in"
          style={{ 
            backgroundImage: `url(${HERO_IMAGES[0]})`,
            filter: 'brightness(0.7)'
          }}
        />
        <div className="relative h-full flex flex-col items-center justify-center text-white p-4">
          <div 
            className="w-32 h-32 mb-6 animate-scale-in bg-contain bg-center bg-no-repeat"
            style={{ backgroundImage: 'url(/Etoile_Yachts_v1_2.png)' }}
          />
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-4 animate-slide-up">
            Welcome to Luxury Yachting
          </h1>
          <p className="text-lg md:text-xl text-center mb-8 max-w-2xl animate-fade-in">
            Experience unparalleled luxury and adventure on the world's finest yachts
          </p>
          <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
            <Button
              onClick={() => setLocation("/auth")}
              className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
            >
              Start Your Journey
            </Button>
            <Button
              onClick={() => setLocation("/yacht-listing")}
              variant="outline"
              className="bg-white/10 hover:bg-white/20 text-white border-white px-8 py-6 text-lg"
            >
              Explore Yachts
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Why Choose Etoile Yachts?</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Curated Luxury Fleet",
              image: "https://images.unsplash.com/photo-1481277542470-605612bd2d61",
              description: "Access to the world's most prestigious yachts and experiences"
            },
            {
              title: "Personalized Service",
              image: "https://images.unsplash.com/photo-1547602121-dec49dfbc1a5",
              description: "Dedicated concierge and customized itineraries for every journey"
            },
            {
              title: "Exclusive Benefits",
              image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88",
              description: "VIP treatment and special perks for our valued members"
            }
          ].map((item, index) => (
            <Card 
              key={index} 
              className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
              onClick={() => setLocation("/yacht-listing")}
            >
              <div 
                className="h-48 bg-cover bg-center transform transition-transform group-hover:scale-105"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold">{item.title}</h3>
                  <ChevronRight className="w-5 h-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to Experience Luxury?</h2>
          <p className="text-muted-foreground mb-8">
            Join our exclusive community and start planning your perfect yacht experience
          </p>
          <Button
            onClick={() => setLocation("/auth")}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
          >
            Create Your Account
          </Button>
        </div>
      </div>
    </div>
  );
}