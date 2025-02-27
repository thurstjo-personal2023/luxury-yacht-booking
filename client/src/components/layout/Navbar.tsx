import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      // Add toast notification
      toast({
        title: "Logged out successfully",
        duration: 2000,
      });
      // Redirect to login page after successful logout
      setLocation("/login");
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Error logging out",
        variant: "destructive",
        duration: 2000,
      });
    }
  };

  return (
    <nav className="border-b h-16 flex items-center px-4 sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between w-full">
        <Link href="/" className="flex items-center">
          <img 
            src="/Etoile_Yachts_v1_2.png" 
            alt="Etoile Yachts Logo" 
            className="h-12 w-auto"
          />
        </Link>

        {/* Mobile menu */}
        <Sheet>
          <SheetTrigger asChild className="lg:hidden">
            <Button variant="ghost" size="icon">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="p-0">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Desktop menu */}
        <div className="hidden lg:flex items-center gap-4">
          {auth.currentUser ? (
            <>
              <Button variant="ghost" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button>Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}