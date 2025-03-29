import { useState, useEffect } from "react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart4, 
  Calendar, 
  DollarSign, 
  Package, 
  TrendingUp, 
  Users,
  ArrowUpRight,
  CircleCheck, 
  Clock, 
  AlertCircle,
  PieChart,
  LineChart
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PartnerSidebar } from "@/components/layout/PartnerSidebar";
import { 
  usePartnerEarnings, 
  usePartnerBookings, 
  usePartnerAddons,
  useServiceAnalytics
} from "@/hooks/partner/usePartnerQueries";
import { useAuthService } from "@/services/auth/use-auth-service";
import { PartnerAnalytics } from "@/components/partner/PartnerAnalytics";
import { useToast } from "@/hooks/use-toast";
import { PartnerBooking, BookingAddOn } from "@/types/partner";

export default function PartnerDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  const { user, profileData } = useAuthService();
  const userRole = profileData?.harmonizedUser?.role || 'partner';
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Role verification - ensure user has partner role
  useEffect(() => {
    if (user && userRole !== 'partner') {
      toast({
        title: "Access Restricted",
        description: "You don't have permission to access the partner dashboard.",
        variant: "destructive"
      });
      
      // Redirect to appropriate dashboard based on role
      if (userRole === 'consumer') {
        window.location.href = '/dashboard/consumer';
      } else if (userRole === 'producer') {
        window.location.href = '/dashboard/producer';
      } else {
        window.location.href = '/';
      }
    }
  }, [user, userRole, toast, setLocation]);
  
  const { data: earningsData, isLoading: earningsLoading } = usePartnerEarnings();
  const { data: bookings, isLoading: bookingsLoading } = usePartnerBookings();
  const { data: addons, isLoading: addonsLoading } = usePartnerAddons();
  
  const pendingBookings = bookings?.filter(booking => booking.status === 'pending') || [];
  const confirmedBookings = bookings?.filter(booking => booking.status === 'confirmed' || booking.status === 'completed') || [];
  
  const earningStats = earningsData || {
    total: 0,
    currentMonth: 0,
    previousMonth: 0,
    bookingsCount: 0,
    commissionRate: 0.8
  };
  
  // Calculate month-over-month growth
  const monthGrowth = earningStats.previousMonth === 0 
    ? 100 
    : ((earningStats.currentMonth - earningStats.previousMonth) / earningStats.previousMonth) * 100;
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Helper function to get addons from booking
  const getBookingAddons = (booking: PartnerBooking): BookingAddOn[] => {
    return booking.addOns || booking.partnerAddons || [];
  };

  return (
    <DashboardLayout>
      <div className="flex h-screen overflow-hidden">
        <aside className="hidden md:block w-64 border-r bg-background">
          <PartnerSidebar />
        </aside>
        <div className="flex-1 flex flex-col overflow-hidden">
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-3xl font-bold">Partner Dashboard</h1>
                  <p className="text-muted-foreground">
                    Manage your service add-ons and bookings
                  </p>
                </div>
                <Link href="/dashboard/partner/add-ons/create">
                  <Button>
                    <Package className="mr-2 h-4 w-4" />
                    Add New Service
                  </Button>
                </Link>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
                <TabsList className="grid w-full grid-cols-4 md:w-[580px]">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="bookings">Bookings</TabsTrigger>
                  <TabsTrigger value="earnings">Earnings</TabsTrigger>
                  <TabsTrigger value="analytics">
                    <LineChart className="h-4 w-4 mr-2" />
                    Analytics
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Total Earnings
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {earningsLoading ? (
                            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                          ) : (
                            formatCurrency(earningStats.total)
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Lifetime earnings from your add-ons
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          This Month
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {earningsLoading ? (
                            <div className="h-8 w-24 bg-muted animate-pulse rounded" />
                          ) : (
                            formatCurrency(earningStats.currentMonth)
                          )}
                        </div>
                        <div className="flex items-center text-xs mt-1">
                          {!earningsLoading && (
                            <>
                              {monthGrowth > 0 ? (
                                <Badge variant="outline" className="text-green-500 border-green-200 bg-green-50">
                                  <TrendingUp className="h-3 w-3 mr-1" />
                                  +{monthGrowth.toFixed(1)}%
                                </Badge>
                              ) : monthGrowth < 0 ? (
                                <Badge variant="outline" className="text-red-500 border-red-200 bg-red-50">
                                  <TrendingUp className="h-3 w-3 mr-1 rotate-180" />
                                  {monthGrowth.toFixed(1)}%
                                </Badge>
                              ) : (
                                <Badge variant="outline">
                                  No change
                                </Badge>
                              )}
                              <span className="ml-2 text-muted-foreground">vs last month</span>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Active Services
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {addonsLoading ? (
                            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                          ) : (
                            addons?.filter(addon => addon.availability !== false)?.length || 0
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Out of {addons?.length || 0} total services
                        </p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Booking Count
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">
                          {bookingsLoading ? (
                            <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                          ) : (
                            bookings?.length || 0
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {pendingBookings.length} pending, {confirmedBookings.length} confirmed
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  {/* Add-ons and Recent Bookings */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle>Your Add-ons</CardTitle>
                          <Link href="/dashboard/partner/add-ons">
                            <Button variant="ghost" size="sm" className="h-8">
                              View All
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {addonsLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-16 bg-muted animate-pulse rounded"
                              />
                            ))}
                          </div>
                        ) : addons?.length === 0 ? (
                          <div className="text-center py-6">
                            <Package className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <h3 className="mt-2 font-medium">No add-ons yet</h3>
                            <p className="text-sm text-muted-foreground">
                              Create your first service add-on to get started
                            </p>
                            <Link href="/dashboard/partner/add-ons/create">
                              <Button variant="outline" className="mt-4">
                                Create Add-on
                              </Button>
                            </Link>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {addons?.slice(0, 3).map((addon) => (
                              <div
                                key={addon.id}
                                className="p-4 border rounded-lg flex justify-between items-center"
                              >
                                <div className="flex items-center">
                                  {addon.media && addon.media[0] ? (
                                    <div className="w-10 h-10 rounded bg-muted mr-3 overflow-hidden">
                                      <img 
                                        src={addon.media[0].url} 
                                        alt={addon.name}
                                        className="w-full h-full object-cover"
                                      />
                                    </div>
                                  ) : (
                                    <div className="w-10 h-10 rounded bg-primary/10 mr-3 flex items-center justify-center">
                                      <Package className="h-5 w-5 text-primary" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">{addon.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                      {addon.category}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {formatCurrency(addon.pricing)}
                                  </p>
                                  <Badge 
                                    variant={addon.availability !== false ? "outline" : "secondary"}
                                    className={addon.availability !== false ? "bg-green-50 text-green-700 border-green-200" : ""}
                                  >
                                    {addon.availability !== false ? "Active" : "Inactive"}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {addons && addons.length > 3 && (
                              <div className="text-center">
                                <Link href="/dashboard/partner/add-ons">
                                  <Button variant="link">
                                    View all {addons.length} add-ons
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center">
                          <CardTitle>Recent Bookings</CardTitle>
                          <Link href="/dashboard/partner/bookings">
                            <Button variant="ghost" size="sm" className="h-8">
                              View All
                              <ArrowUpRight className="ml-1 h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {bookingsLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-16 bg-muted animate-pulse rounded"
                              />
                            ))}
                          </div>
                        ) : bookings?.length === 0 ? (
                          <div className="text-center py-6">
                            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <h3 className="mt-2 font-medium">No bookings yet</h3>
                            <p className="text-sm text-muted-foreground">
                              When customers book your services, they'll appear here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {bookings?.slice(0, 3).map((booking) => (
                              <div
                                key={booking.bookingId || booking.id}
                                className="p-4 border rounded-lg flex justify-between items-center"
                              >
                                <div>
                                  <p className="font-medium">{booking.yachtName}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium">
                                    {formatCurrency(
                                      getBookingAddons(booking).reduce((sum: number, addon: BookingAddOn) => sum + (addon.price || 0), 0) || 0
                                    )}
                                  </p>
                                  <Badge 
                                    variant={
                                      booking.status === 'confirmed' ? 'default' :
                                      booking.status === 'completed' ? 'outline' :
                                      booking.status === 'cancelled' ? 'destructive' : 'secondary'
                                    }
                                    className={
                                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                                      booking.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                                    }
                                  >
                                    {booking.status === 'confirmed' && <CircleCheck className="h-3 w-3 mr-1" />}
                                    {booking.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                    {booking.status === 'cancelled' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                            {bookings && bookings.length > 3 && (
                              <div className="text-center">
                                <Link href="/dashboard/partner/bookings">
                                  <Button variant="link">
                                    View all {bookings.length} bookings
                                  </Button>
                                </Link>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="bookings" className="space-y-6">
                  <div className="grid grid-cols-1 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Your Bookings</CardTitle>
                        <CardDescription>
                          View all bookings for your services
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {bookingsLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3, 4].map((i) => (
                              <div
                                key={i}
                                className="h-16 bg-muted animate-pulse rounded"
                              />
                            ))}
                          </div>
                        ) : bookings?.length === 0 ? (
                          <div className="text-center py-6">
                            <Calendar className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <h3 className="mt-2 font-medium">No bookings yet</h3>
                            <p className="text-sm text-muted-foreground">
                              When customers book your services, they'll appear here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {bookings?.map((booking) => (
                              <div
                                key={booking.bookingId || booking.id}
                                className="p-4 border rounded-lg space-y-4"
                              >
                                <div className="flex justify-between items-center">
                                  <div>
                                    <p className="font-medium text-lg">{booking.yachtName}</p>
                                    <p className="text-sm text-muted-foreground">
                                      Booked by {booking.customerName}
                                    </p>
                                  </div>
                                  <Badge 
                                    variant={
                                      booking.status === 'confirmed' ? 'default' :
                                      booking.status === 'completed' ? 'outline' :
                                      booking.status === 'cancelled' ? 'destructive' : 'secondary'
                                    }
                                    className={
                                      booking.status === 'confirmed' ? 'bg-green-100 text-green-800 hover:bg-green-100' : 
                                      booking.status === 'completed' ? 'bg-blue-50 text-blue-700 border-blue-200' : ''
                                    }
                                  >
                                    {booking.status === 'confirmed' && <CircleCheck className="h-3 w-3 mr-1" />}
                                    {booking.status === 'pending' && <Clock className="h-3 w-3 mr-1" />}
                                    {booking.status === 'cancelled' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                                  </Badge>
                                </div>
                                
                                <div className="flex justify-between items-center text-sm">
                                  <div>
                                    <p className="font-medium">Booking Period</p>
                                    <p className="text-muted-foreground">
                                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    <p className="font-medium">
                                      {formatCurrency(
                                        getBookingAddons(booking).reduce((sum: number, addon: BookingAddOn) => sum + (addon.price || 0), 0) || 0
                                      )}
                                    </p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="font-medium mb-2">Booked Services</p>
                                  {getBookingAddons(booking).map((addon: BookingAddOn, index: number) => (
                                    <div 
                                      key={addon.id || index} 
                                      className="flex justify-between py-2 border-b last:border-b-0"
                                    >
                                      <div>
                                        <p>{addon.name}</p>
                                        <p className="text-sm text-muted-foreground">{addon.category}</p>
                                      </div>
                                      <p className="font-medium">{formatCurrency(addon.price || 0)}</p>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="flex justify-end">
                                  <Link href={`/dashboard/partner/bookings/${booking.bookingId || booking.id}`}>
                                    <Button variant="outline" size="sm">
                                      View Details
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="earnings" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Earnings</CardTitle>
                        <CardDescription>
                          Your earnings from add-on services
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {earningsLoading ? (
                          <div className="space-y-4">
                            {[1, 2, 3].map((i) => (
                              <div
                                key={i}
                                className="h-16 bg-muted animate-pulse rounded"
                              />
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-8">
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Total Earnings</p>
                              <p className="text-3xl font-bold">{formatCurrency(earningStats.total)}</p>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">This Month</p>
                                <p className="text-xl font-semibold">{formatCurrency(earningStats.currentMonth)}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">Last Month</p>
                                <p className="text-xl font-semibold">{formatCurrency(earningStats.previousMonth)}</p>
                              </div>
                            </div>
                            
                            <div>
                              <p className="text-sm font-medium text-muted-foreground mb-2">Commission Rate</p>
                              <div className="flex items-center">
                                <p className="text-xl font-semibold">{(earningStats.commissionRate * 100).toFixed(0)}%</p>
                                <span className="ml-2 text-sm text-muted-foreground">of total booking value</span>
                              </div>
                            </div>
                            
                            {earningStats.recentPayouts && earningStats.recentPayouts.length > 0 && (
                              <div>
                                <p className="text-sm font-medium text-muted-foreground mb-2">Recent Payouts</p>
                                <div className="space-y-2">
                                  {earningStats.recentPayouts.map((payout, index) => (
                                    <div key={index} className="flex justify-between items-center p-2 border rounded-md">
                                      <p className="text-sm">{new Date(payout.date).toLocaleDateString()}</p>
                                      <p className="font-medium">{formatCurrency(payout.amount)}</p>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                    
                    <Card className="md:col-span-2">
                      <CardHeader>
                        <CardTitle>Add-on Usage</CardTitle>
                        <CardDescription>
                          Performance of your add-on services
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        {earningsLoading ? (
                          <div className="h-64 bg-muted animate-pulse rounded" />
                        ) : !earningStats.addOnUsage || earningStats.addOnUsage.length === 0 ? (
                          <div className="text-center py-6">
                            <BarChart4 className="h-12 w-12 mx-auto text-muted-foreground opacity-20" />
                            <h3 className="mt-2 font-medium">No usage data yet</h3>
                            <p className="text-sm text-muted-foreground">
                              As your add-ons get booked, usage statistics will appear here
                            </p>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {earningStats.addOnUsage.map((addon, index) => (
                              <div 
                                key={`${addon.addOnId}-${index}`} 
                                className="p-4 border rounded-lg"
                              >
                                <div className="flex justify-between items-center mb-2">
                                  <div>
                                    <p className="font-medium">{addon.name}</p>
                                    <p className="text-sm text-muted-foreground">{addon.category}</p>
                                  </div>
                                  <Badge variant="outline">
                                    {addon.bookingCount} {addon.bookingCount === 1 ? 'booking' : 'bookings'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4 mt-4">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                                    <p className="font-medium">{formatCurrency(addon.totalRevenue)}</p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Your Earnings</p>
                                    <p className="font-medium">{formatCurrency(addon.totalCommission)}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>
                
                <TabsContent value="analytics" className="space-y-6">
                  <PartnerAnalytics />
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </DashboardLayout>
  );
}