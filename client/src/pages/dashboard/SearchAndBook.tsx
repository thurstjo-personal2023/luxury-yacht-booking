import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type { YachtExperience } from "@shared/firestore-schema";

export function SearchAndBook() {
  const [packages, setPackages] = useState<YachtExperience[]>([]);
  const [filters, setFilters] = useState({
    category: "",
    region: "",
    marina: "",
  });
  const { toast } = useToast();

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        console.log("Fetching all yacht experiences...");
        const querySnapshot = await getDocs(collection(db, "experience_packages"));
        // Updated type assertion with proper document ID handling
        const allPackages = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as YachtExperience[];

        console.log("Fetched packages:", allPackages);
        setPackages(allPackages);
      } catch (error) {
        console.error("Error fetching packages:", error);
        toast({
          title: "Error",
          description: "Failed to load yacht experiences",
          variant: "destructive",
        });
      }
    };

    fetchPackages();
  }, [toast]);

  const filteredPackages = packages.filter((pkg) => {
    console.log("Filtering package:", pkg, "with filters:", filters);

    const matchesCategory = !filters.category || 
      (filters.category === "yacht-cruise" && 
       pkg.tags?.some(tag => 
         ["yacht", "cruise", "luxury"].includes(tag.toLowerCase())
       ));

    const matchesRegion = !filters.region || 
      pkg.location?.address.toLowerCase().includes(filters.region.toLowerCase());

    const matchesMarina = !filters.marina || 
      pkg.location?.port_marina === filters.marina;

    const matches = matchesCategory && matchesRegion && matchesMarina;
    console.log("Package matches filters:", matches);
    return matches;
  });

  const handleFilterChange = (field: keyof typeof filters, value: string) => {
    console.log(`Updating ${field} filter to:`, value);
    setFilters(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Types</SelectItem>
            <SelectItem value="yacht-cruise">Yacht Cruise</SelectItem>
            <SelectItem value="water-sports">Water Sports</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.region}
          onValueChange={(value) => handleFilterChange("region", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select region" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Regions</SelectItem>
            <SelectItem value="dubai">Dubai</SelectItem>
            <SelectItem value="abu-dhabi">Abu Dhabi</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.marina}
          onValueChange={(value) => handleFilterChange("marina", value)}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select marina" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Marinas</SelectItem>
            <SelectItem value="Dubai Marina">Dubai Marina</SelectItem>
            <SelectItem value="Yas Marina">Yas Marina</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPackages.length > 0 ? (
          filteredPackages.map((pkg) => (
            <Card key={pkg.id}>
              <CardHeader>
                <CardTitle>{pkg.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-2">{pkg.description}</p>
                <p className="text-sm">Location: {pkg.location?.address}</p>
                <p className="text-sm">Price: ${pkg.pricing}</p>
                {pkg.tags && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {pkg.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-2 py-1 bg-primary/10 text-primary rounded-full text-xs"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center">
            <p className="text-muted-foreground">No experiences match your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchAndBook;