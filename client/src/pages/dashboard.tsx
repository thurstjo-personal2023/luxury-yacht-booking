import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";

interface Booking {
  id: string;
  packageName: string;
  dateTime: string;
  status: 'Confirmed' | 'Pending' | 'Completed';
}

interface Recommendation {
  id: string;
  packageName: string;
  description: string;
  price: number;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
      return;
    }

    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Fetch bookings
        const bookingsQuery = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid)
        );
        const bookingsSnapshot = await getDocs(bookingsQuery);
        const bookingsData = bookingsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Booking[];
        setBookings(bookingsData);

        // Fetch recommendations
        const recommendationsQuery = query(collection(db, "recommendations"));
        const recommendationsSnapshot = await getDocs(recommendationsQuery);
        const recommendationsData = recommendationsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Recommendation[];
        setRecommendations(recommendationsData);

      } catch (err) {
        console.error("Error fetching dashboard data:", err);
        setError("We encountered an issue while loading your dashboard. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user, setLocation]);

  if (!user) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <Card className="bg-destructive/10 border-destructive">
          <CardContent className="p-6">
            <p className="text-destructive">{error}</p>
            <Button 
              onClick={() => window.location.reload()} 
              variant="outline" 
              className="mt-4"
            >
              Refresh Page
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Consumer Dashboard</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon">
              <Bell className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          {/* Bookings Section */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Existing Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <BookingsSkeleton />
                ) : bookings.length > 0 ? (
                  <div className="grid gap-4">
                    {bookings.map((booking) => (
                      <Card key={booking.id}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-semibold">{booking.packageName}</h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(booking.dateTime).toLocaleString()}
                              </p>
                            </div>
                            <Button variant="secondary" size="sm">
                              View Details
                            </Button>
                          </div>
                          <div className="mt-2">
                            <span className={`inline-block px-2 py-1 text-xs rounded-full ${
                              booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                              booking.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {booking.status}
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      You have no bookings yet. Start exploring luxury yacht experiences now!
                    </p>
                    <Button onClick={() => setLocation("/yacht-listing")}>
                      Search & Book
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Recommendations Section */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Personalized Recommendations</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <RecommendationsSkeleton />
                ) : recommendations.length > 0 ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {recommendations.map((recommendation) => (
                      <Card key={recommendation.id}>
                        <CardContent className="p-4">
                          <h3 className="font-semibold">{recommendation.packageName}</h3>
                          <p className="text-sm text-muted-foreground mt-2">
                            {recommendation.description}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="font-bold">
                              AED {recommendation.price.toLocaleString()}
                            </span>
                            <Button size="sm">
                              Book Now
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">
                      We don't have any recommendations for you at the moment.
                      Start exploring experiences to get personalized suggestions.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          {/* Quick Links */}
          <section>
            <Card>
              <CardHeader>
                <CardTitle>Quick Links</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <Button 
                    variant="outline" 
                    className="justify-between"
                    onClick={() => setLocation("/yacht-listing")}
                  >
                    Search & Book Experiences
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-between"
                    onClick={() => setLocation("/profile")}
                  >
                    Profile Page
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    className="justify-between"
                    onClick={() => setLocation("/loyalty")}
                  >
                    Loyalty Page
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="fixed bottom-0 left-0 right-0 border-t bg-background/95 backdrop-blur">
        <nav className="container mx-auto px-4">
          <div className="flex justify-around py-2">
            <Button variant="ghost" onClick={() => setLocation("/")}>Home</Button>
            <Button variant="ghost" onClick={() => setLocation("/explore")}>Explore</Button>
            <Button variant="ghost" onClick={() => setLocation("/bookings")}>Bookings</Button>
            <Button variant="ghost" onClick={() => setLocation("/profile")}>Profile</Button>
          </div>
        </nav>
      </footer>
    </div>
  );
}

function BookingsSkeleton() {
  return (
    <div className="grid gap-4">
      {[1, 2].map((i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="space-y-2">
                <Skeleton className="h-4 w-[200px]" />
                <Skeleton className="h-4 w-[150px]" />
              </div>
              <Skeleton className="h-8 w-[100px]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecommendationsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {[1, 2, 3].map((i) => (
        <Card key={i}>
          <CardContent className="p-4 space-y-4">
            <Skeleton className="h-4 w-[150px]" />
            <Skeleton className="h-4 w-full" />
            <div className="flex justify-between items-center">
              <Skeleton className="h-4 w-[80px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-8 w-[200px] mb-8" />
      <div className="grid gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-[150px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[200px] w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}