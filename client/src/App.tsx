import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { EmulatorStatusWidget } from "@/components/ui/emulator-status";
import Home from "@/pages/home";
import RegisterPage from "@/pages/auth/register";
import AuthPage from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import YachtListing from "@/pages/yacht-listing";
import YachtDetails from "@/pages/yacht-details";
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
    setLocation("/auth");
    return null;
  }

  return <>{children}</>;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={AuthPage} />
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