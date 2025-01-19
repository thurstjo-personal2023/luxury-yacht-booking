import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { EmulatorStatusWidget } from "@/components/ui/emulator-status";
import Home from "@/pages/home";
import RegisterPage from "@/pages/auth/register";
import LoginPage from "@/pages/auth/login";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import YachtListing from "@/pages/yacht-listing";
import YachtDetails from "@/pages/yacht-details";
import BookingSummary from "@/pages/booking-summary";
import Payment from "@/pages/payment";
import PaymentConfirmation from "@/pages/payment-confirmation";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { type ReactNode, useEffect } from "react";

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) return;

    // Set up session timeout
    const timeoutId = setTimeout(() => {
      logout();
      setLocation("/auth/login");
      toast({
        title: "Session expired",
        description: "Please log in again to continue.",
      });
    }, SESSION_TIMEOUT);

    // Reset timer on user activity
    const resetTimer = () => {
      clearTimeout(timeoutId);
      setTimeout(timeoutId);
    };

    window.addEventListener("mousemove", resetTimer);
    window.addEventListener("keypress", resetTimer);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("mousemove", resetTimer);
      window.removeEventListener("keypress", resetTimer);
    };
  }, [user, logout, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-border" />
      </div>
    );
  }

  if (!user) {
    setLocation("/auth/login");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/login" component={LoginPage} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/yacht-listing">
        {() => (
          <PrivateRoute>
            <YachtListing />
          </PrivateRoute>
        )}
      </Route>
      <Route path="/yacht/:id">
        {(params) => (
          <PrivateRoute>
            <YachtDetails id={params.id} />
          </PrivateRoute>
        )}
      </Route>
      <Route path="/booking-summary">
        {() => (
          <PrivateRoute>
            <BookingSummary />
          </PrivateRoute>
        )}
      </Route>
      <Route path="/payment">
        {() => (
          <PrivateRoute>
            <Payment />
          </PrivateRoute>
        )}
      </Route>
      <Route path="/payment-confirmation">
        {() => (
          <PrivateRoute>
            <PaymentConfirmation />
          </PrivateRoute>
        )}
      </Route>
      <Route path="/dashboard">
        {() => (
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        )}
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <main>
          <Router />
        </main>
        {/* Add EmulatorStatusWidget when in development */}
        {import.meta.env.DEV && <EmulatorStatusWidget />}
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;