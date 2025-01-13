import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export interface YachtCardProps {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  location: string;
  capacity: number;
}

export default function YachtCard({
  id,
  name,
  description,
  price,
  imageUrl,
  location,
  capacity
}: YachtCardProps) {
  const [, setLocation] = useLocation();

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div
        className="h-48 bg-cover bg-center"
        style={{ backgroundImage: `url(${imageUrl})` }}
      />
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-bold">{name}</h3>
            <p className="text-sm text-muted-foreground">{location}</p>
          </div>
          <span className="text-lg font-bold">
            ${price.toLocaleString()}/day
          </span>
        </div>
      </CardHeader>
      <CardContent className="pb-2">
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
        <div className="mt-2 text-sm">
          <span className="text-muted-foreground">
            Capacity: {capacity} guests
          </span>
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          className="w-full"
          onClick={() => setLocation(`/yacht/${id}`)}
        >
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
}