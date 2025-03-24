import { Switch, Route, useLocation } from "wouter";
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
import { useAuthService } from "@/services/auth";
import { PrivateRoute } from '@/components/routing/PrivateRoute';
import { auth } from "@/lib/firebase";

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
  const { user } = useAuthService();

  useEffect(() => {
    // Initialize connection manager
    const cleanup = initializeConnectionManager();

    // Initialize Firestore collections - skip verification until user is authenticated
    initializeFirestore(true).catch(console.error);

    return cleanup;
  }, []);
  
  // Once a user is authenticated, validate Firestore collections with a delay
  useEffect(() => {
    if (user) {
      console.log("[DEBUG-AUTH] App.tsx useEffect: User authenticated, delaying Firestore collections verification", 
        { userId: user.uid, email: user.email });
      
      // CRITICAL FIX: Delay verification to ensure auth state is stable
      const verificationTimer = setTimeout(() => {
        // Now start verification
        console.log("[DEBUG-AUTH] Starting delayed collection verification");
        
        // Store authentication state before verification
        const authStateBefore = { 
          isAuthenticated: !!user, 
          authTime: new Date().toISOString(),
          userId: user.uid
        };
        console.log("[DEBUG-AUTH] App.tsx: Auth state BEFORE collection verification:", authStateBefore);
        
        // Wrap the initialization with a try-catch for better error logging
        try {
          // Skip verification for now (can be re-enabled after testing)
          // Instead, just log completion without actually verifying collections
          console.log("[DEBUG-AUTH] App.tsx: Skipping actual verification to prevent auth state changes");
          
          // Simulate verification completion
          setTimeout(() => {
            // Check auth state after "verification" completes
            const currentUser = auth.currentUser;
            const authStateAfter = { 
              isAuthenticated: !!currentUser, 
              authTime: new Date().toISOString(),
              userId: currentUser?.uid || 'none'
            };
            console.log("[DEBUG-AUTH] App.tsx: Auth state AFTER skipped verification:", authStateAfter);
            
            // Log if a sign-out occurred
            if (authStateBefore.isAuthenticated && !authStateAfter.isAuthenticated) {
              console.error("[DEBUG-AUTH] App.tsx: CRITICAL - User was signed out during verification process!");
            }
          }, 500);
        } catch (error) {
          console.error("[DEBUG-AUTH] App.tsx: Exception during Firestore initialization setup:", error);
          
          // Check auth state after error
          const currentUser = auth.currentUser;
          console.log("[DEBUG-AUTH] App.tsx: Auth state after error:", { 
            isAuthenticated: !!currentUser,
            userId: currentUser?.uid || 'none'
          });
        }
      }, 3000); // 3-second delay to ensure auth state is stable
      
      return () => {
        clearTimeout(verificationTimer); // Clean up timer if component unmounts
      };
    }
  }, [user]);

  return (
    <QueryClientProvider client={queryClient}>
      {/* Keep AdminAuthProvider for admin authentication */}
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
                {/* 
                  These routes are now protected by both:
                  1. PrivateRoute - Ensures user is authenticated
                  2. Internal role verification - Each dashboard component now verifies correct role
                */}
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
    </QueryClientProvider>
  );
}

export default App;