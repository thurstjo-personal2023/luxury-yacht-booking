import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import RegisterPage from "@/pages/auth/register";
import LoginPage from "@/pages/auth/login";
import Dashboard from "@/pages/dashboard";
import YachtListing from "@/pages/yacht-listing";
import YachtDetails from "@/pages/yacht-details";
import BookingSummary from "@/pages/booking-summary";
import Payment from "@/pages/payment";
import PaymentConfirmation from "@/pages/payment-confirmation";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/lib/auth";
import { Loader2 } from "lucide-react";
import { type ReactNode } from "react";

function PrivateRoute({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

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
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;