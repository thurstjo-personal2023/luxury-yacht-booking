import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import BottomNav from "@/components/layout/BottomNav";
import SideMenu from "@/components/layout/SideMenu";
import Home from "@/pages/home";
import Auth from "@/pages/auth";
import Dashboard from "@/pages/dashboard";
import YachtListing from "@/pages/yacht-listing";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/yacht-listing" component={YachtListing} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-background">
        <SideMenu />
        <main className="pb-16">
          <Router />
        </main>
        <BottomNav />
      </div>
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;