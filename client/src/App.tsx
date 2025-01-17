import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { EmulatorStatusWidget } from "@/components/ui/emulator-status";
import Home from "@/pages/home";
import RegisterPage from "@/pages/auth/register";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/lib/auth";
import React, { useEffect } from 'react';

function PrivateRoute({ component: Component, ...rest }: { component: React.ComponentType<any> }) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!user) {
      setLocation("/auth/login");
    }
  }, [user, setLocation]);

  return user ? <Component {...rest} /> : null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth/register" component={RegisterPage} />
      <Route path="/dashboard">
        {(params) => <PrivateRoute component={Dashboard} />}
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