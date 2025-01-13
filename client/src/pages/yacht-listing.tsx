import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import YachtCard from "@/components/yacht/YachtCard";
import { db } from "@/config/firebase";
import { collection, getDocs } from "firebase/firestore";
import { Skeleton } from "@/components/ui/skeleton";

const SAMPLE_YACHTS = [
  {
    id: "1",
    name: "Ocean Paradise",
    description: "Luxurious megayacht with helipad and infinity pool",
    price: 50000,
    imageUrl: "https://images.unsplash.com/photo-1469796466635-455ede028aca",
    location: "Monaco",
    capacity: 12
  },
  {
    id: "2",
    name: "Azure Dreams",
    description: "Modern yacht perfect for Mediterranean cruising",
    price: 35000,
    imageUrl: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd",
    location: "Saint-Tropez",
    capacity: 8
  },
  {
    id: "3",
    name: "Royal Voyager",
    description: "Classic luxury yacht with timeless elegance",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1549439602-43ebca2327af",
    location: "Cannes",
    capacity: 10
  }
];

export default function YachtListing() {
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState("all");
  const [location, setLocation] = useState("all");

  const { data: yachts, isLoading } = useQuery({
    queryKey: ['/api/yachts'],
    queryFn: async () => {
      // In production, this would fetch from Firestore
      // For MVP, using sample data
      return SAMPLE_YACHTS;
    }
  });

  const filteredYachts = yachts?.filter(yacht => {
    const matchesSearch = yacht.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         yacht.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrice = priceRange === "all" || 
                        (priceRange === "low" && yacht.price <= 30000) ||
                        (priceRange === "mid" && yacht.price > 30000 && yacht.price <= 50000) ||
                        (priceRange === "high" && yacht.price > 50000);
    const matchesLocation = location === "all" || yacht.location === location;

    return matchesSearch && matchesPrice && matchesLocation;
  });

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Available Yachts</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Input
          placeholder="Search yachts..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />

        <Select value={priceRange} onValueChange={setPriceRange}>
          <SelectTrigger>
            <SelectValue placeholder="Price Range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Prices</SelectItem>
            <SelectItem value="low">Up to $30,000/day</SelectItem>
            <SelectItem value="mid">$30,000 - $50,000/day</SelectItem>
            <SelectItem value="high">$50,000+/day</SelectItem>
          </SelectContent>
        </Select>

        <Select value={location} onValueChange={setLocation}>
          <SelectTrigger>
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            <SelectItem value="Monaco">Monaco</SelectItem>
            <SelectItem value="Saint-Tropez">Saint-Tropez</SelectItem>
            <SelectItem value="Cannes">Cannes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredYachts?.map((yacht) => (
          <YachtCard key={yacht.id} {...yacht} />
        ))}
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-12 w-64 mb-8" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
