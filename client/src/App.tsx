import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { auth } from "@/lib/firebase";
import { useAuthState } from "react-firebase-hooks/auth";
import { Suspense, lazy, useEffect } from "react";
import { initializeFirestore } from "./lib/firestore-init";
import { initializeConnectionManager } from "./lib/connection-manager";

// Lazy load pages
const NotFound = lazy(() => import("@/pages/not-found"));
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Register = lazy(() => import("@/pages/auth/Register"));
const ConsumerDashboard = lazy(() => import("@/pages/dashboard/Consumer"));
const ProducerDashboard = lazy(() => import("@/pages/dashboard/Producer"));
const PartnerDashboard = lazy(() => import("@/pages/dashboard/Partner"));
const YachtDetails = lazy(() => import("@/pages/YachtDetails"));
const BookingSummary = lazy(() => import("@/pages/BookingSummary"));
const PaymentPage = lazy(() => import("@/pages/PaymentPage"));
const SearchAndBook = lazy(() => import("@/pages/explore/SearchAndBook"));
const GuestDashboard = lazy(() => import("@/pages/explore/GuestDashboard"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));

// Producer Dashboard Pages
const ProducerProfile = lazy(() => import("@/pages/dashboard/producer/ProducerProfile"));
const AssetManagement = lazy(() => import("@/pages/dashboard/producer/AssetManagement"));
const YachtForm = lazy(() => import("@/pages/dashboard/producer/YachtForm"));
const ComplianceDocuments = lazy(() => import("@/pages/dashboard/producer/ComplianceDocuments"));
const ReviewsManagement = lazy(() => import("@/pages/dashboard/producer/ReviewsManagement"));
const AvailabilityPricing = lazy(() => import("@/pages/dashboard/producer/AvailabilityPricing"));
const BookingsManagement = lazy(() => import("@/pages/dashboard/producer/BookingsManagement"));
const AdminUtils = lazy(() => import("@/pages/dashboard/producer/AdminUtils"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

function PrivateRoute({ component: Component, ...rest }: any) {
  const [user, loading] = useAuthState(auth);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    window.location.href = "/login";
    return null;
  }

  return <Component {...rest} />;
}

function App() {
  const [user] = useAuthState(auth);

  useEffect(() => {
    // Initialize connection manager
    const cleanup = initializeConnectionManager();

    // Initialize Firestore collections
    initializeFirestore().catch(console.error);

    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <main className="flex-1">
          <Suspense fallback={<LoadingSpinner />}>
            <Switch>
              <Route path="/" component={Home} />
              <Route path="/login" component={Login} />
              <Route path="/register" component={Register} />
              <Route path="/yacht/:id" component={YachtDetails} />
              
              {/* Guest Experience Routes */}
              <Route path="/explore" component={GuestDashboard} />
              <Route path="/explore/search" component={SearchAndBook} />
              
              {/* Booking Routes */}
              <Route path="/booking-summary">
                <PrivateRoute component={BookingSummary} />
              </Route>
              <Route path="/payment">
                <PrivateRoute component={PaymentPage} />
              </Route>

              {/* Protected Routes */}
              <Route path="/dashboard/consumer">
                <PrivateRoute component={ConsumerDashboard} />
              </Route>
              <Route path="/dashboard/producer">
                <PrivateRoute component={ProducerDashboard} />
              </Route>
              <Route path="/dashboard/partner">
                <PrivateRoute component={PartnerDashboard} />
              </Route>
              <Route path="/profile">
                <PrivateRoute component={ProfilePage} />
              </Route>
              
              {/* Producer Dashboard Routes */}
              <Route path="/dashboard/producer/profile">
                <PrivateRoute component={ProducerProfile} />
              </Route>
              <Route path="/dashboard/producer/assets">
                <PrivateRoute component={AssetManagement} />
              </Route>
              <Route path="/dashboard/producer/assets/new-yacht">
                <PrivateRoute component={YachtForm} />
              </Route>
              <Route path="/dashboard/producer/assets/edit-yacht/:id">
                <PrivateRoute component={YachtForm} />
              </Route>
              <Route path="/dashboard/producer/compliance">
                <PrivateRoute component={ComplianceDocuments} />
              </Route>
              <Route path="/dashboard/producer/reviews">
                <PrivateRoute component={ReviewsManagement} />
              </Route>
              <Route path="/dashboard/producer/availability">
                <PrivateRoute component={AvailabilityPricing} />
              </Route>
              <Route path="/dashboard/producer/bookings">
                <PrivateRoute component={BookingsManagement} />
              </Route>
              <Route path="/dashboard/producer/admin">
                <PrivateRoute component={AdminUtils} />
              </Route>

              {/* Fallback to 404 */}
              <Route component={NotFound} />
            </Switch>
          </Suspense>
        </main>
        <Footer />
        <ConnectionStatus />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;