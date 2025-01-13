import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { auth, db } from "@/config/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { UserProfile } from "@/lib/auth";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLocation("/auth");
        return;
      }

      try {
        const userDoc = await getDocs(
          query(collection(db, "users"), where("uid", "==", user.uid))
        );

        if (!userDoc.empty) {
          setUserProfile(userDoc.docs[0].data() as UserProfile);
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [setLocation]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-8">Welcome, {userProfile?.displayName || 'User'}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {userProfile?.role === 'consumer' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <Button onClick={() => setLocation("/yacht-listing")}>
                  Browse Yachts
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Loyalty Points</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">0 points</p>
              </CardContent>
            </Card>
          </>
        )}

        {userProfile?.role === 'producer' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Your Listings</CardTitle>
              </CardHeader>
              <CardContent>
                <Button>Add New Yacht</Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Upcoming Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No upcoming bookings</p>
              </CardContent>
            </Card>
          </>
        )}

        {userProfile?.role === 'partner' && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Service Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No pending requests</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Partner Dashboard</CardTitle>
              </CardHeader>
              <CardContent>
                <Button>View Analytics</Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="container mx-auto p-4">
      <Skeleton className="h-12 w-64 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}