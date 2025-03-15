import React, { ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Home, 
  Mail, 
  Users, 
  Sailboat, 
  Package, 
  Settings, 
  Bell, 
  FileText, 
  LogOut 
} from 'lucide-react';
import { auth } from '@/lib/firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface NavItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  current: boolean;
}

function NavItem({ href, icon, label, current }: NavItemProps) {
  return (
    <Link href={href}>
      <Button 
        variant={current ? "secondary" : "ghost"} 
        className={`w-full justify-start mb-1 ${current ? 'bg-muted' : ''}`}
      >
        {icon}
        <span className="ml-2">{label}</span>
      </Button>
    </Link>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const [location] = useLocation();
  const [user] = useAuthState(auth);
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await auth.signOut();
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const navItems = [
    { href: '/admin', icon: <Home className="h-4 w-4" />, label: 'Dashboard' },
    { href: '/admin/users', icon: <Users className="h-4 w-4" />, label: 'User Management' },
    { href: '/admin/yachts', icon: <Sailboat className="h-4 w-4" />, label: 'Yacht Listings' },
    { href: '/admin/packages', icon: <Package className="h-4 w-4" />, label: 'Experience Packages' },
    { href: '/admin/notifications', icon: <Bell className="h-4 w-4" />, label: 'Notifications' },
    { href: '/admin/reports', icon: <FileText className="h-4 w-4" />, label: 'Reports' },
    { href: '/admin/email-test', icon: <Mail className="h-4 w-4" />, label: 'Email System' },
    { href: '/admin/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' },
  ];

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Admin Access Required</h1>
          <p className="mb-6">Please log in to access the admin panel.</p>
          <Link href="/login">
            <Button>Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 z-10">
        <div className="flex flex-col flex-grow pt-5 pb-4 overflow-y-auto border-r bg-card">
          <div className="flex items-center flex-shrink-0 px-4 mb-5">
            <h1 className="text-xl font-bold">Etoile Yachts Admin</h1>
          </div>
          
          {/* User info */}
          <div className="px-4 mb-6">
            <div className="flex items-center space-x-3">
              <Avatar>
                <AvatarImage src={user?.photoURL || ''} alt={user?.displayName || 'User'} />
                <AvatarFallback>{(user?.displayName || 'User').charAt(0)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{user?.displayName || user?.email}</p>
                <p className="text-xs text-muted-foreground">Administrator</p>
              </div>
            </div>
          </div>
          
          <Separator className="mb-6" />
          
          {/* Navigation */}
          <nav className="mt-2 flex-1 px-3 space-y-1">
            {navItems.map((item) => (
              <NavItem
                key={item.href}
                href={item.href}
                icon={item.icon}
                label={item.label}
                current={location === item.href}
              />
            ))}
          </nav>
          
          <div className="p-3">
            <Button variant="outline" className="w-full justify-start" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div className="md:pl-64 flex flex-col flex-1">
        <main className="flex-1 pb-8 pt-2">
          {children}
        </main>
      </div>
    </div>
  );
}