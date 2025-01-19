import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ConsumerDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'consumer')) {
      setLocation('/auth');
    }
  }, [user, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-background/95 backdrop-blur sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Consumer Dashboard</h1>
          <Button
            variant="ghost"
            onClick={() => setLocation('/auth/logout')}
          >
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Welcome Card */}
          <Card className="col-span-full">
            <CardHeader>
              <CardTitle>Welcome back, {user?.displayName || 'Guest'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Access your bookings, manage your profile, and explore new experiences.
              </p>
            </CardContent>
          </Card>

          {/* Upcoming Bookings */}
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Bookings</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No upcoming bookings</p>
              <Button 
                className="w-full mt-4"
                onClick={() => setLocation('/yachts')}
              >
                Book Now
              </Button>
            </CardContent>
          </Card>

          {/* Loyalty Points */}
          <Card>
            <CardHeader>
              <CardTitle>Loyalty Points</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">0</div>
              <p className="text-muted-foreground">Points earned</p>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended for You</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Personalized yacht recommendations coming soon
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
