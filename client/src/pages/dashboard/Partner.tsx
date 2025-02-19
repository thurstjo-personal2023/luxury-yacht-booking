import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Booking } from "@shared/schema";

export default function PartnerDashboard() {
  const { data: serviceRequests, isLoading: requestsLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings/partner"],
  });

  // Calculate total earnings from completed bookings
  const totalEarnings = serviceRequests?.reduce((sum, booking) => {
    return booking.status === "completed" ? sum + (booking.totalPrice * 0.1) : sum;
  }, 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Partner Dashboard</h1>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Earnings Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              ${totalEarnings?.toFixed(2) || "0.00"}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Total commission earned (10% of completed bookings)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {requestsLoading ? (
              <div className="space-y-4">
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-16 bg-muted animate-pulse rounded"
                  />
                ))}
              </div>
            ) : serviceRequests?.length === 0 ? (
              <p className="text-muted-foreground">No service requests yet</p>
            ) : (
              <div className="space-y-4">
                {serviceRequests?.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 border rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="font-medium">
                        Request #{request.id}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(request.startDate).toLocaleDateString()} - 
                        {new Date(request.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        ${(request.totalPrice * 0.1).toFixed(2)}
                      </p>
                      <p className="text-sm capitalize text-muted-foreground">
                        {request.status}
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
