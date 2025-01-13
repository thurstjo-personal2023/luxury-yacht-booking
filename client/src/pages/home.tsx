import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-sm z-50 border-b border-border">
        <div className="container mx-auto h-16">
          <nav className="relative flex items-center justify-between h-full px-4">
            {/* Logo positioned absolutely to the left */}
            <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
              <div 
                className="w-32 h-12 bg-contain bg-left bg-no-repeat cursor-pointer"
                style={{ backgroundImage: 'url(/Etoile_Yachts_v1_2.png)' }}
                onClick={() => setLocation("/")}
              />
            </div>

            {/* Auth buttons positioned to the right */}
            <div className="ml-auto flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setLocation("/auth")}
                className="text-sm"
              >
                Log In
              </Button>
              <Button
                onClick={() => setLocation("/auth")}
                className="text-sm"
              >
                Sign Up
              </Button>
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content with top padding for fixed header */}
      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative h-[60vh] min-h-[400px]">
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{ 
              backgroundImage: 'url(https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&q=80)',
              filter: 'brightness(0.6)'
            }}
          />
          <div className="relative h-full flex flex-col items-center justify-center text-white p-6">
            <h1 className="text-3xl md:text-5xl font-bold text-center mb-4 animate-fade-in">
              Welcome to Etoile Yachts
            </h1>
            <p className="text-lg md:text-xl text-center mb-8 max-w-2xl animate-fade-in">
              Experience luxury water sports, integrated packages, and hybrid adventures
            </p>
            <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-slide-up">
              <Button
                onClick={() => setLocation("/auth")}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-8 py-6"
                size="lg"
              >
                Get Started
              </Button>
              <Button
                onClick={() => setLocation("/featured")}
                variant="outline"
                className="w-full sm:w-auto bg-white/10 hover:bg-white/20 text-white border-white px-8 py-6"
                size="lg"
              >
                Explore as Guest
              </Button>
            </div>
          </div>
        </section>

        {/* Guest Mode Notice */}
        <div className="bg-muted/50 p-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Info className="h-4 w-4" />
          <p>Browsing as guest. Sign up to access full features and make bookings.</p>
        </div>

        {/* Featured Sections */}
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Featured Experience Packages",
                description: "Discover our curated collection of luxury yacht experiences",
                image: "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?auto=format&fit=crop&q=80",
                path: "/featured"
              },
              {
                title: "Recommended Products",
                description: "Premium add-ons to enhance your yacht experience",
                image: "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&q=80",
                path: "/products"
              },
              {
                title: "Special Promotions",
                description: "Exclusive offers and limited-time deals",
                image: "https://images.unsplash.com/photo-1586611292717-f828b167408c?auto=format&fit=crop&q=80",
                path: "/promotions"
              }
            ].map((item, index) => (
              <Card 
                key={index}
                className="overflow-hidden hover:shadow-lg transition-shadow group cursor-pointer"
                onClick={() => setLocation(item.path)}
              >
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
      </main>
    </div>
  );
}