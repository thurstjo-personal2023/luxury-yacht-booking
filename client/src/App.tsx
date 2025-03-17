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
import { AuthProvider } from "@/hooks/use-auth";

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
const FeaturedExperiences = lazy(() => import("@/pages/experiences/FeaturedExperiences"));
const RoleDebugPage = lazy(() => import("@/pages/debug/RoleDebugPage"));

// Partner Dashboard Pages
const PartnerProfile = lazy(() => import("@/pages/dashboard/partner/PartnerProfile"));
const PartnerAddOns = lazy(() => import("@/pages/dashboard/partner/AddOns"));
const AddOnForm = lazy(() => import("@/pages/dashboard/partner/AddOnForm"));

// Producer Dashboard Pages
const ProducerProfile = lazy(() => import("@/pages/dashboard/producer/ProducerProfile"));
const AssetManagement = lazy(() => import("@/pages/dashboard/producer/AssetManagement"));
const YachtForm = lazy(() => import("@/pages/dashboard/producer/YachtForm"));
const ComplianceDocuments = lazy(() => import("@/pages/dashboard/producer/ComplianceDocuments"));
const ReviewsManagement = lazy(() => import("@/pages/dashboard/producer/ReviewsManagement"));
const AvailabilityPricing = lazy(() => import("@/pages/dashboard/producer/AvailabilityPricing"));
const BookingsManagement = lazy(() => import("@/pages/dashboard/producer/BookingsManagement"));
const AdminUtils = lazy(() => import("@/pages/dashboard/producer/AdminUtils"));

// Admin Pages
const AdminDashboard = lazy(() => import("@/pages/admin"));
const EmailTest = lazy(() => import("@/pages/admin/EmailTest"));

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

    // Initialize Firestore collections - skip verification until user is authenticated
    initializeFirestore(true).catch(console.error);

    return cleanup;
  }, []);
  
  // Once a user is authenticated, validate Firestore collections
  useEffect(() => {
    if (user) {
      // Now that we have authentication, verify collections
      console.log("User authenticated, verifying Firestore collections");
      initializeFirestore(false).catch(console.error);
    }
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
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
              <Route path="/experiences" component={FeaturedExperiences} />
              
              {/* Booking Routes */}
              <Route path="/booking-summary">
                <PrivateRoute component={BookingSummary} />
              </Route>
              <Route path="/payment">
                <PrivateRoute component={PaymentPage} />
              </Route>

              {/* Protected Routes with Role Verification */}
              {/* 
                These routes are now protected by both:
                1. PrivateRoute - Ensures user is authenticated
                2. Internal role verification - Each dashboard component now verifies correct role
              */}
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
              
              {/* Partner Dashboard Routes */}
              <Route path="/dashboard/partner/profile">
                <PrivateRoute component={PartnerProfile} />
              </Route>
              <Route path="/dashboard/partner/add-ons">
                <PrivateRoute component={PartnerAddOns} />
              </Route>
              <Route path="/dashboard/partner/add-ons/create">
                <PrivateRoute component={AddOnForm} />
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
              
              {/* Admin Routes */}
              <Route path="/admin">
                <PrivateRoute component={AdminDashboard} />
              </Route>
              <Route path="/admin/email-test">
                <PrivateRoute component={EmailTest} />
              </Route>
              
              {/* Debug Tools */}
              <Route path="/debug/role">
                <PrivateRoute component={RoleDebugPage} />
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
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;