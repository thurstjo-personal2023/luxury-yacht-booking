import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { format, parseISO, isToday, isFuture, isPast } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { 
  AlertCircle, 
  ArrowLeft, 
  Calendar, 
  Check, 
  ChevronsUpDown, 
  Clock, 
  CreditCard, 
  DollarSign, 
  FileText, 
  Filter, 
  LifeBuoy, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Phone, 
  Search, 
  Ship, 
  Trash, 
  User, 
  X 
} from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  updateDoc, 
  Timestamp 
} from "firebase/firestore";
import { YachtExperience, ProducerBooking } from "@shared/firestore-schema";

// Booking status type for better type safety
type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show';
type PaymentStatus = 'pending' | 'partial' | 'complete' | 'refunded';
type CheckinStatus = 'pending' | 'checked_in' | 'no_show';

// Helper function to format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

export default function BookingsManagement() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatus | "all">("all");
  const [dateRangeFilter, setDateRangeFilter] = useState<"all" | "upcoming" | "past" | "today">("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [expandedBooking, setExpandedBooking] = useState<string | null>(null);
  const [bookings, setBookings] = useState<ProducerBooking[]>([]);
  const [yachts, setYachts] = useState<Record<string, YachtExperience>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<ProducerBooking | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  
  // Fetch producer's bookings and yachts
  useEffect(() => {
    const fetchBookingsAndYachts = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          setLocation("/login");
          return;
        }
        
        // First fetch all producer's yachts from unified collection
        const yachtsRef = collection(db, "unified_yacht_experiences");
        const yachtsQuery = query(yachtsRef, where("producerId", "==", user.uid));
        const yachtSnapshots = await getDocs(yachtsQuery);
        
        const yachtMap: Record<string, YachtExperience> = {};
        const yachtIds: string[] = [];
        
        yachtSnapshots.forEach(doc => {
          const yacht = doc.data() as YachtExperience;
          yachtMap[yacht.package_id] = yacht;
          yachtIds.push(yacht.package_id);
        });
        
        setYachts(yachtMap);
        
        // Then fetch bookings for all the producer's yachts
        const bookingsRef = collection(db, "bookings");
        const bookingsQuery = query(bookingsRef, where("packageId", "in", yachtIds.length > 0 ? yachtIds : ["none"]));
        const bookingSnapshots = await getDocs(bookingsQuery);
        
        const fetchedBookings: ProducerBooking[] = [];
        
        bookingSnapshots.forEach(doc => {
          const booking = doc.data() as ProducerBooking;
          fetchedBookings.push({
            ...booking,
            id: doc.id // Ensure we have the document ID for updates
          });
        });
        
        setBookings(fetchedBookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        toast({
          title: "Error",
          description: "Failed to load bookings. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchBookingsAndYachts();
  }, [setLocation, toast]);
  
  // Filter and sort bookings
  const filteredBookings = bookings.filter(booking => {
    // Status filter
    if (statusFilter !== "all" && booking.status !== statusFilter) {
      return false;
    }
    
    // Date range filter
    const bookingDate = new Date(booking.startDate);
    if (dateRangeFilter === "upcoming" && !isFuture(bookingDate)) {
      return false;
    } else if (dateRangeFilter === "past" && !isPast(bookingDate)) {
      return false;
    } else if (dateRangeFilter === "today" && !isToday(bookingDate)) {
      return false;
    }
    
    // Search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const customerName = booking.customerDetails?.name?.toLowerCase() || "";
      const yachtName = yachts[booking.packageId]?.title.toLowerCase() || "";
      const bookingId = booking.id.toLowerCase();
      
      return (
        customerName.includes(query) || 
        yachtName.includes(query) || 
        bookingId.includes(query)
      );
    }
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(a.startDate).getTime();
    const dateB = new Date(b.startDate).getTime();
    return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
  });
  
  // Calculate statistics
  const totalBookings = bookings.length;
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const pendingBookings = bookings.filter(b => b.status === 'pending').length;
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled').length;
  const completedBookings = bookings.filter(b => b.status === 'completed').length;
  
  const totalRevenue = bookings
    .filter(b => b.status !== 'cancelled' && b.paymentStatus !== 'refunded')
    .reduce((sum, booking) => sum + booking.netEarnings, 0);
  
  const pendingRevenue = bookings
    .filter(b => b.status !== 'cancelled' && b.paymentStatus === 'pending')
    .reduce((sum, booking) => sum + booking.netEarnings, 0);
  
  // Handle booking action updates
  const updateBookingStatus = async (bookingId: string, status: BookingStatus) => {
    setActionLoading(true);
    
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { 
        status,
        lastUpdatedDate: Timestamp.now()
      });
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, status, lastUpdatedDate: Timestamp.now() } 
          : booking
      ));
      
      // If cancelling, close the dialog
      if (status === 'cancelled') {
        setShowCancelDialog(false);
        setCancellationReason("");
      }
      
      toast({
        title: "Booking Updated",
        description: `Booking status updated to ${status}.`,
      });
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update booking status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Update check-in status
  const updateCheckinStatus = async (bookingId: string, checkinStatus: CheckinStatus) => {
    setActionLoading(true);
    
    try {
      const bookingRef = doc(db, "bookings", bookingId);
      await updateDoc(bookingRef, { 
        checkinStatus,
        lastUpdatedDate: Timestamp.now()
      });
      
      // Update local state
      setBookings(bookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, checkinStatus, lastUpdatedDate: Timestamp.now() } 
          : booking
      ));
      
      // If marked as no-show, also update booking status
      if (checkinStatus === 'no_show') {
        await updateDoc(bookingRef, { status: 'no_show' as BookingStatus });
        
        // Update local state
        setBookings(bookings.map(booking => 
          booking.id === bookingId 
            ? { ...booking, status: 'no_show', lastUpdatedDate: Timestamp.now() } 
            : booking
        ));
      }
      
      toast({
        title: "Check-in Updated",
        description: `Check-in status updated to ${checkinStatus}.`,
      });
    } catch (error) {
      console.error("Error updating check-in status:", error);
      toast({
        title: "Update Failed",
        description: "Failed to update check-in status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };
  
  // Handle cancellation with reason
  const handleCancelBooking = () => {
    if (!selectedBooking) return;
    
    setActionLoading(true);
    
    const updateCancellation = async () => {
      try {
        const bookingRef = doc(db, "bookings", selectedBooking.id);
        await updateDoc(bookingRef, { 
          status: 'cancelled',
          cancellationReason: cancellationReason,
          lastUpdatedDate: Timestamp.now()
        });
        
        // Update local state
        setBookings(bookings.map(booking => 
          booking.id === selectedBooking.id 
            ? { 
                ...booking, 
                status: 'cancelled', 
                cancellationReason,
                lastUpdatedDate: Timestamp.now() 
              } 
            : booking
        ));
        
        setShowCancelDialog(false);
        setCancellationReason("");
        
        toast({
          title: "Booking Cancelled",
          description: "The booking has been cancelled successfully.",
        });
      } catch (error) {
        console.error("Error cancelling booking:", error);
        toast({
          title: "Cancellation Failed",
          description: "Failed to cancel the booking. Please try again.",
          variant: "destructive",
        });
      } finally {
        setActionLoading(false);
      }
    };
    
    updateCancellation();
  };
  
  // Get booking status badge color
  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'confirmed':
        return <Badge>Confirmed</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Pending</Badge>;
      case 'completed':
        return <Badge className="bg-green-500">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Cancelled</Badge>;
      case 'no_show':
        return <Badge variant="outline" className="border-gray-200 text-gray-700 bg-gray-50">No Show</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Get payment status badge
  const getPaymentBadge = (status: PaymentStatus) => {
    switch (status) {
      case 'complete':
        return <Badge className="bg-green-500">Paid</Badge>;
      case 'partial':
        return <Badge variant="outline" className="border-blue-200 text-blue-700 bg-blue-50">Partial</Badge>;
      case 'pending':
        return <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50">Pending</Badge>;
      case 'refunded':
        return <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50">Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  // Navigation
  const goToDashboard = () => setLocation("/dashboard/producer");
  
  return (
    <DashboardLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            className="flex items-center gap-2 mb-4" 
            onClick={goToDashboard}
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl font-bold">Bookings Management</h1>
          <p className="text-muted-foreground">
            View and manage all your yacht bookings
          </p>
        </div>
        
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Total Bookings</p>
                <p className="text-2xl font-bold">{totalBookings}</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <FileText className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Confirmed</p>
                <p className="text-2xl font-bold">{confirmedBookings}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <Check className="h-5 w-5 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Total Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
              <div className="bg-primary/10 p-2 rounded-full">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 flex justify-between items-center">
              <div>
                <p className="text-muted-foreground text-sm">Pending Revenue</p>
                <p className="text-2xl font-bold">{formatCurrency(pendingRevenue)}</p>
              </div>
              <div className="bg-amber-100 p-2 rounded-full">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Bookings List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <CardTitle>Bookings</CardTitle>
                <CardDescription>
                  Manage your customer bookings and reservations
                </CardDescription>
              </div>
              
              {/* Filters */}
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <div className="relative flex-1 md:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search bookings..."
                    className="pl-8"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value as BookingStatus | "all")}
                >
                  <SelectTrigger className="w-auto md:w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                    <SelectItem value="no_show">No Show</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={dateRangeFilter}
                  onValueChange={(value) => setDateRangeFilter(value as "all" | "upcoming" | "past" | "today")}
                >
                  <SelectTrigger className="w-auto md:w-[180px]">
                    <SelectValue placeholder="Filter by date" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Dates</SelectItem>
                    <SelectItem value="upcoming">Upcoming</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="past">Past</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                  title={sortOrder === "asc" ? "Oldest first" : "Newest first"}
                >
                  <ChevronsUpDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
              <TabsList className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="pending">
                  Pending
                  {pendingBookings > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {pendingBookings}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="confirmed">Confirmed</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled/No-show</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardHeader>
          
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : filteredBookings.length === 0 ? (
              <div className="text-center py-10">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-2" />
                <h3 className="text-lg font-medium mb-1">No Bookings Found</h3>
                <p className="text-muted-foreground mb-6">
                  {bookings.length > 0 
                    ? "No bookings match your current filters."
                    : "You don't have any bookings yet."
                  }
                </p>
                {bookings.length > 0 && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setDateRangeFilter("all");
                    }}
                  >
                    Clear Filters
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredBookings.map(booking => {
                  const yacht = yachts[booking.packageId];
                  const isExpanded = expandedBooking === booking.id;
                  
                  return (
                    <div
                      key={booking.id}
                      className={`border rounded-lg overflow-hidden ${
                        booking.status === 'pending' ? 'border-amber-200' : 'border-gray-200'
                      }`}
                    >
                      {/* Booking Header */}
                      <div className="p-4 bg-muted/20 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 p-2 rounded-full">
                            <Ship className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{yacht?.title || "Unknown Yacht"}</p>
                              {getStatusBadge(booking.status)}
                            </div>
                            <div className="flex items-center text-sm text-muted-foreground gap-3">
                              <div className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {format(new Date(booking.startDate), "MMM d, yyyy")}
                              </div>
                              <div className="flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5" />
                                {format(new Date(booking.startDate), "h:mm a")}
                              </div>
                              <div>
                                ID: {booking.id.substring(0, 8)}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden md:block">
                            <p className="font-medium">{booking.customerDetails?.name || "Guest"}</p>
                            <div className="flex items-center text-sm text-muted-foreground">
                              {getPaymentBadge(booking.paymentStatus)}
                              <span className="ml-2">{formatCurrency(booking.totalPrice)}</span>
                            </div>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setExpandedBooking(isExpanded ? null : booking.id)}
                          >
                            {isExpanded ? "Less Details" : "More Details"}
                          </Button>
                        </div>
                      </div>
                      
                      {/* Mobile view of customer and price */}
                      <div className="p-4 border-b md:hidden">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">{booking.customerDetails?.name || "Guest"}</p>
                            <p className="text-sm text-muted-foreground">
                              Net Earnings: {formatCurrency(booking.netEarnings)}
                            </p>
                          </div>
                          <div>
                            {getPaymentBadge(booking.paymentStatus)}
                            <p className="font-medium mt-1">{formatCurrency(booking.totalPrice)}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {/* Customer Details */}
                            <div>
                              <h3 className="font-medium mb-3 flex items-center gap-2">
                                <User className="h-4 w-4 text-muted-foreground" />
                                Customer Details
                              </h3>
                              <div className="space-y-2">
                                <div className="flex gap-3 items-center">
                                  <Avatar className="h-10 w-10">
                                    <AvatarFallback>
                                      {booking.customerDetails?.name?.charAt(0) || "G"}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{booking.customerDetails?.name || "Guest"}</p>
                                    {booking.customerDetails?.contactInformation?.email && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Mail className="h-3 w-3" />
                                        {booking.customerDetails.contactInformation.email}
                                      </p>
                                    )}
                                    {booking.customerDetails?.contactInformation?.phone && (
                                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {booking.customerDetails.contactInformation.phone}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                
                                {booking.customerDetails?.specialRequests && (
                                  <div className="mt-3 p-3 bg-muted/30 rounded-md">
                                    <p className="text-sm font-medium mb-1">Special Requests:</p>
                                    <p className="text-sm">{booking.customerDetails.specialRequests}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Booking Details */}
                            <div>
                              <h3 className="font-medium mb-3 flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                Booking Details
                              </h3>
                              <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Start Date</p>
                                    <p className="font-medium">
                                      {format(new Date(booking.startDate), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Start Time</p>
                                    <p className="font-medium">
                                      {format(new Date(booking.startDate), "h:mm a")}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-sm text-muted-foreground">End Date</p>
                                    <p className="font-medium">
                                      {format(new Date(booking.endDate), "MMM d, yyyy")}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">End Time</p>
                                    <p className="font-medium">
                                      {format(new Date(booking.endDate), "h:mm a")}
                                    </p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">Location</p>
                                  <p className="font-medium flex items-center gap-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                                    {yacht?.location?.address || "Address not specified"}
                                  </p>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">Check-in Status</p>
                                  <div className="flex gap-2 mt-1">
                                    <Badge 
                                      variant={booking.checkinStatus === 'pending' ? 'outline' : (
                                        booking.checkinStatus === 'checked_in' ? 'default' : 'outline'
                                      )}
                                      className={booking.checkinStatus === 'no_show' ? 'bg-red-50 border-red-200 text-red-700' : ''}
                                    >
                                      {booking.checkinStatus === 'pending' 
                                        ? 'Not Checked In' 
                                        : booking.checkinStatus === 'checked_in'
                                          ? 'Checked In'
                                          : 'No Show'
                                      }
                                    </Badge>
                                    
                                    {/* Check-in action buttons for confirmed bookings */}
                                    {booking.status === 'confirmed' && (
                                      <>
                                        {booking.checkinStatus !== 'checked_in' && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-xs h-6"
                                            onClick={() => updateCheckinStatus(booking.id, 'checked_in')}
                                            disabled={actionLoading}
                                          >
                                            <Check className="h-3 w-3 mr-1" />
                                            Mark as Checked In
                                          </Button>
                                        )}
                                        
                                        {booking.checkinStatus !== 'no_show' && (
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            className="text-xs h-6 border-red-200 text-red-700 hover:bg-red-50"
                                            onClick={() => updateCheckinStatus(booking.id, 'no_show')}
                                            disabled={actionLoading}
                                          >
                                            <X className="h-3 w-3 mr-1" />
                                            Mark as No Show
                                          </Button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Payment Details */}
                            <div>
                              <h3 className="font-medium mb-3 flex items-center gap-2">
                                <CreditCard className="h-4 w-4 text-muted-foreground" />
                                Payment Details
                              </h3>
                              <div className="space-y-3">
                                <div>
                                  <p className="text-sm text-muted-foreground">Total Price</p>
                                  <p className="text-lg font-bold">{formatCurrency(booking.totalPrice)}</p>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <p className="text-sm text-muted-foreground">Commission</p>
                                    <p className="font-medium">
                                      {formatCurrency(booking.commissionAmount)}
                                    </p>
                                  </div>
                                  <div>
                                    <p className="text-sm text-muted-foreground">Net Earnings</p>
                                    <p className="font-medium text-green-600">
                                      {formatCurrency(booking.netEarnings)}
                                    </p>
                                  </div>
                                </div>
                                
                                <div>
                                  <p className="text-sm text-muted-foreground">Payment Status</p>
                                  <div className="mt-1">
                                    {getPaymentBadge(booking.paymentStatus)}
                                  </div>
                                </div>
                                
                                {booking.serviceProviderNotes && (
                                  <div className="mt-3 p-3 bg-muted/30 rounded-md">
                                    <p className="text-sm font-medium mb-1">Your Notes:</p>
                                    <p className="text-sm">{booking.serviceProviderNotes}</p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {/* Cancellation reason if cancelled */}
                          {booking.status === 'cancelled' && booking.cancellationReason && (
                            <Alert className="mt-4 bg-red-50 border-red-200">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              <AlertTitle>Cancellation Reason</AlertTitle>
                              <AlertDescription>
                                {booking.cancellationReason}
                              </AlertDescription>
                            </Alert>
                          )}
                          
                          {/* Action Buttons */}
                          <div className="flex justify-end gap-3 mt-6">
                            {/* Status update buttons based on current status */}
                            {booking.status === 'pending' && (
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                disabled={actionLoading}
                                className="flex items-center gap-1"
                              >
                                <Check className="h-4 w-4" />
                                Confirm Booking
                              </Button>
                            )}
                            
                            {booking.status === 'confirmed' && (
                              <Button
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                disabled={actionLoading}
                                className="flex items-center gap-1"
                              >
                                <Check className="h-4 w-4" />
                                Mark as Completed
                              </Button>
                            )}
                            
                            {/* Cancel booking button - only for pending/confirmed */}
                            {(booking.status === 'pending' || booking.status === 'confirmed') && (
                              <Button
                                variant="outline"
                                className="border-red-200 text-red-700 hover:bg-red-50"
                                disabled={actionLoading}
                                onClick={() => {
                                  setSelectedBooking(booking);
                                  setShowCancelDialog(true);
                                }}
                              >
                                <Trash className="h-4 w-4 mr-1" />
                                Cancel Booking
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between border-t p-6">
            <div className="text-sm text-muted-foreground">
              {filteredBookings.length > 0 && (
                <p>Showing {filteredBookings.length} of {bookings.length} bookings</p>
              )}
            </div>
            
            <div className="flex items-center gap-4">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Refresh Data
              </Button>
            </div>
          </CardFooter>
        </Card>
        
        {/* Cancellation Dialog */}
        <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Booking</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to cancel this booking? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            
            <div className="py-4">
              <Label htmlFor="cancellation-reason">Cancellation Reason</Label>
              <Textarea
                id="cancellation-reason"
                placeholder="Please provide a reason for cancellation..."
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="mt-2"
                rows={4}
              />
            </div>
            
            <AlertDialogFooter>
              <AlertDialogCancel disabled={actionLoading}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  handleCancelBooking();
                }}
                disabled={actionLoading || !cancellationReason.trim()}
                className="bg-red-500 hover:bg-red-600 focus:bg-red-600"
              >
                {actionLoading ? "Cancelling..." : "Confirm Cancellation"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DashboardLayout>
  );
}