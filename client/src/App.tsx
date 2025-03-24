import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ConnectionStatus } from "@/components/ui/connection-status";
import { Suspense, lazy, useEffect } from "react";
import { initializeFirestore } from "./lib/firestore-init";
import { initializeConnectionManager } from "./lib/connection-manager";
import { AdminAuthProvider } from "@/components/admin/AdminAuthProvider";
import { AuthProvider } from '@/providers/auth-provider';
import { PrivateRoute } from '@/components/routing/PrivateRoute';

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
const MediaManagement = lazy(() => import("@/pages/admin/MediaManagement"));
const ProfilePage = lazy(() => import("@/pages/profile/ProfilePage"));
const FeaturedExperiences = lazy(() => import("@/pages/experiences/FeaturedExperiences"));
const RoleDebugPage = lazy(() => import("@/pages/debug/RoleDebugPage"));
const TestBundling = lazy(() => import("@/pages/test-bundling"));

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
const ImageValidator = lazy(() => import("@/pages/admin/ImageValidator"));
const MediaAdmin = lazy(() => import("@/pages/admin/MediaAdmin"));
const MediaValidation = lazy(() => import("@/pages/admin/MediaValidation"));
const PubSubValidation = lazy(() => import("@/pages/admin/PubSubValidation"));

// Secure Admin Portal
const SecureAdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminLogin = lazy(() => import("@/pages/admin/AdminLogin"));
const AdminMfaSetup = lazy(() => import("@/pages/admin/MfaSetup"));
const AdminMfaVerify = lazy(() => import("@/pages/admin/MfaVerify"));

// Loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
  </div>
);

/* 
 * Using the standardized PrivateRoute component from imports above 
 * This follows clean architecture principles with centralized auth management
 */

function App() {
  // Initialize connection and base Firestore setup only once at startup
  useEffect(() => {
    // Initialize connection manager
    const cleanup = initializeConnectionManager();

    // Initialize Firestore with skipVerification=true
    // Verification will be done later when a user is authenticated
    initializeFirestore(true).catch(console.error);

    console.log("[DEBUG-AUTH] App.tsx: Initial setup complete, using consolidated auth providers");
    
    return cleanup;
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      {/* AuthProvider should wrap the AdminAuthProvider */}
      <AuthProvider>
        {/* AdminAuthProvider for admin-specific authentication */}
        <AdminAuthProvider sessionTimeout={15 * 60}>
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
                    <PrivateRoute>
                      <BookingSummary />
                    </PrivateRoute>
                  </Route>
                  <Route path="/payment">
                    <PrivateRoute>
                      <PaymentPage />
                    </PrivateRoute>
                  </Route>

                  {/* Protected Routes with Role Verification */}
                  <Route path="/dashboard/consumer">
                    <PrivateRoute routeType="consumer">
                      <ConsumerDashboard />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer">
                    <PrivateRoute routeType="producer">
                      <ProducerDashboard />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/partner">
                    <PrivateRoute routeType="partner">
                      <PartnerDashboard />
                    </PrivateRoute>
                  </Route>
                  <Route path="/profile">
                    <PrivateRoute>
                      <ProfilePage />
                    </PrivateRoute>
                  </Route>
                    
                  {/* Partner Dashboard Routes */}
                  <Route path="/dashboard/partner/profile">
                    <PrivateRoute routeType="partner">
                      <PartnerProfile />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/partner/add-ons">
                    <PrivateRoute routeType="partner">
                      <PartnerAddOns />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/partner/add-ons/create">
                    <PrivateRoute routeType="partner">
                      <AddOnForm />
                    </PrivateRoute>
                  </Route>
                    
                  {/* Producer Dashboard Routes */}
                  <Route path="/dashboard/producer/profile">
                    <PrivateRoute routeType="producer">
                      <ProducerProfile />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/assets">
                    <PrivateRoute routeType="producer">
                      <AssetManagement />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/assets/new-yacht">
                    <PrivateRoute routeType="producer">
                      <YachtForm />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/assets/edit-yacht/:id">
                    <PrivateRoute routeType="producer">
                      <YachtForm />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/compliance">
                    <PrivateRoute routeType="producer">
                      <ComplianceDocuments />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/reviews">
                    <PrivateRoute routeType="producer">
                      <ReviewsManagement />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/availability">
                    <PrivateRoute routeType="producer">
                      <AvailabilityPricing />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/bookings">
                    <PrivateRoute routeType="producer">
                      <BookingsManagement />
                    </PrivateRoute>
                  </Route>
                  <Route path="/dashboard/producer/admin">
                    <PrivateRoute routeType="producer">
                      <AdminUtils />
                    </PrivateRoute>
                  </Route>
                    
                  {/* Admin Routes */}
                  <Route path="/admin">
                    <PrivateRoute routeType="admin">
                      <AdminDashboard />
                    </PrivateRoute>
                  </Route>
                  <Route path="/admin/email-test">
                    <PrivateRoute routeType="admin">
                      <EmailTest />
                    </PrivateRoute>
                  </Route>
                  <Route path="/admin/image-validator">
                    <PrivateRoute routeType="admin">
                      <ImageValidator />
                    </PrivateRoute>
                  </Route>
                  <Route path="/admin/media">
                    <PrivateRoute routeType="admin">
                      <MediaManagement />
                    </PrivateRoute>
                  </Route>
                  <Route path="/admin/media-validation">
                    <PrivateRoute routeType="admin">
                      <MediaValidation />
                    </PrivateRoute>
                  </Route>
                  <Route path="/admin/pubsub-validation">
                    <PrivateRoute routeType="admin">
                      <PubSubValidation />
                    </PrivateRoute>
                  </Route>
                    
                  {/* Secure Admin Portal Routes */}
                  <Route path="/admin-login" component={AdminLogin} />
                  <Route path="/admin-mfa-setup" component={AdminMfaSetup} />
                  <Route path="/admin-mfa-verify" component={AdminMfaVerify} />
                  <Route path="/admin-dashboard" component={SecureAdminDashboard} />
                    
                  {/* Debug Tools */}
                  <Route path="/debug/role">
                    <PrivateRoute>
                      <RoleDebugPage />
                    </PrivateRoute>
                  </Route>
                    
                  {/* Test Pages */}
                  <Route path="/test/bundling" component={TestBundling} />

                  {/* Fallback to 404 */}
                  <Route component={NotFound} />
                </Switch>
              </Suspense>
            </main>
            <Footer />
            <ConnectionStatus />
          </div>
          <Toaster />
        </AdminAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;