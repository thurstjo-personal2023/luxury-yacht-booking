import { useLocation } from "wouter";
import { HomeIcon, SearchIcon, CalendarIcon, UserIcon } from "lucide-react";

const navItems = [
  { icon: HomeIcon, label: "Home", path: "/" },
  { icon: SearchIcon, label: "Explore", path: "/yacht-listing" },
  { icon: CalendarIcon, label: "Bookings", path: "/bookings" },
  { icon: UserIcon, label: "Profile", path: "/dashboard" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border h-16 px-4">
      <div className="h-full max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center w-16 h-full ${
              location === path
                ? "text-primary"
                : "text-muted-foreground"
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
