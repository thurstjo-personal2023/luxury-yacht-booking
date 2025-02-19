import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Yacht, Booking } from "@shared/schema";

export default function ProducerDashboard() {
  const { data: yachts, isLoading: yachtsLoading } = useQuery<Yacht[]>({
    queryKey: ["/api/yachts/producer"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/producer"],
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Producer Dashboard</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Yachts</CardTitle>
          </CardHeader>
          <CardContent>
            {yachtsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded"
                  />
                ))}
              </div>
            ) : yachts?.length === 0 ? (
              <p className="text-muted-foreground">No yachts listed yet</p>
            ) : (
              <div className="space-y-4">
                {yachts?.map((yacht) => (
                  <div
                    key={yacht.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">{yacht.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Capacity: {yacht.capacity} people
                      </p>
                    </div>
                    <p className="font-medium">${yacht.price}/day</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded"
                  />
                ))}
              </div>
            ) : bookings?.length === 0 ? (
              <p className="text-muted-foreground">No bookings yet</p>
            ) : (
              <div className="space-y-4">
                {bookings?.map((booking) => (
                  <div
                    key={booking.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">
                        Booking #{booking.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(booking.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${booking.totalPrice}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {booking.status}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
