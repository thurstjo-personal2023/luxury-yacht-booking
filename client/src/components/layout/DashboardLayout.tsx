import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";
import { 
  Home, 
  Search, 
  BookOpen, 
  User, 
  Bell, 
  Gift, 
  Settings, 
  HelpCircle, 
  Tag,
  Menu
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const [, setLocation] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setLocation("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const sideMenuItems = [
    {
      title: "Notifications",
      icon: Bell,
      items: ["All Notifications", "Booking Updates", "Promotions and Offers", "Events"],
      href: "/dashboard/notifications"
    },
    {
      title: "Loyalty Program",
      icon: Gift,
      items: ["Points and Badges", "Ongoing Challenges", "Rewards Available", "Redeem Points"],
      href: "/dashboard/loyalty"
    },
    {
      title: "Settings",
      icon: Settings,
      items: ["Account Settings", "Notification Preferences", "Communication Preferences", "Privacy Settings", "Payment Information"],
      href: "/dashboard/settings"
    },
    {
      title: "Support",
      icon: HelpCircle,
      items: ["Help Center", "Submit Request", "Track Tickets"],
      href: "/dashboard/support"
    },
    {
      title: "Promotions",
      icon: Tag,
      items: ["Active Promotions", "Details and Terms", "Redeem Offer", "Share Options"],
      href: "/dashboard/promotions"
    }
  ];

  const bottomNavItems = [
    { icon: Home, label: "Home", href: "/dashboard/consumer?tab=explore" },
    { icon: Search, label: "Explore", href: "/dashboard/consumer?tab=explore" },
    { icon: BookOpen, label: "Bookings", href: "/dashboard/consumer?tab=bookings" },
    { icon: User, label: "Profile", href: "/dashboard/consumer?tab=profile" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <ScrollArea className="h-full">
                  <div className="space-y-6 py-4">
                    {sideMenuItems.map((section) => (
                      <div key={section.title} className="px-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <section.icon className="h-5 w-5" />
                          <h2 className="font-semibold">{section.title}</h2>
                        </div>
                        <div className="space-y-1 pl-7">
                          {section.items.map((item) => (
                            <Link
                              key={item}
                              href={section.href}
                              className="block py-2 text-sm text-muted-foreground hover:text-foreground"
                            >
                              {item}
                            </Link>
                          ))}
                        </div>
                      </div>
                    ))}
                    <div className="px-3 pt-4">
                      <Button 
                        variant="ghost" 
                        onClick={handleLogout}
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                      >
                        Logout
                      </Button>
                    </div>
                  </div>
                </ScrollArea>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-16">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 border-t bg-background">
        <div className="container mx-auto px-4">
          <div className="flex justify-around py-2">
            {bottomNavItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <Button
                  variant="ghost"
                  className="flex flex-col items-center gap-1 h-auto py-2"
                >
                  <item.icon className="h-5 w-5" />
                  <span className="text-xs">{item.label}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>
      </nav>
    </div>
  );
}