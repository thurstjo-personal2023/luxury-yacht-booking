import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where, orderBy, limit } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export function Recommended() {
  const [recommendedPackages, setRecommendedPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendedPackages = async () => {
      try {
        console.log("Fetching recommended packages...");

        // Get all packages
        const snapshot = await getDocs(collection(db, "yacht_experiences"));

        if (snapshot.empty) {
          console.log("No yacht experiences found");
          setRecommendedPackages([]);
          return;
        }

        const allPackages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log("All fetched packages:", allPackages);

        // Filter for featured or highly rated packages
        const recommended = allPackages
          .filter(pkg => {
            // Check for high ratings or featured flag
            const isHighlyRated = pkg.reviews?.some((review: any) => review.rating >= 4.5);
            const isFeatured = pkg.featured === true;
            return isHighlyRated || isFeatured;
          })
          .slice(0, 6); // Limit to 6 recommendations

        console.log("Filtered recommended packages:", recommended);
        setRecommendedPackages(recommended);
      } catch (error) {
        console.error("Error fetching recommended packages:", error);
        toast({
          title: "Error",
          description: "Failed to load recommended experiences",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendedPackages();
  }, [toast]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-[250px]" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-[200px] mb-2" />
              <Skeleton className="h-4 w-[150px]" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {recommendedPackages.length > 0 ? (
          recommendedPackages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader>
                <CardTitle>{pkg.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                <p className="text-sm">Location: {pkg.location?.address}</p>
                <p className="text-sm">Price: ${pkg.pricing}</p>
                {pkg.reviews && pkg.reviews.length > 0 && (
                  <p className="text-sm mt-2">
                    Rating: {pkg.reviews[0].rating} ⭐
                  </p>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center">
            <p className="text-muted-foreground">No recommended experiences available at this time.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Recommended;