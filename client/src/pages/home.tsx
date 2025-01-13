import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

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
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url(${HERO_IMAGES[0]})`,
            filter: 'brightness(0.7)'
          }}
        />
        <div className="relative h-full flex flex-col items-center justify-center text-white p-4">
          <img 
            src="/images/logo.png" 
            alt="Etoile Yachts"
            className="w-32 h-32 mb-6"
          />
          <h1 className="text-4xl md:text-6xl font-bold text-center mb-4">
            Luxury Yachting Experience
          </h1>
          <p className="text-lg md:text-xl text-center mb-8 max-w-2xl">
            Discover exclusive yacht charters and water activities for the discerning traveler
          </p>
          <Button
            onClick={() => setLocation("/auth")}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-6 text-lg"
          >
            Start Your Journey
          </Button>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Featured Experiences</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              title: "Luxury Yachts",
              image: "https://images.unsplash.com/photo-1481277542470-605612bd2d61",
              description: "Experience unparalleled luxury aboard our premium yacht fleet"
            },
            {
              title: "Water Sports",
              image: "https://images.unsplash.com/photo-1547602121-dec49dfbc1a5",
              description: "Exciting water sports activities for thrill-seekers"
            },
            {
              title: "VIP Services",
              image: "https://images.unsplash.com/photo-1533090161767-e6ffed986c88",
              description: "Personalized concierge services for an unforgettable experience"
            }
          ].map((item, index) => (
            <Card key={index} className="overflow-hidden hover:shadow-lg transition-shadow">
              <div 
                className="h-48 bg-cover bg-center"
                style={{ backgroundImage: `url(${item.image})` }}
              />
              <CardContent className="p-6">
                <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}