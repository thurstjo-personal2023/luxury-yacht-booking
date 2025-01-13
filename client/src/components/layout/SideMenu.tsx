import { useState } from "react";
import { useLocation } from "wouter";
import { 
  BellIcon, 
  StarIcon, 
  SettingsIcon,
  LogOutIcon,
  MenuIcon,
  XIcon
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { signOut } from "@/lib/auth";

const menuItems = [
  { icon: BellIcon, label: "Notifications", path: "/notifications" },
  { icon: StarIcon, label: "Loyalty Program", path: "/loyalty" },
  { icon: SettingsIcon, label: "Settings", path: "/settings" },
];

export default function SideMenu() {
  const [open, setOpen] = useState(false);
  const [location, navigate] = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50"
        >
          <MenuIcon className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[300px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4"
            onClick={() => setOpen(false)}
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </SheetHeader>
        
        <div className="mt-8 flex flex-col gap-4">
          {menuItems.map(({ icon: Icon, label, path }) => (
            <Button
              key={path}
              variant="ghost"
              className={`w-full justify-start gap-3 ${
                location === path ? "bg-accent" : ""
              }`}
              onClick={() => handleNavigate(path)}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Button>
          ))}
          
          <Separator className="my-4" />
          
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-destructive"
            onClick={handleSignOut}
          >
            <LogOutIcon className="h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
