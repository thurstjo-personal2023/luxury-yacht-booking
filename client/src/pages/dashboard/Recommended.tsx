import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import type { YachtExperience } from "@shared/firestore-schema";

export function Recommended() {
  const [recommendedPackages, setRecommendedPackages] = useState<YachtExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchRecommendedPackages = async () => {
      try {
        console.log("Starting to fetch recommended packages...");
        console.log("Firestore instance:", db); // Log the Firestore instance

        const experiencesRef = collection(db, "unified_yacht_experiences");
        console.log("Collection reference (unified):", experiencesRef);

        const snapshot = await getDocs(experiencesRef);
        console.log("Query snapshot:", snapshot);
        console.log("Is snapshot empty?", snapshot.empty);
        console.log("Number of documents:", snapshot.size);

        if (snapshot.empty) {
          console.log("No experience packages found");
          setRecommendedPackages([]);
          return;
        }

        const allPackages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as YachtExperience[];

        console.log("All fetched packages:", allPackages);

        const recommended = allPackages
          .filter(pkg => {
            const hasHighRating = pkg.reviews?.some(review => review.rating >= 4.5);
            const isRecommended = pkg.featured || hasHighRating;
            console.log(`Package ${pkg.id} recommended:`, isRecommended, {
              featured: pkg.featured,
              hasHighRating
            });
            return isRecommended;
          })
          .slice(0, 6);

        console.log("Final recommended packages:", recommended);
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