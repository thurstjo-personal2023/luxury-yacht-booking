import { useLocation } from "wouter";
import { PackageIcon, ShoppingCartIcon, TagIcon, CalendarIcon } from "lucide-react";

const navItems = [
  { icon: PackageIcon, label: "Featured", path: "/featured" },
  { icon: ShoppingCartIcon, label: "Products", path: "/products" },
  { icon: TagIcon, label: "Promotions", path: "/promotions" },
  { icon: CalendarIcon, label: "Events", path: "/events" },
];

export default function BottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border h-16 px-4 z-50">
      <div className="h-full max-w-lg mx-auto flex items-center justify-around">
        {navItems.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex flex-col items-center justify-center w-20 h-full ${
              location === path
                ? "text-primary"
                : "text-muted-foreground hover:text-primary/80"
            }`}
          >
            <Icon className="h-5 w-5 mb-1" />
            <span className="text-xs font-medium">{label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}