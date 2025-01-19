import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function PartnerDashboard() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'partner')) {
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
          <h1 className="text-2xl font-bold">Partner Dashboard</h1>
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
              <CardTitle>Welcome back, {user?.displayName || 'Partner'}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                View service requests, track earnings, and manage approvals.
              </p>
            </CardContent>
          </Card>

          {/* Service Requests */}
          <Card>
            <CardHeader>
              <CardTitle>Service Requests</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No pending requests</p>
              <Button 
                className="w-full mt-4"
                onClick={() => setLocation('/requests')}
              >
                View All Requests
              </Button>
            </CardContent>
          </Card>

          {/* Partner Earnings */}
          <Card>
            <CardHeader>
              <CardTitle>Partner Earnings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">AED 0.00</div>
              <p className="text-muted-foreground">Total earnings</p>
            </CardContent>
          </Card>

          {/* Pending Approvals */}
          <Card>
            <CardHeader>
              <CardTitle>Pending Approvals</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">No pending approvals</p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
