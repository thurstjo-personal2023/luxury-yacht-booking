import { useState, ReactNode } from 'react';
import { Link, useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Mail,
  Users,
  Settings,
  Server,
  Database,
  FileWarning,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';

interface AdminLayoutProps {
  children: ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const { user, signOut } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const navItems: NavItem[] = [
    {
      label: 'Dashboard',
      href: '/admin',
      icon: <LayoutDashboard className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Email System',
      href: '/admin/email',
      icon: <Mail className="mr-2 h-4 w-4" />,
    },
    {
      label: 'User Management',
      href: '/admin/users',
      icon: <Users className="mr-2 h-4 w-4" />,
    },
    {
      label: 'System Settings',
      href: '/admin/settings',
      icon: <Settings className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Server Status',
      href: '/admin/server',
      icon: <Server className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Database',
      href: '/admin/database',
      icon: <Database className="mr-2 h-4 w-4" />,
    },
    {
      label: 'Error Logs',
      href: '/admin/logs',
      icon: <FileWarning className="mr-2 h-4 w-4" />,
    },
  ];

  const closeSheet = () => {
    setOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top navbar */}
      <header className="bg-primary text-primary-foreground shadow-md py-4 px-6 flex justify-between items-center">
        <div className="flex items-center">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild className="md:hidden mr-4">
              <Button variant="ghost" size="icon" className="text-primary-foreground">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <div className="bg-primary text-primary-foreground p-6 flex items-center justify-between">
                <h2 className="text-xl font-bold">Admin Panel</h2>
                <Button variant="ghost" size="icon" onClick={closeSheet}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <nav className="flex flex-col p-4">
                {navItems.map((item) => (
                  <Link key={item.href} href={item.href}>
                    <a
                      className={`flex items-center px-4 py-3 rounded-md transition-colors mb-1 ${
                        location === item.href
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-muted'
                      }`}
                      onClick={closeSheet}
                    >
                      {item.icon}
                      {item.label}
                    </a>
                  </Link>
                ))}
                <Button
                  variant="ghost"
                  className="flex items-center justify-start px-4 py-3 rounded-md w-full hover:bg-muted mt-4"
                  onClick={() => {
                    signOut();
                    closeSheet();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
          <h1 className="text-xl font-bold">Admin Panel</h1>
        </div>
        <div className="flex items-center">
          {user && (
            <span className="mr-4 hidden md:inline-block">
              {user.email}
            </span>
          )}
          <Button
            variant="outline"
            className="text-primary-foreground border-primary-foreground hover:bg-primary-foreground/10"
            onClick={signOut}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1">
        {/* Sidebar (desktop only) */}
        <aside className="hidden md:block w-64 bg-muted/50 border-r shadow-sm">
          <nav className="flex flex-col p-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <a
                  className={`flex items-center px-4 py-3 rounded-md transition-colors mb-1 ${
                    location === item.href
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'hover:bg-muted'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </a>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main content */}
        <main className="flex-1 bg-background">
          {children}
        </main>
      </div>
    </div>
  );
}