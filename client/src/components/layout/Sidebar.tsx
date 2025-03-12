import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Home,
  Search,
  Calendar,
  User,
  Settings,
  Bell,
  Award,
  LogOut,
} from "lucide-react";
import { auth } from "@/lib/firebase";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { EmulatorStatusDialog } from "../ui/emulator-status-dialog";

export function Sidebar() {
  const [location, setLocation] = useLocation();

  const menuItems = [
    { icon: Home, label: "Home", href: "/" },
    { icon: Search, label: "Explore", href: "/explore" },
    { icon: Calendar, label: "Bookings", href: "/bookings" },
    { icon: User, label: "Profile", href: "/profile" },
    { icon: Bell, label: "Notifications", href: "/notifications" },
    { icon: Award, label: "Loyalty", href: "/loyalty" },
    { icon: Settings, label: "Settings", href: "/settings" },
  ];

  // Handle logout with redirection
  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Redirect to login page after successful logout
      setLocation("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <div className="flex h-full flex-col gap-2">
      <div className="flex h-16 items-center border-b px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          Etoile Yachts
        </Link>
      </div>
      <ScrollArea className="flex-1 px-4">
        <div className="space-y-2">
          {menuItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <Button
                variant={location === item.href ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2",
                  location === item.href && "bg-muted"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Button>
            </Link>
          ))}
          {auth.currentUser && (
            <Button
              variant="ghost"
              className="w-full justify-start gap-2"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          )}
        </div>
      </ScrollArea>
      
      {/* Footer with connection status */}
      <div className="p-4 border-t flex justify-center">
        <EmulatorStatusDialog />
      </div>
    </div>
  );
}